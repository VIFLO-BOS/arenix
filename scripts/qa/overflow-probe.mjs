// Reports document-level horizontal overflow and the offending elements (ignoring children of scroll containers).
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const path = process.env.QA_PATH ?? "/solutions";
const browser = await chromium.launch();
for (const width of [250, 320, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const r = await page.evaluate((w) => {
    const doc = document.documentElement.scrollWidth - window.innerWidth;
    const inScroller = (el) => { for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return true; } return false; };
    const wide = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > w + 1 && !inScroller(el)).slice(0, 8).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} right=${Math.round(el.getBoundingClientRect().right)}`);
    return { doc, wide };
  }, width);
  console.log(`${width}px ${path}: document overflow ${r.doc}px`, r.wide.length ? "\n  " + r.wide.join("\n  ") : "");
  await page.close();
}
await browser.close();
