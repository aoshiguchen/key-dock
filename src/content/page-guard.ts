function shouldGuardPage(): boolean {
  return /\/login(?:\/|$)/i.test(window.location.pathname);
}

function patchCryptoDecrypt(cryptoJs: any): boolean {
  const aes = cryptoJs?.AES;
  if (!aes?.decrypt) return false;
  if (aes.decrypt.__webAccountAssistantPatched) return true;

  const originalDecrypt = aes.decrypt;
  const patchedDecrypt = function patchedDecrypt(this: unknown, ciphertext: unknown, ...args: unknown[]) {
    if (ciphertext === null || ciphertext === undefined) {
      return cryptoJs.lib.WordArray.create();
    }
    try {
      return originalDecrypt.call(this, ciphertext, ...args);
    } catch (error) {
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

function waitAndPatchCrypto(): void {
  const startedAt = Date.now();
  const timer = window.setInterval(() => {
    if (patchCryptoDecrypt((window as any).CryptoJS) || Date.now() - startedAt > 5000) {
      window.clearInterval(timer);
    }
  }, 10);
}

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
    if (patchCryptoDecrypt(current)) return;
    waitAndPatchCrypto();
  }

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
