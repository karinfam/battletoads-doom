# Battletoads Doom

A reskin of Doom 1: the player becomes a Battletoad, playable in multiplayer from a browser link. Three pieces: `toads.wad` (the art), a browser build of Chocolate Doom (`engine/`, a doom-wasm submodule) and a WebSocket router on Cloudflare (`router/`). The full design is in [docs/design.md](docs/design.md). Read it before changing direction.

## Commands

Every target is a Node script in `scripts/`, so `make <target>`, `npm run <target>` and `node scripts/<name>` are the same thing. This Windows machine has no `make`: use `npm run` or `node scripts/...`.

| Command | Does |
| --- | --- |
| `node scripts/fetch-freedoom` | Downloads the pinned Freedoom into `iwads/`. |
| `node scripts/fetch-tools` | Windows only: pinned Chocolate Doom and DeuTex into `tools/`. |
| `node scripts/check-assets` | Compares `assets/` to the IWAD's frame list. `--require "PLAY PUNG"` to demand prefixes. |
| `node scripts/build-wad` | Checks assets, then builds `build/toads.wad` with DeuTex. `--placeholders "TROO PLAY"` adds generated test art. |
| `node scripts/run-doom` | Desktop Chocolate Doom with the WAD merged. `--iwad iwads/doom.wad` picks the base game. |
| `node scripts/build-engine` | Compiles `engine/` (needs emcc + bash, or Docker). On this machine use the `engine` GitHub Actions workflow and unpack its artifact into `build/engine/`. |
| `node scripts/build-site` | Assembles `dist/` with hashed WAD names. |
| `node scripts/dev-server` | Local site + router on http://localhost:8000. |
| `npm run dev-worker` | The real Worker under `wrangler dev` (needs `router/.dev.vars`). |
| `npm test` | Unit tests on synthetic data. No game files needed. |
| `node --test smoke/desktop.smoke.js` | Starts the real engine with the WAD for a few seconds. Opens a window. |
| `ROUTER_ORIGIN=<url> node --test smoke/router.smoke.js` | Router contract against a live origin (wrangler dev or production). |
| `powershell -File scripts/win-screenshot.ps1 -Episode 2 -Map 9 -Skill 4` | Saves a PNG of the running game to `build/run/`. E2M9 on skill 4 has imps in view at the start. |

## Rules

- `toads.wad` replaces art lumps by name and nothing else. No gameplay, map, DeHackEd or ZDoom-family changes.
- Load with `-merge`, never `-file`.
- v1 art is single-angle: one rotation 0 PNG per frame (`PLAYA0.png`), truecolour with alpha, in `assets/sprites/`. Graphics such as the status bar face go in `assets/graphics/`. Every PNG needs a line with offsets in `assets/wadinfo.txt`; start from the offsets of the lump it replaces.
- DeuTex treats only fully transparent pixels (alpha 0) as transparent and maps everything else to the nearest PLAYPAL colour. Draw toad skin in the green ramp, palette indices 112 to 127, so the engine recolours it per player.
- Source PNGs are the source of truth. `build/`, `dist/`, `iwads/` and `tools/` are never committed. Never commit or host a purchased `doom.wad`.
- No C changes to the engine are planned. The router's routing logic stays upstream's; the fixes made to it are listed at the top of `router/index.mjs`.
- `DOOM_KEY` is a secret: `wrangler secret put` in production, `router/.dev.vars` locally.
- Keep verification scripts as tests (`test/` for unit tests, `smoke/` for ones that need the real engine or a live router).

## Decisions since the design doc

From the answers under Open questions in the doc (3 Oct 2026):

- **Monsters stay as they are.** Only the player is reskinned: `PLAY`, the status bar face (`STF*`) and the fist (`PUNG`). The P1 enemy list and milestone M6 are dropped. The placeholder imp (`TROO`) is a pipeline test only and must not ship.
- **Weapons** are left as the base game's.
- **Player toad**: whichever is available. **Art**: redrawn at Doom scale, not upscaled.
- **Default mode** is co-op, with deathmatch as a toggle in the lobby.
- **Hosting** is Cloudflare, one Worker for site and router. Domain and account are still open.
- Still open: custom sounds or music, and what "original Doom monsters" means in the browser, where the base game is Freedoom and so shows Freedoom's monsters.

## Status

- **M0 done.** Freedoom 0.13.0 runs in desktop Chocolate Doom 3.1.1.
- **M1 done for Freedoom.** Placeholder `TROO`, `PLAY`, `PUNG` and `STF*` lumps show in game under `-merge` with no sprite errors. Still to do: the same run against a purchased `iwads/doom.wad`.
  - Rotation 0 lumps do replace eight-angle originals: `-merge` drops the IWAD's angled lumps for that frame. No eight-angle fallback needed.
  - DeuTex's default `SS_START`/`SS_END` markers load cleanly. `build-wad --s-end` is there but not needed.
- **M2 and M3 blocked on the engine build.** The site, lobby and local router are written; the router passes its contract test locally and under `wrangler dev`. Nothing has run in a browser yet.
- **M4** needs a Cloudflare account, a domain and `DOOM_KEY`.

## Findings worth knowing

- `freedoom1.wad` is 28.8 MB, over Cloudflare's 25 MiB per-file limit for static assets. `build-site` splits big WADs into parts and `site/lobby.js` joins them before the engine starts.
- The engine's build flags (`EXTRA_EXPORTED_RUNTIME_METHODS`) are rejected by current Emscripten, so `engine.emsdk-version` pins a 2021 release.
- DeuTex finds an IWAD only by fixed file names. `build-wad` gives it a small `doom.wad` in `build/stage/` holding the chosen IWAD's palette.
- Shareware `doom1.wad` cannot be the base game: the engine refuses any modified game on shareware (`d_main.c`).
