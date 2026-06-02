// 生成「本地开发版」专用图标：对现有品牌图标做红色着色，使其在 chrome://extensions
// 列表与工具栏中与 Chrome 商店正式版一眼可辨。纯 Node 实现（仅依赖内置 zlib），
// 不引入任何图像处理依赖。一次性生成并提交到 asset/dev-icons/，dev 构建直接复用。
//
// 用法：node scripts/gen-dev-icons.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_DIR = resolve(ROOT, 'public/icons');
const OUT_DIR = resolve(ROOT, 'asset/dev-icons');
const SIZES = [16, 32, 48, 128];

// 着色目标：警示红（与品牌色拉开差异），混合强度 0.55。
const TINT = { r: 225, g: 29, b: 72, a: 0.55 };

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// --- CRC32（PNG chunk 校验） ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

// 解析 PNG，返回 { width, height, rgba(Buffer) }。仅支持 8-bit RGBA、非隔行（本项目图标即此格式）。
function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('非 PNG 文件');
  let off = 8;
  let width = 0, height = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8], colorType = data[9], interlace = data[12];
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error(`暂不支持的 PNG 格式（bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace}）`);
      }
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const rgba = Buffer.alloc(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const cur = raw[pos++];
      const a = x >= bpp ? rgba[y * stride + x - bpp] : 0;
      const b = y > 0 ? rgba[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? rgba[(y - 1) * stride + x - bpp] : 0;
      let val;
      switch (filter) {
        case 0: val = cur; break;
        case 1: val = cur + a; break;
        case 2: val = cur + b; break;
        case 3: val = cur + ((a + b) >> 1); break;
        case 4: val = cur + paeth(a, b, c); break;
        default: throw new Error(`未知 filter ${filter}`);
      }
      rgba[y * stride + x] = val & 0xff;
    }
  }
  return { width, height, rgba };
}

// 红色着色：对不透明像素按强度向警示红混合，透明像素保持透明（保留 logo 轮廓）。
function tintRed(rgba) {
  for (let i = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3];
    if (alpha === 0) continue;
    rgba[i] = Math.round(rgba[i] * (1 - TINT.a) + TINT.r * TINT.a);
    rgba[i + 1] = Math.round(rgba[i + 1] * (1 - TINT.a) + TINT.g * TINT.a);
    rgba[i + 2] = Math.round(rgba[i + 2] * (1 - TINT.a) + TINT.b * TINT.a);
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const src = readFileSync(resolve(SRC_DIR, `icon-${size}.png`));
  const { width, height, rgba } = decodePng(src);
  tintRed(rgba);
  writeFileSync(resolve(OUT_DIR, `icon-${size}.png`), encodePng(width, height, rgba));
  console.log(`生成 asset/dev-icons/icon-${size}.png (${width}x${height})`);
}
console.log('完成。');
