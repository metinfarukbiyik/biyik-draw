export const STROKE_COLORS = ['#18181b', '#dc2626', '#16a34a', '#2563eb', '#d97706', '#9333ea'];
export const BACKGROUND_COLORS = ['transparent', '#fecaca', '#bbf7d0', '#bfdbfe', '#fde68a', '#e9d5ff'];
export const CANVAS_COLORS = ['#ffffff', '#fafafa', '#f5f5f4', '#f0f9ff', '#fefce8', '#fdf2f8'];
export const SELECTION_COLOR = '#3b82f6';
function hexToRgb(hex) {
    let h = hex.trim().replace('#', '');
    if (h.length === 3)
        h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h))
        return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min)
        return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r)
        h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g)
        h = (b - r) / d + 2;
    else
        h = (r - g) / d + 4;
    return [h / 6, s, l];
}
const cache = new Map();
/**
 * Koyu temada rengin açıklığını tersine çevirir, tonu korur: siyah mürekkep açık griye,
 * pastel dolgular koyu tonlara döner. Açık temada renk olduğu gibi kalır.
 */
export function themed(color, theme) {
    if (theme === 'light' || color === 'transparent')
        return color;
    const hit = cache.get(color);
    if (hit)
        return hit;
    const rgb = hexToRgb(color);
    if (!rgb)
        return color;
    const [h, s, l] = rgbToHsl(...rgb);
    const nextL = 0.07 + (1 - l) * 0.86;
    const out = `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(nextL * 100)}%)`;
    cache.set(color, out);
    return out;
}
