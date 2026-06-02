import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import type { Plugin } from 'vite';

// 环境变量 KEYDOCK_BUILD=dev 时构建「本地开发版」：改写 dist/manifest.json 的
// name / 标题 / 描述并追加 [DEV] 标记，同时用 asset/dev-icons 下的红色图标覆盖 dist/icons，
// 使本地加载的插件与 Chrome 商店正式版在扩展列表、工具栏中一眼可辨。
// 正式版构建（无此环境变量）下本插件为空操作，完全不影响上架产物。
const DEV_ICON_SIZES = [16, 32, 48, 128];

function devVariantPlugin(): Plugin {
  const isDev = process.env.KEYDOCK_BUILD === 'dev';
  return {
    name: 'keydock-dev-variant',
    apply: 'build',
    closeBundle() {
      if (!isDev) return;
      const outDir = resolve(__dirname, 'dist');

      // 1) 改写 manifest：name / action.default_title / description 追加 [DEV] 标记
      const manifestPath = resolve(outDir, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const devName = `${manifest.name} [DEV]`;
      manifest.name = devName;
      manifest.description = `【本地开发调试版，勿上架】${manifest.description}`;
      if (manifest.action) {
        manifest.action.default_title = devName;
      }
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

      // 2) 用红色 dev 图标覆盖 dist/icons
      const devIconDir = resolve(__dirname, 'asset/dev-icons');
      for (const size of DEV_ICON_SIZES) {
        const src = resolve(devIconDir, `icon-${size}.png`);
        const dest = resolve(outDir, `icons/icon-${size}.png`);
        if (existsSync(src)) copyFileSync(src, dest);
      }

      // eslint-disable-next-line no-console
      console.log(`[keydock-dev-variant] 已生成本地开发版：${devName}（红色图标）`);
    },
  };
}

export default defineConfig({
  plugins: [react(), devVariantPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        extension: resolve(__dirname, 'extension.html'),
        popup: resolve(__dirname, 'popup.html'),
      },
      output: {
        entryFileNames(chunkInfo) {
          if (chunkInfo.name === 'background') return 'background.js';
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
