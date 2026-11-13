/** Tohumlu, hızlı sözde rastgele sayı üreteci (32 bit). Aynı tohum aynı diziyi verir. */
export type Rng = () => number;
export declare function createRng(seed: number): Rng;
export declare const randomSeed: () => number;
export declare function randomId(): string;
