/** Kılavuz çizgili satır: dört çizgi arası (s) ve satırlar arası boşluk. */
export const GUIDE_SPACING = 16;
export const GUIDE_GAP = 28;
function palette(theme) {
    return theme === 'dark'
        ? { soft: 'rgba(147,197,253,0.14)', mid: 'rgba(147,197,253,0.24)', strong: 'rgba(147,197,253,0.36)', margin: 'rgba(248,113,113,0.42)', band: 'rgba(147,197,253,0.05)' }
        : { soft: 'rgba(59,130,246,0.16)', mid: 'rgba(59,130,246,0.28)', strong: 'rgba(59,130,246,0.42)', margin: 'rgba(239,68,68,0.45)', band: 'rgba(59,130,246,0.06)' };
}
/**
 * Verilen dünya dikdörtgenini kaplayan desen parçaları. `px` bir ekran pikselinin dünya
 * karşılığıdır (çizgi kalınlığı için), `zoom` çok sık desenleri atlamak için.
 */
export function paperPrimitives(paper, [l, t, r, b], theme, px, zoom) {
    const lines = [];
    const dots = [];
    const c = palette(theme);
    const w = Math.max(px, 0.5);
    const hLine = (y, color, width = w) => lines.push({ x1: l, y1: y, x2: r, y2: y, color, width });
    const vLine = (x, color, width = w) => lines.push({ x1: x, y1: t, x2: x, y2: b, color, width });
    if (paper === 'grid') {
        const step = 24;
        if (step * zoom < 5)
            return { lines, dots };
        for (let x = Math.floor(l / step) * step; x <= r; x += step)
            vLine(x, Math.round(x / step) % 5 === 0 ? c.mid : c.soft);
        for (let y = Math.floor(t / step) * step; y <= b; y += step)
            hLine(y, Math.round(y / step) % 5 === 0 ? c.mid : c.soft);
    }
    else if (paper === 'dots') {
        const step = 24;
        if (step * zoom < 9)
            return { lines, dots };
        const rad = Math.max(1.1, 1.4 * px);
        for (let x = Math.floor(l / step) * step; x <= r; x += step)
            for (let y = Math.floor(t / step) * step; y <= b; y += step)
                dots.push({ x, y, r: rad, color: c.strong });
    }
    else if (paper === 'lines') {
        const step = 32;
        if (step * zoom < 5)
            return { lines, dots };
        for (let y = Math.floor(t / step) * step; y <= b; y += step)
            hLine(y, c.mid);
        // Defter kenar boşluğu çizgisi
        if (l <= 0 && r >= 0)
            vLine(0, c.margin, w * 1.5);
    }
    else if (paper === 'guide') {
        const s = GUIDE_SPACING;
        const row = s * 3 + GUIDE_GAP;
        if (s * zoom < 3)
            return { lines, dots };
        for (let y0 = Math.floor(t / row) * row; y0 <= b; y0 += row) {
            // Orta bölge (küçük harfler) hafif renkli bant; üst ve alt çizgi açık, orta çizgiler koyu
            hLine(y0 + 1.5 * s, c.band, s);
            hLine(y0, c.mid);
            hLine(y0 + s, c.strong, w * 1.2);
            hLine(y0 + 2 * s, c.strong, w * 1.2);
            hLine(y0 + 3 * s, c.mid);
        }
        if (l <= 0 && r >= 0)
            vLine(0, c.margin, w * 1.5);
    }
    return { lines, dots };
}
export function drawPaper(ctx, paper, rect, theme, px, zoom) {
    if (paper === 'none')
        return;
    const { lines, dots } = paperPrimitives(paper, rect, theme, px, zoom);
    ctx.save();
    ctx.setLineDash([]);
    for (const ln of lines) {
        ctx.strokeStyle = ln.color;
        ctx.lineWidth = ln.width;
        ctx.beginPath();
        ctx.moveTo(ln.x1, ln.y1);
        ctx.lineTo(ln.x2, ln.y2);
        ctx.stroke();
    }
    for (const d of dots) {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
/** SVG dışa aktarım için desen; `ox`, `oy` dünya→SVG kaydırması. */
export function paperSvg(paper, rect, theme, ox, oy) {
    if (paper === 'none')
        return '';
    const { lines, dots } = paperPrimitives(paper, rect, theme, 1, 1);
    const f = (v) => Math.round(v * 100) / 100;
    return (lines
        .map((ln) => `<line x1="${f(ln.x1 + ox)}" y1="${f(ln.y1 + oy)}" x2="${f(ln.x2 + ox)}" y2="${f(ln.y2 + oy)}" stroke="${ln.color}" stroke-width="${ln.width}"/>`)
        .join('') + dots.map((d) => `<circle cx="${f(d.x + ox)}" cy="${f(d.y + oy)}" r="${d.r}" fill="${d.color}"/>`).join(''));
}
