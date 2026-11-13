/** Tohumlu, hızlı sözde rastgele sayı üreteci (32 bit). Aynı tohum aynı diziyi verir. */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    // xorshift32
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
