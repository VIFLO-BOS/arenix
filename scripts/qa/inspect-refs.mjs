// Inspects how reference sites implement motion: libraries, durations, container width, type scale.
import { chromium } from "playwright";
const SITES = ["https://www.clenest.site", "https://altreex.webflow.io/", "https://onart-studio.webflow.io/", "https://visione.webflow.io/", "https://monoform-template.webflow.io/", "https://nexifye.webflow.io/"];
const browser = await chromium.launch({ headless: true });
for (const url of SITES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const scripts = new Set();
  page.on("request", (r) => { if (r.resourceType() === "script") scripts.add(r.url()); });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const w = window;
      const libs = { lenis: !!(w.Lenis || document.documentElement.classList.contains("lenis") || document.querySelector(".lenis")), gsap: !!w.gsap, scrollTrigger: !!(w.ScrollTrigger || (w.gsap && w.gsap.plugins && Object.keys(w.gsap.plugins||{}).length)), webflowIX: document.querySelectorAll("[data-w-id]").length, framer: !!document.querySelector("[data-framer-name],[data-projection-id]"), splitText: document.querySelectorAll(".word, .char, [class*='split']").length, barba: !!w.barba, swup: !!w.swup, locomotive: !!document.querySelector("[data-scroll-container]") };
      const cs = (el) => getComputedStyle(el);
      const body = cs(document.body);
      const h1 = document.querySelector("h1"); const h2 = document.querySelector("h2"); const p = document.querySelector("main p, section p, p");
      // container: find elements with max-width in px and centered margins
      const widths = {}; for (const el of document.querySelectorAll("div,section,main,header,nav")) { const s = cs(el); if (s.maxWidth && s.maxWidth.endsWith("px") && (s.marginLeft === "auto" || s.marginLeft === s.marginRight)) { const k = s.maxWidth + "/" + s.paddingLeft; widths[k] = (widths[k] || 0) + 1; } }
      // durations histogram from stylesheets
      const dur = {}; const anim = {}; const ease = {};
      for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } for (const r of rules) { const st = r.style; if (!st) continue; const d = st.transitionDuration; if (d && d !== "0s") dur[d] = (dur[d]||0)+1; const a = st.animationDuration; if (a && a !== "0s") anim[a] = (anim[a]||0)+1; const e = st.transitionTimingFunction; if (e && e !== "ease") ease[e] = (ease[e]||0)+1; } }
      const top = (o) => Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,6);
      return { libs, fonts: { body: body.fontFamily.slice(0,80), size: body.fontSize, lh: body.lineHeight }, h1: h1 ? { size: cs(h1).fontSize, lh: cs(h1).lineHeight, ls: cs(h1).letterSpacing, weight: cs(h1).fontWeight, font: cs(h1).fontFamily.slice(0,60), text: h1.textContent.trim().slice(0,60) } : null, h2: h2 ? { size: cs(h2).fontSize, weight: cs(h2).fontWeight } : null, p: p ? { size: cs(p).fontSize, lh: cs(p).lineHeight } : null, containers: top(widths), transitionDurations: top(dur), animationDurations: top(anim), easings: top(ease), htmlClasses: document.documentElement.className.slice(0,100) };
    });
    // smooth scroll detection: scroll and sample scrollY
    const samples = await page.evaluate(async () => { const out = []; window.scrollTo(0, 0); await new Promise(r=>setTimeout(r,200)); window.dispatchEvent(new WheelEvent("wheel", { deltaY: 600, bubbles: true, cancelable: true })); window.scrollBy(0, 600); for (let i=0;i<10;i++){ await new Promise(r=>requestAnimationFrame(r)); out.push(Math.round(window.scrollY)); } return out; });
    const libScripts = [...scripts].filter((s) => /lenis|gsap|scrolltrigger|framer|motion|webflow|barba|swup|locomotive|split/i.test(s)).map((s) => s.replace(/^https?:\/\//, "").slice(0, 90));
    console.log("\n=== " + url); console.log(JSON.stringify(info, null, 1)); console.log("scroll samples:", samples.join(",")); console.log("lib scripts:", libScripts.join(" | ") || "(none matched)"); console.log("total scripts:", scripts.size);
  } catch (e) { console.log("\n=== " + url + " FAILED: " + e.message.split("\n")[0]); }
  await ctx.close();
}
await browser.close();
