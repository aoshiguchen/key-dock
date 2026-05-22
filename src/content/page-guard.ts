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
