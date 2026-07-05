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

---

Fix report (post-review):

What I changed
- Bumped the service worker shell cache key in `sw.js` from `nbhsk-shell-v12` to `nbhsk-shell-v13` so the updated app shell assets invalidate correctly.
- Added `test/asset-manifest.test.js` to verify every ID listed in `assets/asset-manifest.json` `required_icons` exists as a real `id="..."` symbol in `assets/ui-icons.svg`.
- Used the new test to cover the reviewer verification gap for the full icon-ID set.

Commands run and outputs
- `npm test -- test/asset-manifest.test.js`
  - Before the fix: failed with `No test files found, exiting with code 1`.
  - After the fix: passed, `1 file, 1 test`.
- `npm test`
  - Passed for the full suite, including `test/asset-manifest.test.js`.
- `npm run build`
  - Skipped. This fix only changes `sw.js`, a test file, and the task report; no `src/` files changed, so `dist/app.js` was not expected to change.

Files changed
- `sw.js`
- `test/asset-manifest.test.js`
- `.superpowers/sdd/task-5-report.md`

Self-review
- Edit scope stayed within the assigned files only.
- The new test is intentionally narrow and limited to the `required_icons` contract, without adding the deferred Task 3+4 coverage.
- The shell cache bump matches the user-facing shell/art changes the reviewer called out.
