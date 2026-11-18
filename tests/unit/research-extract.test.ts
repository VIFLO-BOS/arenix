import { describe, expect, it } from "vitest";
import { classifyPage, detectPlaceholderPage, extractPage, legacyTechnology } from "@/server/research/extract";
import { crawlDelaySeconds, isAllowed, parseRobots, rulesForStatus } from "@/server/research/robots";

// Fixtures describe fictional businesses only. They are test inputs and never shown in the app.

const WORDPRESS_HOME = `<!doctype html><html><head>
<title>Bright Path Logistics | Courier and Haulage in Ibadan</title>
<meta name="description" content="Bright Path Logistics moves parcels and freight across Oyo State.">
<meta name="generator" content="WordPress 5.8.1">
<meta property="og:site_name" content="Bright Path Logistics">
<link rel="stylesheet" href="/wp-content/themes/bp/vendor/bootstrap-3.3.7/css/bootstrap.min.css">
<link rel="stylesheet" href="/wp-content/plugins/forms/assets/bootstrap.min.css?ver=8.0.6">
<script src="/wp-includes/js/jquery/jquery.min.js?ver=1.12.4"></script>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"LocalBusiness","name":"Bright Path Logistics Ltd","telephone":"+234 803 123 4567","email":"info@brightpathlogistics.ng","address":{"@type":"PostalAddress","streetAddress":"12 Ring Road","addressLocality":"Ibadan","addressRegion":"Oyo","addressCountry":"NG"},"sameAs":["https://www.instagram.com/brightpathng"],"founder":{"@type":"Person","name":"Ada Obi","jobTitle":"Managing Director"}}]}</script>
<script>var phone = "08099999999";</script>
<style>.x{content:"0802 222 2222"}</style>
</head><body>
<nav><a href="/">Home</a><a href="/about-us/">About us</a><a href="/our-team">Our team</a><a href="/services/">Services</a><a href="/contact">Contact</a><a href="/brochure.pdf">Brochure</a><a href="https://othersite.ng/">Partner</a></nav>
<main>
<h1>Fast delivery across Oyo State</h1>
<p>Call us on 0803 123 4567 or 0705-555-1234. Head office Tel: 01 234 5678.</p>
<p>Email sales [at] brightpathlogistics [dot] ng for quotes. Founded 2012, RC 1234567, fees from N25,000,000.</p>
<p>Order ref 2024-11-05. Account 0123456789012345.</p>
<a href="mailto:Info@BrightPathLogistics.ng">Email us</a>
<a href="tel:+2348031234567">Call</a>
<a href="https://wa.me/2348031234567?text=Hello">Chat on WhatsApp</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=x">Share</a>
<a href="https://www.facebook.com/brightpathng/">Facebook</a>
<a href="https://twitter.com/intent/tweet?text=x">Tweet</a>
<a href="https://www.linkedin.com/company/bright-path-logistics/">LinkedIn</a>
<p>We are hiring a dispatch rider and an IT support officer. Join our team today.</p>
</main>
<footer><p>&copy; 2015 - 2019 Bright Path Logistics. All rights reserved.</p></footer>
</body></html>`;

const TEAM_PAGE = `<html><head><title>Our team</title></head><body>
<section class="team">
  <div class="card"><h3>Ada Obi</h3><p>Managing Director</p><a href="https://www.linkedin.com/in/ada-obi-000/">LinkedIn</a></div>
  <div class="card"><h3>Tunde Bakare</h3><p>Head of Operations</p></div>
  <div class="card"><h3>Our Values</h3><p>Customers first</p></div>
  <p>Kemi Ade, Chief Finance Officer</p>
</section></body></html>`;

const SERVICES_PAGE = `<html><head><title>Services</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>
<header><nav class="main-nav"><ul><li>Home</li><li>Contact</li></ul></nav></header>
<main><h1>Our services</h1><h2>Same day courier</h2><h2>Interstate haulage</h2><ul><li>Warehousing</li><li>Fleet management</li></ul></main>
<footer><ul><li>Privacy policy</li></ul></footer>
</body></html>`;

const CAREERS_PAGE = `<html><body><h1>Careers</h1><h2>Accounts Officer</h2><h2>Web Developer</h2><h3>Delivery Driver</h3></body></html>`;

describe("extractPage", () => {
  const x = extractPage(WORDPRESS_HOME, "https://www.brightpathlogistics.ng/");

  it("reads the title, description and site name", () => {
    expect(x.title).toMatch(/^Bright Path Logistics/);
    expect(x.description).toMatch(/parcels and freight/);
    expect(x.siteName).toBe("Bright Path Logistics");
  });

  it("reads emails from links, JSON LD and obfuscated text", () => {
    expect(x.emails).toEqual(expect.arrayContaining(["info@brightpathlogistics.ng", "sales@brightpathlogistics.ng"]));
    expect(new Set(x.emails).size).toBe(x.emails.length);
  });

  it("reads phone numbers but not years, dates, registration numbers, prices or code", () => {
    const digits = x.phones.map((p) => p.replace(/\D/g, ""));
    expect(digits).toEqual(expect.arrayContaining(["2348031234567", "07055551234", "012345678"]));
    expect(digits.some((d) => d.includes("1234567") && d.length === 7)).toBe(false);
    expect(digits.some((d) => d.startsWith("2024"))).toBe(false);
    expect(digits).not.toContain("08099999999");
    expect(digits).not.toContain("08022222222");
    expect(digits.some((d) => d.length > 15)).toBe(false);
  });

  it("reads WhatsApp numbers and social profiles, skipping share links", () => {
    expect(x.whatsapp).toEqual(["+2348031234567"]);
    const urls = x.socials.map((s) => s.url);
    expect(x.socials.map((s) => s.platform).sort()).toEqual(["facebook", "instagram", "linkedin"]);
    expect(urls.some((u) => u.includes("sharer") || u.includes("intent"))).toBe(false);
  });

  it("reads people from JSON LD", () => {
    expect(x.people).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Ada Obi", title: "Managing Director" })]));
  });

  it("keeps internal links only, without files", () => {
    const urls = x.internalLinks.map((l) => l.url);
    expect(urls).toContain("https://www.brightpathlogistics.ng/about-us/");
    expect(urls.some((u) => u.endsWith(".pdf"))).toBe(false);
    expect(urls.some((u) => u.includes("othersite"))).toBe(false);
  });

  it("detects technology, legacy versions and the copyright year", () => {
    expect(x.technology).toEqual(expect.arrayContaining(["WordPress 5.8.1", "jQuery 1.12.4", "Bootstrap 3.3.7"]));
    expect(legacyTechnology(x.technology).sort()).toEqual(["Bootstrap 3.3.7", "WordPress 5.8.1", "jQuery 1.12.4"].sort());
    expect(x.copyrightYear).toBe(2019);
    expect(x.hasViewport).toBe(false);
  });

  it("lists the assets the page loads and the accessibility basics", () => {
    const page = extractPage(
      `<html lang="en"><head><title>T</title><link rel="stylesheet" href="/a.css"><link rel="icon" href="/f.ico"><script src="https://cdn.example.net/x.js"></script></head>
       <body><h1>One</h1><h1>Two</h1><img src="/logo.png" alt="Logo"><img src="/hero.jpg"><img src="/line.svg" alt=""><img src="data:image/png;base64,AAAA"></body></html>`,
      "https://brightpath.ng/",
    );
    expect(page.assets).toEqual([
      { kind: "script", url: "https://cdn.example.net/x.js" },
      { kind: "style", url: "https://brightpath.ng/a.css" },
      { kind: "image", url: "https://brightpath.ng/logo.png" },
      { kind: "image", url: "https://brightpath.ng/hero.jpg" },
      { kind: "image", url: "https://brightpath.ng/line.svg" },
    ]);
    expect(page).toMatchObject({ htmlLang: "en", h1Count: 2, images: 4, imagesWithoutAlt: 2 });
  });

  it("reads hiring notices and the JSON LD address", () => {
    expect(x.hiring.join(" ")).toMatch(/hiring/i);
    expect(x.address).toMatchObject({ city: "Ibadan", region: "Oyo", country: "NG" });
  });

  it("reads team cards with titles and LinkedIn links, and skips headings that are not names", () => {
    const t = extractPage(TEAM_PAGE, "https://brightpathlogistics.ng/our-team");
    const names = t.people.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["Ada Obi", "Tunde Bakare", "Kemi Ade"]));
    expect(names).not.toContain("Our Values");
    expect(t.people.find((p) => p.name === "Ada Obi")?.linkedinUrl).toBe("https://www.linkedin.com/in/ada-obi-000");
    expect(t.people.find((p) => p.name === "Kemi Ade")?.title).toBe("Chief Finance Officer");
  });

  it("reads services without navigation and footer noise", () => {
    const s = extractPage(SERVICES_PAGE, "https://brightpathlogistics.ng/services/");
    expect(s.offerings).toEqual(expect.arrayContaining(["Same day courier", "Interstate haulage", "Warehousing"]));
    expect(s.offerings).not.toContain("Home");
    expect(s.offerings).not.toContain("Privacy policy");
    expect(s.hasViewport).toBe(true);
  });

  it("lists jobs from a careers page", () => {
    const c = extractPage(CAREERS_PAGE, "https://brightpathlogistics.ng/careers");
    expect(c.hiring.join(" ")).toMatch(/Careers page lists Accounts Officer, Web Developer, Delivery Driver/);
  });

  it("never throws on malformed HTML", () => {
    const m = extractPage("<html><body><div><p>Broken <a href='mailto:a@b.ng'>x</div><<<>>></body", "https://b.ng/");
    expect(m.emails).toEqual(["a@b.ng"]);
    expect(() => extractPage("", "not a url")).not.toThrow();
  });
});

describe("page helpers", () => {
  it("classifies research pages", () => {
    expect(classifyPage("https://a.ng/about-us/")).toBe("about");
    expect(classifyPage("https://a.ng/about/our-team")).toBe("team");
    expect(classifyPage("https://a.ng/p?id=4", "Contact us")).toBe("contact");
    expect(classifyPage("https://a.ng/careers")).toBe("careers");
    expect(classifyPage("https://a.ng/what-we-do")).toBe("services");
    expect(classifyPage("https://a.ng/blog/post-1")).toBeNull();
    expect(classifyPage("https://a.ng/services.pdf")).toBeNull();
  });

  it("spots parked, default and suspended pages", () => {
    expect(detectPlaceholderPage({ title: "brightpath.ng", text: "This domain is for sale. Buy this domain today." })).toBe("parked");
    expect(detectPlaceholderPage({ title: "Apache2 Ubuntu Default Page: It works", text: "" })).toBe("default_server_page");
    expect(detectPlaceholderPage({ title: "Account Suspended", text: "" })).toBe("suspended");
    expect(detectPlaceholderPage({ title: "Coming soon", text: "Our new website is coming soon." })).toBeNull();
    expect(detectPlaceholderPage({ title: "Bright Path", text: "x".repeat(3000) + " this domain is for sale" })).toBeNull();
  });
});

describe("robots.txt", () => {
  const robots = parseRobots(["﻿User-agent: *", "Disallow: /private", "Allow: /private/open", "Disallow: /*.php$", "Crawl-delay: 2", "", "# our bot", "User-agent: AreniXResearchBot", "User-agent: otherbot", "Disallow: /no-bots", "Crawl-delay: 120", "", "User-agent: areniXResearchBot", "Disallow: /also"].join("\r\n"));

  it("uses the group for our token and merges repeated groups", () => {
    expect(isAllowed(robots, "/no-bots/page")).toBe(false);
    expect(isAllowed(robots, "/also")).toBe(false);
    // The * group does not apply once a specific group exists.
    expect(isAllowed(robots, "/private")).toBe(true);
    expect(crawlDelaySeconds(robots)).toBe(30);
  });

  it("falls back to the * group for other agents", () => {
    expect(isAllowed(robots, "/private/x", "SomeBot")).toBe(false);
    expect(isAllowed(robots, "/private/open/page", "SomeBot")).toBe(true);
    expect(isAllowed(robots, "/index.php", "SomeBot")).toBe(false);
    expect(isAllowed(robots, "/index.php?x=1", "SomeBot")).toBe(true);
    expect(crawlDelaySeconds(robots, "SomeBot")).toBe(2);
  });

  it("lets Allow win a tie and treats an empty Disallow as allow all", () => {
    expect(isAllowed(parseRobots("User-agent: *\nDisallow: /a\nAllow: /a"), "/a")).toBe(true);
    expect(isAllowed(parseRobots("User-agent: *\nDisallow:"), "/anything")).toBe(true);
    expect(isAllowed(parseRobots("User-agent: *\nDisallow: /"), "/robots.txt")).toBe(true);
    expect(isAllowed(parseRobots("User-agent: *\nDisallow: /"), "/")).toBe(false);
  });

  it("follows the status rules", () => {
    expect(isAllowed(rulesForStatus(404, ""), "/x")).toBe(true);
    expect(isAllowed(rulesForStatus(503, ""), "/x")).toBe(false);
    expect(isAllowed(rulesForStatus(429, ""), "/x")).toBe(false);
    expect(isAllowed(rulesForStatus(0, ""), "/x")).toBe(false);
    expect(isAllowed(rulesForStatus(200, "User-agent: *\nDisallow: /x"), "/x")).toBe(false);
  });
});
