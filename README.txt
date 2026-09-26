# Malago Cloudflare complete

Generated from the Malago Guide workbook.

Verified source:
- GUIDE: 22 actual establishment/activity fiches
- RESSOURCES: 1079 resource rows
- Workbook rows: GUIDE 24 incl. header/section; RESSOURCES 1080 incl. header.

Files:
- worker.js: application and search/AI logic
- data.js: complete GUIDE + complete RESSOURCES
- wrangler.jsonc: verified Cloudflare Workers AI binding

The existing Cloudflare Worker can keep the same name/configuration.
Do not add an OpenAI key for this version.

GitHub:
1. Replace worker.js
2. Create/replace data.js
3. Keep wrangler.jsonc exactly as supplied
4. Commit both changes
5. Cloudflare GitHub build should deploy automatically.

Workers AI is accessed as env.AI.
