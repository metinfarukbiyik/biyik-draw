export function createRng(seed) {
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
export function randomId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        return crypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
