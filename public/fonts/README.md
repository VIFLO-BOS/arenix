# Fonts

The site's fonts are bundled with the project in `src/app/fonts/` and loaded through `next/font/local` in `src/app/layout.tsx`. Nothing is downloaded from Google Fonts at build time or at run time.

| Role | Family | File | Weights |
|---|---|---|---|
| Headings and interface text | Montserrat | `montserrat-latin-wght.woff2` | variable, 500 to 800 |
| Body copy and forms | Roboto | `roboto-latin-wght.woff2` | variable, 400 to 700 |

Both are released under the SIL Open Font License. The licence texts sit next to the font files.

The files were built from the variable fonts in the google/fonts repository and trimmed to Latin and Latin Extended A and B (which include the naira sign), plus arrows and a few interface symbols. To rebuild them, subset the source fonts with fonttools to the same ranges and save as WOFF2.

Bundling replaced `next/font/google` on 1 November 2026, after a Vercel build failed because Turbopack could not resolve the font files Google returned to Vercel's build machine. Bundled fonts make every build independent of Google's response.
