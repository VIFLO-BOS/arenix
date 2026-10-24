# Fonts

The site uses two Google fonts, self hosted at build time through `next/font` in `src/app/layout.tsx`.

| Role | Family | Weights |
|---|---|---|
| Headings and interface text | Montserrat | 500, 600, 700, 800 |
| Body copy and forms | Roboto | 400, 500, 700 |

No font files need to be added to this folder. To change a family, edit the two `next/font/google` imports in `src/app/layout.tsx` and the `--font-display` and `--font-sans` tokens in `src/app/globals.css`.

If a licensed custom font is wanted later, add its WOFF2 files here, declare an `@font-face` in `globals.css` with a `url()` source only (never `local()`, which lets a visitor's installed fonts leak in), and put the family name first in the matching token.
