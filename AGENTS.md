# Notes for AI agents

## This is not the Next.js you know

This project runs Next.js 16, which has breaking changes in APIs, conventions and file structure compared with older versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code, and heed deprecation notices. For example, request middleware lives in `src/proxy.ts`, and route `params` and `searchParams` are promises.

## Project rules

- Public copy avoids em dashes, en dashes, colons, semicolons and hyphenated words.
- Commit messages carry no co-author trailers or tool credits.
- Never run bulk text replacements over source files. Edit strings deliberately and run `node scripts/qa/syntax-check.mjs src` after any large change.
