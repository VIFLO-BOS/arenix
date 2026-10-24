// Builds web ready brand assets from the owner's logo file.
// Usage: node scripts/build-brand-assets.mjs <path-to-logo.png>
// Outputs to public/brand and src/app (icon.png, apple-icon.png, opengraph-image.png).
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const src = process.argv[2];
if (!src) throw new Error("Pass the logo path");
await mkdir("public/brand", { recursive: true });

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

// Bounding boxes: whole mark (non white) and the orange X alone.
let minX = W, minY = H, maxX = 0, maxY = 0, oMinX = W, oMinY = H, oMaxX = 0, oMaxY = 0;
let navy = [0, 0, 0, 0], orange = [0, 0, 0, 0];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dark = r + g + b < 740;
    if (!dark) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    const isOrange = r > 200 && g > 100 && g < 190 && b < 90;
    const isNavy = b > r + 20 && r < 90 && g < 90;
    if (isOrange) { if (x < oMinX) oMinX = x; if (x > oMaxX) oMaxX = x; if (y < oMinY) oMinY = y; if (y > oMaxY) oMaxY = y; orange[0] += r; orange[1] += g; orange[2] += b; orange[3]++; }
    else if (isNavy) { navy[0] += r; navy[1] += g; navy[2] += b; navy[3]++; }
  }
}
const hex = (a) => "#" + [0, 1, 2].map((k) => Math.round(a[k] / a[3]).toString(16).padStart(2, "0")).join("");
console.log("navy", hex(navy), "orange", hex(orange));
console.log("logo bbox", minX, minY, maxX, maxY, "mark bbox", oMinX, oMinY, oMaxX, oMaxY);

// White to alpha. Solid pixels stay fully opaque with their true colour; only the light
// anti aliased edge pixels get partial alpha. `mode` "full" keeps everything, "light" paints
// the navy letters off white, "mark" keeps the orange X only.
function toAlpha(mode) {
  const out = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    const i = p * C, o = p * 4;
    let r = data[i], g = data[i + 1], b = data[i + 2];
    const raw = 255 - Math.min(r, g, b);
    const a = Math.min(255, Math.round(raw * 1.6));
    if (a === 0) { out[o + 3] = 0; continue; }
    if (a < 255) {
      r = Math.max(0, Math.min(255, Math.round((r - (255 - a)) * 255 / a)));
      g = Math.max(0, Math.min(255, Math.round((g - (255 - a)) * 255 / a)));
      b = Math.max(0, Math.min(255, Math.round((b - (255 - a)) * 255 / a)));
    }
    const isOrange = r > 180 && b < 140 && g > 80 && g < 210;
    if (mode === "mark" && !isOrange) { out[o + 3] = 0; continue; }
    if (mode === "light" && !isOrange) { r = 246; g = 243; b = 234; }
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
  }
  return out;
}

const pad = Math.round((maxX - minX) * 0.03);
const crop = { left: Math.max(0, minX - pad), top: Math.max(0, minY - pad), width: Math.min(W, maxX + pad) - Math.max(0, minX - pad), height: Math.min(H, maxY + pad) - Math.max(0, minY - pad) };
const mpad = Math.round((oMaxX - oMinX) * 0.12);
const markCrop = { left: Math.max(0, oMinX - mpad), top: Math.max(0, oMinY - mpad), width: Math.min(W, oMaxX + mpad) - Math.max(0, oMinX - mpad), height: Math.min(H, oMaxY + mpad) - Math.max(0, oMinY - mpad) };

const full = toAlpha("full");
const light = toAlpha("light");
const mark = toAlpha("mark");
const make = (buf) => sharp(buf, { raw: { width: W, height: H, channels: 4 } });

await make(full).extract(crop).resize({ width: 1600 }).png({ compressionLevel: 9 }).toFile("public/brand/logo.png");
await make(light).extract(crop).resize({ width: 1600 }).png({ compressionLevel: 9 }).toFile("public/brand/logo-on-dark.png");
await make(mark).extract(markCrop).resize({ width: 1024, height: 1024, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile("public/brand/mark.png");
await make(mark).extract(markCrop).resize({ width: 1024, height: 1024, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile("public/brand/mark-on-dark.png");

// App icons: orange X on navy
const navyBg = { r: 6, g: 19, b: 42, alpha: 1 };
const markLight = await make(mark).extract(markCrop).resize({ width: 360, height: 360, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: navyBg } }).composite([{ input: markLight, gravity: "centre" }]).png().toFile("src/app/icon.png");
const markApple = await make(mark).extract(markCrop).resize({ width: 126, height: 126, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: navyBg } }).composite([{ input: markApple, gravity: "centre" }]).png().toFile("src/app/apple-icon.png");

// Social preview 1200 x 630: light logo on navy
const logoLight = await make(light).extract(crop).resize({ width: 760 }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: navyBg } }).composite([{ input: logoLight, gravity: "centre" }]).png().toFile("src/app/opengraph-image.png");
await writeFile("public/brand/README.md", `# Brand assets\n\nGenerated from the owner's logo by \`node scripts/build-brand-assets.mjs <logo.png>\`.\n\n- logo.png: navy wordmark with the orange X, transparent background, for light surfaces.\n- logo-on-dark.png: the same mark with the letters in off white, for navy surfaces.\n- mark.png and mark-on-dark.png: the X alone.\n- src/app/icon.png, apple-icon.png and opengraph-image.png are picked up by Next.js automatically.\n\nMeasured colours. Navy ${hex(navy)}, orange ${hex(orange)}.\n`);
console.log("assets written");
