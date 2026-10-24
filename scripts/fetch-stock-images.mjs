// Downloads the stock photos listed in src/content/images.ts and stores them as 1920px WebP
// files in public/images/stock. Re-run after changing the list. Requires network access.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import sharp from "sharp";

const src = await readFile(new URL("../src/content/images.ts", import.meta.url), "utf8");
const entries = [...src.matchAll(/img\("([a-z-]+)",\s*"([0-9a-f-]+)"/g)].map((m) => ({ key: m[1], id: m[2] }));
await mkdir("public/images/stock", { recursive: true });
let done = 0;
for (const { key, id } of entries) {
  const out = `public/images/stock/${key}.webp`;
  if (existsSync(out) && !process.argv.includes("--force")) continue;
  const url = `https://images.unsplash.com/photo-${id}?w=1920&q=78&auto=format&fit=max`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("failed", key, res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(buf).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
  await writeFile(out, webp);
  done++;
  console.log("saved", out, Math.round(webp.length / 1024) + " KB");
}
console.log(`${done} images written, ${entries.length} listed`);
