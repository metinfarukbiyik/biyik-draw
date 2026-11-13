import { drawPaper, paperSvg } from './paper.js';
import { generateOps, isShape } from './shapes.js';
import { themed, SELECTION_COLOR } from './colors.js';
import { boundsIntersect, commonBounds, elementBounds } from './geometry.js';
import { worldOutline } from './binding.js';
import { fontFamilyCss, fontString, LABEL_PADDING, LINE_HEIGHT, wrapText } from './text.js';
const opsCache = new Map();
function shapeKey(el) {
    return [
        el.type,
        el.width.toFixed(2),
        el.height.toFixed(2),
        el.seed,
        el.roughness,
        el.strokeWidth,
        el.strokeStyle,
        el.fillStyle,
        el.backgroundColor === 'transparent' ? 0 : 1,
        el.edges,
        el.startArrowhead,
        el.endArrowhead,
        el.type === 'freedraw' ? el.points?.length : JSON.stringify(el.points ?? ''),
    ].join('|');
}
function cachedOps(el) {
    const key = shapeKey(el);
    const hit = opsCache.get(el.id);
    if (hit && hit.key === key)
        return hit;
    const entry = { key, ops: generateOps(el) };
    opsCache.set(el.id, entry);
    return entry;
}
export function getOps(el) {
    return cachedOps(el).ops;
}
/** Görseller: dosya kimliği → yüklenmiş <img>. Yüklenince `onLoad` çağrılır. */
export class ImageCache {
    constructor(onLoad) {
        this.onLoad = onLoad;
        this.images = new Map();
    }
    ensure(fileId, files) {
        let img = this.images.get(fileId);
        if (img)
            return img;
        const src = files[fileId];
        if (!src)
            return null;
        img = new Image();
        img.addEventListener('load', () => this.onLoad());
        img.src = src;
        this.images.set(fileId, img);
        return img;
    }
    get(fileId, files) {
        const img = this.ensure(fileId, files);
        return img && img.complete && img.naturalWidth ? img : null;
    }
    /** Verilen görsellerin hepsi yüklenince (ya da hata verince) çözülür. */
    preload(fileIds, files) {
        return Promise.all(fileIds.map((id) => new Promise((resolve) => {
            const img = this.ensure(id, files);
            if (!img || (img.complete && img.naturalWidth))
                return resolve();
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
        }))).then(() => undefined);
    }
}
/* ───────────── Öğe çizimi ───────────── */
export function dashFor(el) {
    const w = el.strokeWidth;
    if (el.strokeStyle === 'dashed')
        return [w * 4 + 6, w * 3 + 6];
    if (el.strokeStyle === 'dotted')
        return [0.1, w * 3 + 4];
    return [];
}
function labelLines(el) {
    const font = fontString(el.fontSize, el.fontFamily);
    const maxWidth = Math.max(10, labelWidth(el));
    return { font, lines: wrapText(el.text ?? '', font, maxWidth) };
}
/** Şekil etiketinin sığacağı genişlik (elips ve eşkenar dörtgende iç kutu daha dar). */
export function labelWidth(el) {
    const factor = el.type === 'rectangle' ? 1 : el.type === 'ellipse' ? 0.72 : el.type === 'triangle' ? 0.5 : 0.56;
    return el.width * factor - LABEL_PADDING * 2;
}
/** Şekil etiketinin dikey merkezi (üçgende geniş tabana yakın). */
export function labelCenterY(el) {
    return el.type === 'triangle' ? el.height * 0.64 : el.height / 2;
}
function drawTextLines(ctx, lines, el, font, boxWidth, top, left = 0) {
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = el.textAlign;
    const lh = el.fontSize * LINE_HEIGHT;
    const x = el.textAlign === 'left' ? left : el.textAlign === 'right' ? left + boxWidth : left + boxWidth / 2;
    lines.forEach((line, i) => ctx.fillText(line, x, top + i * lh + lh / 2));
}
/** Fosforlu kalemin ekrandaki kalınlığı. */
export const highlightWidth = (el) => 10 + el.strokeWidth * 4;
export function drawElement(ctx, el, theme, images, files, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = (el.opacity / 100) * alpha;
    ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
    if (el.angle)
        ctx.rotate(el.angle);
    ctx.translate(-el.width / 2, -el.height / 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const stroke = themed(el.strokeColor, theme);
    const background = themed(el.backgroundColor, theme);
    if (el.type === 'text') {
        ctx.fillStyle = stroke;
        drawTextLines(ctx, (el.text ?? '').split('\n'), el, fontString(el.fontSize, el.fontFamily), el.width, 0);
    }
    else if (el.type === 'image') {
        const img = el.fileId ? images?.get(el.fileId, files) : null;
        if (img)
            ctx.drawImage(img, 0, 0, el.width, el.height);
        else {
            ctx.fillStyle = theme === 'dark' ? '#27272a' : '#f4f4f5';
            ctx.fillRect(0, 0, el.width, el.height);
        }
    }
    else {
        const entry = cachedOps(el);
        entry.paths ?? (entry.paths = entry.ops.map((op) => new Path2D(op.d)));
        entry.ops.forEach((op, i) => {
            const path = entry.paths[i];
            switch (op.mode) {
                case 'fill':
                    ctx.fillStyle = background;
                    ctx.fill(path);
                    break;
                case 'hatch':
                    ctx.setLineDash([]);
                    ctx.strokeStyle = background;
                    ctx.lineWidth = Math.max(1, el.strokeWidth * 0.6);
                    ctx.stroke(path);
                    break;
                case 'stroke':
                    ctx.setLineDash(dashFor(el));
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = el.strokeWidth;
                    ctx.stroke(path);
                    break;
                case 'head':
                    ctx.setLineDash([]);
                    ctx.fillStyle = stroke;
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = el.strokeWidth;
                    ctx.fill(path);
                    ctx.stroke(path);
                    break;
                case 'headStroke':
                    ctx.setLineDash([]);
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = el.strokeWidth;
                    ctx.stroke(path);
                    break;
                case 'free':
                    ctx.setLineDash([]);
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = el.strokeWidth * 1.6;
                    ctx.stroke(path);
                    break;
                case 'freeFill':
                    ctx.fillStyle = stroke;
                    ctx.fill(path);
                    break;
                case 'highlight':
                    // Fosforlu kalem: açık temada çarpma karışımı, alttaki yazı koyu kalır
                    ctx.setLineDash([]);
                    ctx.globalAlpha *= theme === 'light' ? 0.55 : 0.38;
                    if (theme === 'light')
                        ctx.globalCompositeOperation = 'multiply';
                    ctx.strokeStyle = el.strokeColor;
                    ctx.lineWidth = highlightWidth(el);
                    ctx.stroke(path);
                    break;
            }
        });
        if (isShape(el) && el.text) {
            const { font, lines } = labelLines(el);
            const lh = el.fontSize * LINE_HEIGHT;
            const inner = labelWidth(el);
            ctx.fillStyle = stroke;
            drawTextLines(ctx, lines, el, font, inner, labelCenterY(el) - (lines.length * lh) / 2, (el.width - inner) / 2);
        }
    }
    ctx.restore();
}
export const GRID_SIZE = 20;
function drawGrid(ctx, opts) {
    const { zoom, scrollX, scrollY } = opts.view;
    let size = GRID_SIZE;
    while (size * zoom < 10)
        size *= 5;
    const left = -scrollX;
    const top = -scrollY;
    const right = left + opts.width / zoom;
    const bottom = top + opts.height / zoom;
    const dark = opts.theme === 'dark';
    ctx.lineWidth = 1 / zoom;
    for (const major of [false, true]) {
        const step = major ? size * 5 : size;
        ctx.strokeStyle = dark
            ? major ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'
            : major ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)';
        ctx.beginPath();
        for (let x = Math.floor(left / step) * step; x < right; x += step) {
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
        }
        for (let y = Math.floor(top / step) * step; y < bottom; y += step) {
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
        }
        ctx.stroke();
    }
}
function drawOverlay(ctx, overlay, zoom) {
    const px = 1 / zoom;
    ctx.save();
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.lineWidth = px;
    ctx.setLineDash([]);
    if (overlay.hovered) {
        const el = overlay.hovered;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate(el.angle);
        ctx.lineWidth = px;
        const pad = 4 * px;
        ctx.strokeRect(-el.width / 2 - pad, -el.height / 2 - pad, el.width + pad * 2, el.height + pad * 2);
        ctx.restore();
    }
    if (overlay.bindTarget) {
        ctx.save();
        ctx.strokeStyle = 'rgba(59,130,246,0.45)';
        ctx.lineWidth = 5 * px;
        ctx.lineJoin = 'round';
        const outline = worldOutline(overlay.bindTarget);
        ctx.beginPath();
        outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
    for (const el of overlay.outlines) {
        ctx.save();
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate(el.angle);
        ctx.setLineDash([4 * px, 4 * px]);
        const pad = 3 * px;
        ctx.strokeRect(-el.width / 2 - pad, -el.height / 2 - pad, el.width + pad * 2, el.height + pad * 2);
        ctx.restore();
    }
    if (overlay.frame) {
        const { cx, cy, w, h, angle } = overlay.frame;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        const pad = 6 * px;
        ctx.lineWidth = 1.25 * px;
        ctx.strokeRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);
        ctx.restore();
    }
    for (const hnd of overlay.handles) {
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 1.25 * px;
        ctx.beginPath();
        if (hnd.kind === 'square') {
            const s = 8 * px;
            ctx.roundRect(hnd.x - s / 2, hnd.y - s / 2, s, s, 2 * px);
        }
        else {
            ctx.arc(hnd.x, hnd.y, (hnd.kind === 'point' ? 5 : 4.5) * px, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
    }
    if (overlay.marquee) {
        const [[x1, y1], [x2, y2]] = overlay.marquee;
        ctx.fillStyle = 'rgba(59,130,246,0.08)';
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    }
    ctx.restore();
}
export function renderScene(ctx, elements, overlay, opts) {
    const { zoom, scrollX, scrollY } = opts.view;
    ctx.setTransform(opts.dpr, 0, 0, opts.dpr, 0, 0);
    ctx.fillStyle = themed(opts.background, opts.theme);
    ctx.fillRect(0, 0, opts.width, opts.height);
    ctx.scale(zoom, zoom);
    ctx.translate(scrollX, scrollY);
    const visible = [
        -scrollX,
        -scrollY,
        -scrollX + opts.width / zoom,
        -scrollY + opts.height / zoom,
    ];
    if (opts.paper && opts.paper !== 'none')
        drawPaper(ctx, opts.paper, visible, opts.theme, 1 / zoom, zoom);
    if (opts.grid)
        drawGrid(ctx, opts);
    const viewport = [-scrollX, -scrollY, -scrollX + opts.width / zoom, -scrollY + opts.height / zoom];
    for (const el of elements) {
        if (el.hidden || (el.id === overlay.editingId && el.type === 'text'))
            continue;
        if (!boundsIntersect(elementBounds(el), viewport))
            continue;
        const editingLabel = el.id === overlay.editingId && el.text;
        const shown = editingLabel ? { ...el, text: '' } : el;
        drawElement(ctx, shown, opts.theme, opts.images, opts.files, overlay.erasing.has(el.id) ? 0.25 : 1);
    }
    drawOverlay(ctx, overlay, zoom);
    if (overlay.laser?.length)
        drawLaser(ctx, overlay.laser, zoom);
}
/** Lazer işaretçi: parlak kırmızı, giderek incelip sönen iz. */
function drawLaser(ctx, pts, zoom) {
    const px = 1 / zoom;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(239,68,68,0.8)';
    ctx.shadowBlur = 12;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        ctx.strokeStyle = `rgba(239,68,68,${b.life})`;
        ctx.lineWidth = (2 + 4 * b.life) * px;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    const head = pts[pts.length - 1];
    if (head.life > 0.6) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3 * px, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
export async function exportToCanvas(elements, files, { background, theme, scale, padding = 24, paper = 'none' }) {
    const canvas = document.createElement('canvas');
    const bounds = commonBounds(elements) ?? [0, 0, 100, 100];
    const width = bounds[2] - bounds[0] + padding * 2;
    const height = bounds[3] - bounds[1] + padding * 2;
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext('2d');
    const images = new ImageCache(() => { });
    await images.preload(elements.flatMap((el) => (el.type === 'image' && el.fileId ? [el.fileId] : [])), files);
    ctx.scale(scale, scale);
    if (background) {
        ctx.fillStyle = themed(background, theme);
        ctx.fillRect(0, 0, width, height);
    }
    ctx.translate(padding - bounds[0], padding - bounds[1]);
    if (paper !== 'none')
        drawPaper(ctx, paper, [bounds[0] - padding, bounds[1] - padding, bounds[2] + padding, bounds[3] + padding], theme, 1, 1);
    for (const el of elements)
        drawElement(ctx, el, theme, images, files);
    return canvas;
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function svgTextLines(lines, el, color, boxWidth, top, left) {
    const lh = el.fontSize * LINE_HEIGHT;
    const anchor = el.textAlign === 'left' ? 'start' : el.textAlign === 'right' ? 'end' : 'middle';
    const x = el.textAlign === 'left' ? left : el.textAlign === 'right' ? left + boxWidth : left + boxWidth / 2;
    const family = esc(fontFamilyCss(el.fontFamily));
    return lines
        .map((line, i) => `<text x="${x}" y="${top + i * lh + lh / 2}" font-family="${family}" font-size="${el.fontSize}" fill="${color}" text-anchor="${anchor}" dominant-baseline="central" style="white-space:pre">${esc(line)}</text>`)
        .join('');
}
export function exportToSvg(elements, files, { background, theme, padding = 24, paper = 'none' }) {
    const bounds = commonBounds(elements) ?? [0, 0, 100, 100];
    const width = bounds[2] - bounds[0] + padding * 2;
    const height = bounds[3] - bounds[1] + padding * 2;
    const ox = padding - bounds[0];
    const oy = padding - bounds[1];
    const parts = [];
    if (background)
        parts.push(`<rect width="100%" height="100%" fill="${themed(background, theme)}"/>`);
    if (paper !== 'none')
        parts.push(paperSvg(paper, [bounds[0] - padding, bounds[1] - padding, bounds[2] + padding, bounds[3] + padding], theme, ox, oy));
    for (const el of elements) {
        const stroke = themed(el.strokeColor, theme);
        const bg = themed(el.backgroundColor, theme);
        const deg = (el.angle * 180) / Math.PI;
        const tf = `translate(${el.x + ox + el.width / 2} ${el.y + oy + el.height / 2}) rotate(${deg}) translate(${-el.width / 2} ${-el.height / 2})`;
        let inner = '';
        if (el.type === 'text') {
            inner = svgTextLines((el.text ?? '').split('\n'), el, stroke, el.width, 0, 0);
        }
        else if (el.type === 'image') {
            const src = el.fileId ? files[el.fileId] : '';
            if (src)
                inner = `<image href="${src}" width="${el.width}" height="${el.height}" preserveAspectRatio="none"/>`;
        }
        else {
            const dash = dashFor(el);
            for (const op of getOps(el)) {
                const base = `d="${op.d}" stroke-linecap="round" stroke-linejoin="round"`;
                if (op.mode === 'fill')
                    inner += `<path ${base} fill="${bg}" stroke="none"/>`;
                else if (op.mode === 'hatch')
                    inner += `<path ${base} fill="none" stroke="${bg}" stroke-width="${Math.max(1, el.strokeWidth * 0.6)}"/>`;
                else if (op.mode === 'stroke')
                    inner += `<path ${base} fill="none" stroke="${stroke}" stroke-width="${el.strokeWidth}"${dash.length ? ` stroke-dasharray="${dash.join(' ')}"` : ''}/>`;
                else if (op.mode === 'head')
                    inner += `<path ${base} fill="${stroke}" stroke="${stroke}" stroke-width="${el.strokeWidth}"/>`;
                else if (op.mode === 'headStroke')
                    inner += `<path ${base} fill="none" stroke="${stroke}" stroke-width="${el.strokeWidth}"/>`;
                else if (op.mode === 'free')
                    inner += `<path ${base} fill="none" stroke="${stroke}" stroke-width="${el.strokeWidth * 1.6}"/>`;
                else if (op.mode === 'freeFill')
                    inner += `<path d="${op.d}" fill="${stroke}" stroke="none"/>`;
                else if (op.mode === 'highlight')
                    inner += `<path ${base} fill="none" stroke="${el.strokeColor}" stroke-width="${highlightWidth(el)}" stroke-opacity="${theme === 'light' ? 0.55 : 0.38}" style="mix-blend-mode:${theme === 'light' ? 'multiply' : 'normal'}"/>`;
            }
            if (isShape(el) && el.text) {
                const { lines } = labelLines(el);
                const lh = el.fontSize * LINE_HEIGHT;
                const w = labelWidth(el);
                inner += svgTextLines(lines, el, stroke, w, labelCenterY(el) - (lines.length * lh) / 2, (el.width - w) / 2);
            }
        }
        parts.push(`<g transform="${tf}" opacity="${el.opacity / 100}">${inner}</g>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}
