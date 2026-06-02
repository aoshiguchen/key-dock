// page-guard：以 MAIN world 注入业务页面，为页面自身的 CryptoJS.AES.decrypt 打补丁。
// 部分登录页会用页面里的 CryptoJS 解密本地缓存的凭据；当扩展填入空值或异常密文时，
// 原始 decrypt 会抛出 TypeError 导致页面脚本中断。此守卫拦截该调用做 null/异常容错。
// 必须运行在 MAIN world 才能触及页面真实的 window.CryptoJS（隔离 world 看不到）。

/** 仅对登录类页面（路径含 /login）启用守卫，避免无谓地改写其它页面的全局对象。 */
function shouldGuardPage(): boolean {
  return /\/login(?:\/|$)/i.test(window.location.pathname);
}

/**
 * 用容错版本替换 CryptoJS.AES.decrypt。
 * @returns 是否已确保补丁在位（CryptoJS 尚不存在时返回 false 以便后续轮询重试）。
 */
function patchCryptoDecrypt(cryptoJs: any): boolean {
  const aes = cryptoJs?.AES;
  if (!aes?.decrypt) return false;
  // 去重补丁：同一个 decrypt 函数已被本扩展包过则直接返回，避免层层嵌套包装。
  if (aes.decrypt.__webAccountAssistantPatched) return true;

  const originalDecrypt = aes.decrypt;
  const patchedDecrypt = function patchedDecrypt(this: unknown, ciphertext: unknown, ...args: unknown[]) {
    // 空密文场景返回空 WordArray，绕开原实现对 null/undefined 的取属性导致的报错。
    if (ciphertext === null || ciphertext === undefined) {
      return cryptoJs.lib.WordArray.create();
    }
    try {
      return originalDecrypt.call(this, ciphertext, ...args);
    } catch (error) {
      // 仅吞掉与密文相关的 TypeError（返回空结果让页面继续运行）；其它错误照常抛出。
      if (error instanceof TypeError && String(error.message).includes('ciphertext')) {
        return cryptoJs.lib.WordArray.create();
      }
      throw error;
    }
  };
  patchedDecrypt.__webAccountAssistantPatched = true;
  aes.decrypt = patchedDecrypt;
  return true;
}

/** CryptoJS 可能在页面脚本之后才加载：以短间隔轮询，命中即停，最多等待 5 秒。 */
function waitAndPatchCrypto(): void {
  const startedAt = Date.now();
  const timer = window.setInterval(() => {
    if (patchCryptoDecrypt((window as any).CryptoJS) || Date.now() - startedAt > 5000) {
      window.clearInterval(timer);
    }
  }, 10);
}

/** 守卫安装入口：必要时为 window.CryptoJS 装上访问器，确保未来赋值的实例也会被打补丁。 */
function installCryptoGuard(): void {
  if (!shouldGuardPage()) return;

  // 跨实例加固：同一扩展可能存在两份实例（商店版 + 本地开发版），均在 MAIN world 运行。
  // 若已有实例安装过 CryptoJS 访问器守卫，本实例只需确保补丁在位，不再二次 defineProperty，
  // 避免覆盖另一实例已注册的 getter/setter。
  if ((window as any).__webAccountAssistantCryptoGuard) {
    patchCryptoDecrypt((window as any).CryptoJS);
    return;
  }
  (window as any).__webAccountAssistantCryptoGuard = true;

  const current = (window as any).CryptoJS;
  if (current) {
    // 已存在则立即打补丁；若此刻 AES 还没就绪，则转入轮询等待。
    if (patchCryptoDecrypt(current)) return;
    waitAndPatchCrypto();
  }

  // 用访问器接管 window.CryptoJS：当页面脚本稍后赋值真正的 CryptoJS 时，setter 立即为其打补丁。
  let value: any = current;
  Object.defineProperty(window, 'CryptoJS', {
    configurable: true,
    get() {
      return value;
    },
    set(next) {
      value = next;
      if (!patchCryptoDecrypt(next)) {
        waitAndPatchCrypto();
      }
    },
  });
}

installCryptoGuard();
