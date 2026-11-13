const n = (v) => Math.round(v * 100) / 100;
const jitter = (r, amount) => (r() * 2 - 1) * amount;
const pt = (p) => `${n(p[0])} ${n(p[1])}`;
export function polylinePath(points, closed = false) {
    if (!points.length)
        return '';
    let d = `M${pt(points[0])}`;
    for (let i = 1; i < points.length; i++)
        d += `L${pt(points[i])}`;
    return closed ? `${d}Z` : d;
}
/** a'dan b'ye hafif bükülmüş kübik eğri komutu (başlangıç noktası yazılmaz). */
function bowedCurve(a, b, roughness, r) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (roughness <= 0 || len < 2)
        return `L${pt(b)}`;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const bow = jitter(r, roughness * Math.min(len * 0.005, 1.6));
    const wobble = roughness * Math.min(0.5, 0.12 + len / 600);
    const control = (t) => [
        a[0] + (b[0] - a[0]) * t + nx * bow + jitter(r, wobble),
        a[1] + (b[1] - a[1]) * t + ny * bow + jitter(r, wobble),
    ];
    return `C${pt(control(0.33 + jitter(r, 0.03)))} ${pt(control(0.67 + jitter(r, 0.03)))} ${pt(b)}`;
}
/** Tek bir el çizimi doğru parçası (uçlar çok hafif kayar). */
export function sketchSegment(a, b, roughness, r) {
    if (roughness <= 0)
        return `M${pt(a)}L${pt(b)}`;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const shift = roughness * Math.min(0.8, 0.2 + len / 320);
    const s = [a[0] + jitter(r, shift), a[1] + jitter(r, shift)];
    const e = [b[0] + jitter(r, shift), b[1] + jitter(r, shift)];
    return `M${pt(s)}${bowedCurve(s, e, roughness, r)}`;
}
export function sketchLine(a, b, roughness, r, double) {
    const first = sketchSegment(a, b, roughness, r);
    return double && roughness > 0 ? first + sketchSegment(a, b, roughness * 0.55, r) : first;
}
/** Keskin köşeli kapalı çokgen: köşeler hafifçe kayar, kenarlar bükülür, yol kesintisizdir. */
export function sketchPolygon(corners, roughness, r) {
    if (roughness <= 0)
        return polylinePath(corners, true);
    const shift = roughness * 0.6;
    const pts = corners.map((p) => [p[0] + jitter(r, shift), p[1] + jitter(r, shift)]);
    let d = `M${pt(pts[0])}`;
    for (let i = 0; i < pts.length; i++)
        d += bowedCurve(pts[i], pts[(i + 1) % pts.length], roughness, r);
    return d;
}
/** Noktalardan geçen yumuşak eğri (Catmull-Rom → kübik Bézier). */
export function smoothPath(points, closed) {
    const count = points.length;
    if (count < 3)
        return polylinePath(points, closed);
    const at = (i) => closed ? points[(i + count) % count] : points[Math.max(0, Math.min(count - 1, i))];
    let d = `M${pt(points[0])}`;
    const last = closed ? count : count - 1;
    for (let i = 0; i < last; i++) {
        const p0 = at(i - 1);
        const p1 = at(i);
        const p2 = at(i + 1);
        const p3 = at(i + 2);
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
    }
    return closed ? `${d}Z` : d;
}
/** Noktaları çok hafif kaydırıp yumuşak eğriyle birleştirir (çok noktalı eğri çizgiler). */
export function sketchCurve(points, closed, roughness, r) {
    if (roughness <= 0)
        return smoothPath(points, closed);
    const amount = roughness * 0.45;
    return smoothPath(points.map(([x, y]) => [x + jitter(r, amount), y + jitter(r, amount)]), closed);
}
/**
 * Elips çevresi. Yarıçaptaki sapma düşük frekanslı iki dalganın toplamıdır; başlangıç açısı
 * rastgeledir ve kalem kapanırken başlangıcın biraz üstüne biner.
 */
export function sketchEllipsePoints(w, h, roughness, r) {
    const rx = w / 2;
    const ry = h / 2;
    const steps = Math.max(16, Math.min(64, Math.round((w + h) / 9)));
    const start = r() * Math.PI * 2;
    const overlap = roughness > 0 ? 0.05 + r() * 0.08 : 0;
    const amp = roughness * Math.min(0.014, 1.4 / Math.max(rx, ry, 1));
    const phase1 = r() * Math.PI * 2;
    const phase2 = r() * Math.PI * 2;
    const cx = rx + jitter(r, roughness * 0.35);
    const cy = ry + jitter(r, roughness * 0.35);
    const pts = [];
    const total = Math.PI * 2 + overlap;
    const count = Math.ceil((total / (Math.PI * 2)) * steps);
    for (let i = 0; i <= count; i++) {
        const a = start + (total * i) / count;
        // Taşan kısım içe doğru hafifçe kayar; uç uca binme doğal görünür
        const tail = Math.max(0, (a - start - Math.PI * 2) / Math.max(overlap, 1e-6));
        const k = 1 + amp * Math.sin(2 * a + phase1) + amp * 0.5 * Math.sin(3 * a + phase2) - tail * amp * 0.6;
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return pts;
}
export function ellipsePath(w, h) {
    const rx = w / 2;
    const ry = h / 2;
    return `M0 ${n(ry)}A${n(rx)} ${n(ry)} 0 1 0 ${n(w)} ${n(ry)}A${n(rx)} ${n(ry)} 0 1 0 0 ${n(ry)}Z`;
}
export function ellipseOutline(w, h, steps = 48) {
    const out = [];
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        out.push([w / 2 + (Math.cos(a) * w) / 2, h / 2 + (Math.sin(a) * h) / 2]);
    }
    return out;
}
/** Köşeleri yuvarlatılmış çokgenin köşe yarıçapı, kenar uzunluğuna göre sınırlanır. */
function cornerRadius(corners, radius) {
    let shortest = Infinity;
    for (let i = 0; i < corners.length; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % corners.length];
        shortest = Math.min(shortest, Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    return Math.min(radius, shortest / 2.5);
}
function cornerPoints(corners, i, rad) {
    const count = corners.length;
    const c = corners[i];
    const prev = corners[(i - 1 + count) % count];
    const next = corners[(i + 1) % count];
    const lin = Math.hypot(c[0] - prev[0], c[1] - prev[1]) || 1;
    const lout = Math.hypot(next[0] - c[0], next[1] - c[1]) || 1;
    const pin = [c[0] - ((c[0] - prev[0]) / lin) * rad, c[1] - ((c[1] - prev[1]) / lin) * rad];
    const pout = [c[0] + ((next[0] - c[0]) / lout) * rad, c[1] + ((next[1] - c[1]) / lout) * rad];
    return [pin, c, pout];
}
/** Yuvarlak köşeli çokgenin kesin (titreşimsiz) yolu. */
export function roundedPolygonPath(corners, radius) {
    const rad = cornerRadius(corners, radius);
    const parts = corners.map((_, i) => cornerPoints(corners, i, rad));
    let d = `M${pt(parts[0][2])}`;
    for (let k = 1; k <= parts.length; k++) {
        const [pin, c, pout] = parts[k % parts.length];
        d += `L${pt(pin)}Q${pt(c)} ${pt(pout)}`;
    }
    return `${d}Z`;
}
/** Yuvarlak köşeli çokgenin çevresinden örneklenmiş noktalar (dolgu ve isabet testi için). */
export function roundedPolygonOutline(corners, radius, samples = 5) {
    const rad = cornerRadius(corners, radius);
    const out = [];
    corners.forEach((_, i) => {
        const [pin, c, pout] = cornerPoints(corners, i, rad);
        for (let s = 0; s <= samples; s++) {
            const t = s / samples;
            const u = 1 - t;
            out.push([
                u * u * pin[0] + 2 * u * t * c[0] + t * t * pout[0],
                u * u * pin[1] + 2 * u * t * c[1] + t * t * pout[1],
            ]);
        }
    });
    return out;
}
/** Yuvarlak köşeli çokgenin el çizimi hâli: tek parça yol, bükülmüş kenarlar, yumuşak köşeler. */
export function sketchRoundedPolygon(corners, radius, roughness, r) {
    if (roughness <= 0)
        return roundedPolygonPath(corners, radius);
    const rad = cornerRadius(corners, radius);
    const shift = roughness * 0.45;
    const J = (p) => [p[0] + jitter(r, shift), p[1] + jitter(r, shift)];
    const parts = corners.map((_, i) => cornerPoints(corners, i, rad).map(J));
    let d = `M${pt(parts[0][2])}`;
    for (let i = 0; i < parts.length; i++) {
        const [nextIn, nextCorner, nextOut] = parts[(i + 1) % parts.length];
        d += bowedCurve(parts[i][2], nextIn, roughness, r);
        d += `Q${pt(nextCorner)} ${pt(nextOut)}`;
    }
    return d;
}
/**
 * Tarama (hachure) dolgusu: çokgeni verilen açıyla döndürüp yatay tarama çizgileriyle keser,
 * kesişim çiftlerini doğru parçası yapar ve geri döndürür.
 */
export function hatchSegments(polygon, gap, angleDeg) {
    if (polygon.length < 3 || gap <= 0)
        return [];
    const a = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const pts = polygon.map(([x, y]) => [x * cos + y * sin, -x * sin + y * cos]);
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    const segments = [];
    const back = ([x, y]) => [x * cos - y * sin, x * sin + y * cos];
    for (let y = minY + gap / 2; y < maxY; y += gap) {
        const xs = [];
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            const q = pts[(i + 1) % pts.length];
            if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) {
                xs.push(p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
            }
        }
        xs.sort((m, k) => m - k);
        for (let i = 0; i + 1 < xs.length; i += 2) {
            // Uçları kenardan biraz içeride bırak: tarama konturun dışına taşmasın
            const inset = Math.min(1.5, (xs[i + 1] - xs[i]) / 4);
            if (xs[i + 1] - xs[i] < 2)
                continue;
            segments.push([back([xs[i] + inset, y]), back([xs[i + 1] - inset, y])]);
        }
    }
    return segments;
}
/** Serbest çizim izini yumuşatır (ardışık noktaların orta noktalarından geçen eğri). */
export function freehandPath(points) {
    if (!points.length)
        return '';
    if (points.length < 3) {
        const [a] = points;
        const b = points[points.length - 1];
        return `M${pt(a)}L${n(b[0] + 0.01)} ${n(b[1] + 0.01)}`;
    }
    let d = `M${pt(points[0])}`;
    for (let i = 1; i < points.length - 1; i++) {
        const [x, y] = points[i];
        const [nx2, ny2] = points[i + 1];
        d += `Q${n(x)} ${n(y)} ${n((x + nx2) / 2)} ${n((y + ny2) / 2)}`;
    }
    return `${d}L${pt(points[points.length - 1])}`;
}
