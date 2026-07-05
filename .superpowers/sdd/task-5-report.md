Status: DONE

Summary:
- Created `src/icons.js` with the shared `iconSvg(id)`, `setIconLabel(el, icon, label)`, `setIconOnly(el, icon)`, and `setPill(el, icon, text)` helpers from the brief.
- Updated `src/main.js` to import the shared helpers, removed the local icon helper implementations, and switched the level chip to the required `paw` icon.
- Expanded `assets/ui-icons.svg` so every required icon ID from `assets/asset-manifest.json` exists as a real `<symbol id="...">`, reusing shapes where appropriate.
- Updated `index.html` to remove the obsolete `pill-icon` background-image rules and replaced the remaining static coin/cat pill fallback markup with inline SVG icon usage so initial render still shows icons without JS.
- Rebuilt `dist/app.js`.

Verification:
- `test/asset-manifest.test.js` is absent in this worktree, so I manually verified required icon IDs with:
  `node -e 'const fs=require("fs"); const manifest=JSON.parse(fs.readFileSync("assets/asset-manifest.json","utf8")); const svg=fs.readFileSync("assets/ui-icons.svg","utf8"); const missing=manifest.required_icons.filter(id=>!svg.includes(\`id="${id}"\`)); if(missing.length){ console.error("Missing icon ids:", missing.join(", ")); process.exit(1); } console.log("All required icon ids present:", manifest.required_icons.join(", "));'`
- `npm run build` passed.
- `npm test` passed: 17 files, 169 tests.

Commit:
- Intended commit message: `feat: centralize production icons`

Concerns:
- None.
