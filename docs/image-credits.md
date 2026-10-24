# Image credits and replacement guide

The public site uses stock photography as hero backdrops and as topic images in sections until areniX supplies its own photography. Portfolio cards never use stock imagery as if it were the product. A project without an approved screenshot shows a dimmed stock photograph clearly labelled "Stock photograph, not the product".

## Source and licence

All photographs come from Unsplash and are used under the Unsplash License, which permits free commercial use without attribution. The original photo IDs are recorded next to each key in `src/content/images.ts`, and the files are stored locally in `public/images/stock/` as 1920px WebP so the site never hotlinks a third party CDN.

Regenerate or refresh the set with

```
node scripts/fetch-stock-images.mjs --force
```

## Replacing a photo with your own

1. Export your photograph as WebP or JPEG, at least 1920px wide for hero backdrops and 1200px wide for section images.
2. Save it over the file with the matching key in `public/images/stock/` (for example `hero-home.webp`), or add a new key to `src/content/images.ts` with an honest alt text.
3. Restart `npm run dev`. Every section that references the key picks up the new file.

## Where each key is used

| Key | Used on |
|---|---|
| hero-home, hero-services, hero-work, hero-about, hero-solutions, hero-technologies, hero-process, hero-contact, hero-insights, hero-lab, hero-careers, hero-booking, hero-start, hero-legal | Full bleed hero backdrops with a navy gradient overlay |
| custom-software, websites, saas, enterprise, mobile, design, integration, cloud | Service tiles, service detail heroes and the pinned visual on the services page |
| education, healthcare, retail, workforce, hospitality, startups | Industry switcher, solution detail heroes and fallbacks |
| consulting, planning, design, server, code, analytics, meeting, cta | Process timeline steps (in order), CTA panel, technology section |
| team, office, writing, payments, phone, lab | About preview, media placeholder, insights covers, integrations, lab experiments |
