---
phase: 03-pwa-visual-polish
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/package.json
  - frontend/public/icons/pwa-192.png
  - frontend/public/icons/pwa-512.png
  - frontend/public/icons/pwa-maskable-512.png
  - frontend/public/favicon.ico
  - frontend/public/favicon-32.png
  - frontend/public/icons.svg
  - .gitignore
autonomous: true
requirements:
  - APP-01

must_haves:
  truths:
    - "frontend/public/icons/ directory contains pwa-192.png, pwa-512.png, and pwa-maskable-512.png after running generate-pwa-assets"
    - "frontend/public/favicon.ico and frontend/public/favicon-32.png exist as browser-tab fallbacks"
    - "frontend/public/icons.svg is deleted from the working tree and from git tracking"
    - "frontend/dev-dist/ is listed in .gitignore so vite-plugin-pwa dev output never leaks into the repo"
    - "npm install completes without errors; vite-plugin-pwa and @vite-pwa/assets-generator appear in node_modules"
  artifacts:
    - path: "frontend/public/icons/pwa-192.png"
      provides: "192×192 install-prompt and home-screen icon (purpose: any)"
    - path: "frontend/public/icons/pwa-512.png"
      provides: "512×512 splash-screen and app-drawer icon (purpose: any)"
    - path: "frontend/public/icons/pwa-maskable-512.png"
      provides: "512×512 adaptive-icon with auto-pad safe-area inset (purpose: maskable)"
    - path: "frontend/public/favicon.ico"
      provides: "Multi-resolution ICO for legacy browser tab fallback"
    - path: "frontend/public/favicon-32.png"
      provides: "32×32 PNG for modern browser tab"
  key_links:
    - from: "frontend/package.json scripts.generate-pwa-assets"
      to: "frontend/public/icons/"
      via: "pwa-assets-generator CLI"
      pattern: "pwa-assets-generator --preset minimal-2023 public/favicon.svg"
    - from: "frontend/public/favicon.svg"
      to: "frontend/public/icons/pwa-*.png"
      via: "@vite-pwa/assets-generator headless-browser rasterization"
      pattern: "favicon.svg → pwa-192.png, pwa-512.png, pwa-maskable-512.png"
---

<objective>
Install PWA tooling dependencies, generate all icon assets from the existing VUT favicon SVG, clean up dead assets, and gate-keep the dev build directory from git.

Purpose: Plan 02 (PWA wiring) references `/icons/pwa-192.png`, `/icons/pwa-512.png`, and `/icons/pwa-maskable-512.png` in the manifest icons array. These files must exist in `frontend/public/icons/` before building — an absent icon file does not fail the build but produces an installability gap (Chromium's "Add to App" prompt requires all declared icon URLs to resolve). Generating and committing the assets in this plan keeps the feat(pwa) commit in Plan 02 self-contained and verifiable.

Split rationale: Separating asset generation from PWA wiring follows D-13 (atomic commit per feature). This plan produces a clean `chore`-level commit (new binary assets + dead-code deletion + gitignore); Plan 02 produces the `feat(pwa)` commit. Reviewers can verify icon files independently of the vite config.

Output:
- `frontend/package.json` updated with two new devDependencies and one new script
- `frontend/public/icons/` directory with three PNG icon files
- `frontend/public/favicon.ico` and `frontend/public/favicon-32.png` (browser-tab fallbacks)
- `frontend/public/icons.svg` deleted from git
- `.gitignore` updated with `frontend/dev-dist/`
- All files committed: `chore(pwa): install vite-plugin-pwa deps and generate icons from favicon.svg`
</objective>

<execution_context>
@/home/pippa-sofine/.claude/get-shit-done/workflows/execute-plan.md
@/home/pippa-sofine/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-pwa-visual-polish/03-CONTEXT.md
@.planning/phases/03-pwa-visual-polish/03-RESEARCH.md
@.planning/phases/03-pwa-visual-polish/03-PATTERNS.md

<interfaces>
<!-- Key excerpts the executor needs. No codebase exploration required. -->

From frontend/package.json (current — MODIFY this file):
```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/node": "^24.12.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.58.0",
    "vite": "^8.0.4"
  }
}
```

From .gitignore (current — MODIFY this file):
```
__pycache__/
*.pyc
*.pyo
venv/
# secrets — never commit
.env
# SQLite DB + WAL/SHM — local data, never commit
bingo.db*
node_modules/
frontend/dist/
*.log
.DS_Store
.claude/
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add PWA dependencies and generate-pwa-assets script to package.json, then install</name>
  <files>frontend/package.json</files>
  <read_first>
    - frontend/package.json (current state — shown in interfaces block above)
    - .planning/phases/03-pwa-visual-polish/03-RESEARCH.md §"Toolchain & Versions" (version pins)
    - .planning/phases/03-pwa-visual-polish/03-PATTERNS.md §"frontend/package.json (MODIFY)" (exact diff pattern)
  </read_first>
  <action>
Edit `frontend/package.json` to add two devDependencies and one script. Make these exact changes:

**scripts** — add `"generate-pwa-assets"` between `"build"` and `"lint"`:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "generate-pwa-assets": "pwa-assets-generator --preset minimal-2023 public/favicon.svg",
  "lint": "eslint .",
  "preview": "vite preview"
},
```

**devDependencies** — add two entries after `"vite": "^8.0.4"`:
```json
"vite-plugin-pwa": "^1.3.0",
"@vite-pwa/assets-generator": "^1.0.2"
```

Version rationale: `vite-plugin-pwa` 1.3.0 is the first version with `"vite": "^8.0.0"` in peerDependencies (released 2026-05-05); earlier versions would produce a peer-dep conflict on the project's Vite 8.0.4. `@vite-pwa/assets-generator` 1.0.2 is stable and compatible with vite-plugin-pwa ^1.0.0.

After editing package.json, run `npm install` from the `frontend/` directory:
```bash
cd /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend && npm install
```

Confirm no peer-dep errors in the output. A clean install produces lines like `added N packages` with no `ERR!` or `WARN: peer` lines for vite.
  </action>
  <verify>
    <automated>cd /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend && grep '"vite-plugin-pwa"' package.json && grep '"@vite-pwa/assets-generator"' package.json && grep '"generate-pwa-assets"' package.json && ls node_modules/vite-plugin-pwa 2>/dev/null | head -3 && ls node_modules/@vite-pwa/assets-generator 2>/dev/null | head -3</automated>
  </verify>
  <acceptance_criteria>
    - `frontend/package.json` contains `"vite-plugin-pwa": "^1.3.0"` in devDependencies
    - `frontend/package.json` contains `"@vite-pwa/assets-generator": "^1.0.2"` in devDependencies
    - `frontend/package.json` contains `"generate-pwa-assets": "pwa-assets-generator --preset minimal-2023 public/favicon.svg"` in scripts
    - `frontend/node_modules/vite-plugin-pwa` directory exists
    - `frontend/node_modules/@vite-pwa/assets-generator` directory exists
    - `npm install` produced no `ERR!` or peer-vite conflict warnings
  </acceptance_criteria>
  <done>Dependencies installed and script wired; npm reports clean install with no peer conflicts.</done>
</task>

<task type="auto">
  <name>Task 2: Generate PWA icon assets, delete icons.svg, update .gitignore, commit</name>
  <files>
    frontend/public/icons/pwa-192.png
    frontend/public/icons/pwa-512.png
    frontend/public/icons/pwa-maskable-512.png
    frontend/public/favicon.ico
    frontend/public/favicon-32.png
    frontend/public/icons.svg
    .gitignore
  </files>
  <read_first>
    - .planning/phases/03-pwa-visual-polish/03-CONTEXT.md §"D-01, D-02, D-03, D-04, D-08, D-09, D-13" (icon source, generator, auto-pad, files to produce, deletion of icons.svg, commit subject)
    - .planning/phases/03-pwa-visual-polish/03-RESEARCH.md §"Asset Generation (Icon Workflow)" (CLI invocation, output files, maskable auto-pad behaviour)
    - .planning/phases/03-pwa-visual-polish/03-PATTERNS.md §"New Asset Files" and §"frontend/public/icons.svg (DELETE)" and §"frontend/.gitignore (MODIFY)"
    - .gitignore (current state — shown in interfaces block above)
  </read_first>
  <action>
**Step 1 — Run icon generator.**

Run from `frontend/`:
```bash
cd /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend && npm run generate-pwa-assets
```

The `@vite-pwa/assets-generator` CLI uses `public/favicon.svg` (the VUT brand mark, fill `#863bff`) as its single source. With `--preset minimal-2023` it produces:
- `public/icons/pwa-192.png` — 192×192, purpose: "any"
- `public/icons/pwa-512.png` — 512×512, purpose: "any"
- `public/icons/pwa-maskable-512.png` — 512×512, 15% safe-area auto-pad, purpose: "maskable"
- `public/favicon.ico` — multi-resolution ICO (browser-tab fallback)
- `public/favicon-32.png` — 32×32 PNG (modern browser tab)

If the generator writes to a different output path (e.g., `public/` flat instead of `public/icons/`), verify by running `ls public/` and `ls public/icons/` after the command. The preset `minimal-2023` targets `public/icons/` for PWA-specific sizes and the public root for favicon variants.

**Step 2 — Verify output files exist.**
```bash
ls /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/icons/
```
Expected: `pwa-192.png pwa-512.png pwa-maskable-512.png`

**Step 3 — Delete icons.svg.**

`frontend/public/icons.svg` is an unused social-network icon sprite (~5KB). Zero consumers confirmed via grep. Delete it from the working tree:
```bash
git -C /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo rm frontend/public/icons.svg
```
(Use `git rm` rather than plain `rm` so git stages the deletion atomically.)

**Step 4 — Update .gitignore.**

Add `frontend/dev-dist/` to `.gitignore` (one line, after `frontend/dist/`). Current `.gitignore` has `frontend/dist/` on line 10. Add the new line directly after it:

New block around that line:
```
node_modules/
frontend/dist/
frontend/dev-dist/
*.log
```

This prevents `vite-plugin-pwa`'s dev-mode output directory from ever being accidentally committed (per RESEARCH.md Pitfall 6).

**Step 5 — Commit.**

Stage explicitly (never `git add -A`):
```bash
git -C /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo add \
  frontend/package.json \
  frontend/package-lock.json \
  frontend/public/icons/pwa-192.png \
  frontend/public/icons/pwa-512.png \
  frontend/public/icons/pwa-maskable-512.png \
  frontend/public/favicon.ico \
  frontend/public/favicon-32.png \
  .gitignore
```

Then commit:
```bash
git -C /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo commit -m "chore(pwa): install vite-plugin-pwa deps and generate icons from favicon.svg"
```

Note: `frontend/public/icons.svg` was already staged by `git rm` in Step 3; it will be included automatically. Confirm with `git status` before committing that only the intended files are staged.
  </action>
  <verify>
    <automated>
ls /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/icons/pwa-192.png \
   /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/icons/pwa-512.png \
   /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/icons/pwa-maskable-512.png \
   /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/favicon.ico \
   /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/favicon-32.png 2>&1 && \
grep 'frontend/dev-dist' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/.gitignore && \
test ! -f /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/icons.svg && echo "icons.svg gone" && \
git -C /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo log --oneline -1
    </automated>
  </verify>
  <acceptance_criteria>
    - `frontend/public/icons/pwa-192.png` exists and is a non-zero PNG file
    - `frontend/public/icons/pwa-512.png` exists and is a non-zero PNG file
    - `frontend/public/icons/pwa-maskable-512.png` exists and is a non-zero PNG file
    - `frontend/public/favicon.ico` exists and is a non-zero ICO file
    - `frontend/public/favicon-32.png` exists and is a non-zero PNG file
    - `frontend/public/icons.svg` does NOT exist in the working tree
    - `.gitignore` contains the line `frontend/dev-dist/`
    - `git log --oneline -1` shows commit message `chore(pwa): install vite-plugin-pwa deps and generate icons from favicon.svg`
    - `git status` shows clean working tree after commit
  </acceptance_criteria>
  <done>All icon PNG/ICO files generated from favicon.svg, icons.svg deleted, dev-dist gitignored, and changes committed cleanly.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → local devDependencies | Packages fetched from registry during `npm install`; only affects build-time tooling, not the served app |
| generator CLI → public/ asset files | `@vite-pwa/assets-generator` writes PNG/ICO files to `public/`; these become static assets served by FastAPI |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01-01 | Tampering | npm install (supply chain) | accept | Family-LAN private app; packages are from the official vite-plugin-pwa project org (same maintainer as Vite ecosystem). Risk level: low. If supply-chain integrity matters in future (public release), add `npm ci` + lockfile pinning in CI. |
| T-03-01-02 | Information Disclosure | `manifest.webmanifest` (generated in Plan 02) | accept | Manifest is intentionally public-readable; it contains no secrets, no LAN-internal URLs, no credentials. `start_url: "/"`, `scope: "/"` are origin-relative — no internal hostnames. Family-LAN context lowers residual risk to negligible. |
| T-03-01-03 | Tampering | Generated icon files committed to git | accept | Binary PNG/ICO files are generated deterministically from `favicon.svg` using a pinned CLI version. Regeneration reproduces identical output. No integrity risk beyond the npm supply chain (covered by T-03-01-01). |
</threat_model>

<verification>
After both tasks complete and commit lands, verify plan-level must-haves:

```bash
# Icon files all present
ls /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/icons/
# Expected: pwa-192.png pwa-512.png pwa-maskable-512.png

# Favicon fallbacks present
ls /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/favicon.ico \
   /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/favicon-32.png

# icons.svg gone
test ! -f /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/icons.svg && echo "PASS: icons.svg deleted"

# dev-dist gitignored
grep 'frontend/dev-dist' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/.gitignore && echo "PASS: dev-dist gitignored"

# PWA packages installed
ls /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/node_modules/vite-plugin-pwa/package.json
ls /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/node_modules/@vite-pwa/assets-generator/package.json

# Clean git state
git -C /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo status
```

**UAT (manual, Chromium DevTools):** Icons are not visible in the browser until the manifest is wired in Plan 02 and a build is run. No browser verification in this plan.
</verification>

<success_criteria>
- `npm install` completes with no peer-dependency errors (vite-plugin-pwa 1.3.0 is compatible with Vite 8.0.4)
- `npm run generate-pwa-assets` produces `frontend/public/icons/pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`, `favicon.ico`, `favicon-32.png`
- `frontend/public/icons.svg` is deleted from git (dead code, zero consumers)
- `.gitignore` includes `frontend/dev-dist/`
- Commit `chore(pwa): install vite-plugin-pwa deps and generate icons from favicon.svg` is on branch `claude/resume-ai-app-ClIA9`
- `git status` is clean after commit
</success_criteria>

<output>
After completion, create `.planning/phases/03-pwa-visual-polish/03-01-SUMMARY.md` following the summary template.
</output>
