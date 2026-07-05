Status: DONE

Summary:
- Updated `drawBackdrop(gy)` in `src/main.js` to prefer `sprite("bg-battle")` when no shop backdrop is equipped, while preserving the existing canvas fallback path.
- Left shop backdrop previews unchanged; `market`, `temple`, and `bamboo` still fall back through `paintBackdrop(...)` when their art is absent or loading.
- Did not modify `index.html` or `src/cat.js`; there is no existing home/profile/shop portrait element to wire in this task.
- Bumped `SHELL` in `sw.js` to `nbhsk-shell-v18` so installed clients can refresh the updated app shell after the rebuilt `dist/app.js`.

Verification:
- `rg -n "bg-\$\{item.id\}|paintBackdrop" src/main.js`
  - Confirmed shop preview still uses `sprite(\`bg-\${item.id}\`)` with `paintBackdrop(...)` fallback.
- `npm test`
  - PASS: 18 files, 173 tests.
- `npm run build`
  - PASS: rebuilt `dist/app.js` successfully.

Concerns:
- None.
