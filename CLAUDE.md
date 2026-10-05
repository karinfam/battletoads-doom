# Battletoads Doom

A reskin of Doom 1: the player becomes a Battletoad, playable in multiplayer from a browser link. Three pieces: `toads.wad` (the art), a browser build of Chocolate Doom (`engine/`, a doom-wasm submodule) and a WebSocket router on Cloudflare (`router/`). The full design is in [docs/design.md](docs/design.md). Read it before changing direction.

## Commands

Every target is a Node script in `scripts/`, so `make <target>`, `npm run <target>` and `node scripts/<name>` are the same thing. This Windows machine has no `make`: use `npm run` or `node scripts/...`.

| Command | Does |
| --- | --- |
| `node scripts/setup` | Fresh clone to playable `dist/` in one go: tools, Freedoom, WAD, engine download, site. Skips what exists. |
| `node scripts/fetch-freedoom` | Downloads the pinned Freedoom into `iwads/`. |
| `node scripts/fetch-tools` | Chocolate Doom and DeuTex. Windows: pinned builds into `tools/`. macOS: Homebrew deps and Chocolate Doom, then DeuTex compiled from the pinned source into `tools/deutex/` (Homebrew has no deutex). Linux: use apt. |
| `node scripts/check-assets` | Compares `assets/` to the IWAD's frame list. `--require p0` demands all 69 player lumps. |
| `node scripts/import-art <image> <LUMP>` | Turns an image on a magenta background into Doom-scale art in `assets/`. See [docs/art.md](docs/art.md). |
| `node scripts/build-wad` | Checks assets, then builds `build/toads.wad` with DeuTex. Player lumps without art get labelled placeholders; `--placeholders none` is the strict release build, `--placeholders "p0 TROO"` adds a test imp. |
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
- **Monsters in the browser** are Freedoom's, since Freedoom is the base game there (confirmed by Karin, 3 Oct 2026). Real Doom monsters only appear on desktop with a purchased `doom.wad`.
- **Art comes from an AI generator**, imported through `scripts/import-art` (Karin, 3 Oct 2026). Which generator is still open: Karin wants to see samples first.
- **The look is chosen**: `art-samples/body-pixel.png` (pixel-art toad with shades, spiked wristbands, knee pads, yellow belly) is the reference for all toad art (Karin, 3 Oct 2026). Give it to the generator as the reference image.
- Still open: custom sounds or music.

## Status

- **M0 done.** Freedoom 0.13.0 runs in desktop Chocolate Doom 3.1.1.
- **M1 done.** Placeholder `TROO`, `PLAY`, `PUNG` and `STF*` lumps load under `-merge` with no sprite errors on both `freedoom1.wad` and the purchased `doom.wad`. The imp was seen on screen with Freedoom; with `doom.wad` the face and player sprites were seen, the imp only loaded cleanly.
  - Rotation 0 lumps do replace eight-angle originals: `-merge` drops the IWAD's angled lumps for that frame. No eight-angle fallback needed.
  - DeuTex's default `SS_START`/`SS_END` markers load cleanly. `build-wad --s-end` is there but not needed.
- **M2 done.** The engine compiles in the `engine` GitHub Actions workflow with Emscripten 2.0.23, unmodified. The browser build runs Freedoom with `toads.wad` merged from `node scripts/dev-server`. Seen in the browser: the placeholder face and player sprites. The imp was only looked at on desktop.
- **M3 done.** Two browser tabs joined one room through the local router and saw each other's placeholder player in a co-op game on E1M1.
- **M4 not started.** Needs a Cloudflare account and `DOOM_KEY`; steps are in [docs/deploy.md](docs/deploy.md). The Worker (site + router) passes the router contract under `wrangler dev`; it has never been deployed.
- **M5 started.** No final art. The art pipeline works end to end (`import-art`, palette and player-colour mapping, placeholders for the rest), and two generated samples sit in `art-samples/`. Which generator to use is Karin's call and still open; options are in [docs/art.md](docs/art.md).

To get the engine on a new machine: `gh run download --name engine --dir build/engine` (latest successful `engine` run), then `node scripts/build-site`.

## Findings worth knowing

- The purchased `doom.wad` on this PC comes from Steam: `C:Program Files (x86)SteamsteamappscommonUltimate DoomaseDOOM.WAD`, copied to `iwads/doom.wad`. Use the one in `base`, not `rerelease`. `build-site` refuses any IWAD without a `FREEDOOM` lump.
- In first person a player only ever sees their own status bar face and fist. The `PLAY` body sprites are what other players see, plus the corpse decorations in maps.
- `freedoom1.wad` is 28.8 MB, over Cloudflare's 25 MiB per-file limit for static assets. `build-site` splits big WADs into parts and `site/lobby.js` joins them before the engine starts.
- The engine's build flags (`EXTRA_EXPORTED_RUNTIME_METHODS`) are rejected by current Emscripten, so `engine.emsdk-version` pins a 2021 release. Current Emscripten was not tried.
- `site/lobby.js` is wrapped in one function scope on purpose: the engine script declares globals such as `runtimeInitialized`, and a clashing `const` in the lobby stops the engine from loading.- DeuTex finds an IWAD only by fixed file names. `build-wad` gives it a small `doom.wad` in `build/stage/` holding the chosen IWAD's palette.
- Shareware `doom1.wad` cannot be the base game: the engine refuses any modified game on shareware (`d_main.c`).
