// 生成带前缀的唯一 id。
/** 生成形如 `prefix-xxxx` 的唯一 id：优先用 crypto.randomUUID，回退到时间戳 + 随机数。 */
export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
