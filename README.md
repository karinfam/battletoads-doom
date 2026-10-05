# Battletoads Doom

Doom 1 with the player redrawn as a Battletoad, playable in co-op or deathmatch from a browser link.

Three pieces make it up:

- **`toads.wad`**, built from the PNGs in `assets/`. It replaces the player sprites, the status bar face and the fist, and nothing else. No gameplay, map or engine changes.
- **A browser build of Chocolate Doom**, from the `engine/` submodule (Cloudflare's [doom-wasm](https://github.com/cloudflare/doom-wasm)), compiled to WebAssembly.
- **A WebSocket router** in `router/`, a Cloudflare Worker that also serves the site. It passes game packets between players in a room.

The base game is [Freedoom](https://freedoom.github.io/), so nothing purchased is needed. On desktop you can also play on a purchased `doom.wad`.

The design is in [docs/design.md](docs/design.md). Art workflow: [docs/art.md](docs/art.md). Deploying: [docs/deploy.md](docs/deploy.md).

## Prerequisites

- **Node.js 22** (the version the CI uses) and npm.
- **Chocolate Doom** and **DeuTex**, for desktop play and for building the WAD.
  - macOS: `brew install chocolate-doom deutex`
  - Debian/Ubuntu: `sudo apt install chocolate-doom deutex`
  - Windows: `node scripts/fetch-tools` downloads pinned builds into `tools/`.
- **GitHub CLI (`gh`)**, only to download the prebuilt engine without compiling it.
- **Emscripten or Docker**, only if you want to compile the engine yourself.

Every command below is a Node script in `scripts/`. `make <target>`, `npm run <target>` and `node scripts/<name>` do the same thing, so pick whichever you have. The commands are written as `node scripts/...` because that works everywhere, including Windows without `make`.

## Setup

Clone with the engine submodule and install dependencies:

```bash
git clone --recurse-submodules https://github.com/karinfam/battletoads-doom.git
cd battletoads-doom
npm install
```

If you already cloned without the submodule:

```bash
git submodule update --init
```

Download Freedoom into `iwads/`:

```bash
node scripts/fetch-freedoom
```

## Play in the browser (multiplayer)

1. **Build the WAD** from the art in `assets/`. Player frames without art yet get labelled placeholder boxes, so the build always covers the whole player:

   ```bash
   node scripts/build-wad
   ```

2. **Get the engine.** The easiest way is to download the latest build from the `engine` GitHub Actions workflow:

   ```bash
   gh run download --name engine --dir build/engine
   ```

   To compile it yourself instead, with `emcc` and `bash` on your PATH or with Docker installed:

   ```bash
   node scripts/build-engine
   ```

3. **Assemble the site** into `dist/`:

   ```bash
   node scripts/build-site
   ```

4. **Start the local server**, which serves `dist/` and runs an in-memory copy of the router on one port:

   ```bash
   node scripts/dev-server
   ```

   Open http://localhost:8000, click Start Multiplayer, and open the invite link in a second tab to play against yourself. Co-op is the default; deathmatch is a toggle in the lobby.

To run the real Cloudflare Worker locally instead of the Node stand-in, put a `DOOM_KEY=<random string>` line in `router/.dev.vars` and run:

```bash
npm run dev-worker
```

## Play on the desktop

After `node scripts/build-wad`, run desktop Chocolate Doom with the WAD merged:

```bash
node scripts/run-doom
```

It starts on E1M1. Extra engine arguments go after `--`, for example `node scripts/run-doom -- -warp 2 9 -skill 4`. To use a purchased Doom instead of Freedoom, copy it to `iwads/doom.wad` and pass `--iwad iwads/doom.wad`. Never commit or host that file.

## Changing the art

Source PNGs in `assets/sprites/` and `assets/graphics/` are the source of truth. Each is a single-angle, truecolour PNG with alpha, named after the Doom lump it replaces (`PLAYA0.png`), with an offsets line in `assets/wadinfo.txt`. To import a generated image on a magenta background:

```bash
node scripts/import-art <image> <LUMP>
```

Then check what is still missing and rebuild:

```bash
node scripts/check-assets
node scripts/build-wad
```

The rules that matter (green palette ramp for toad skin, offsets, `-merge` not `-file`) are explained in [docs/art.md](docs/art.md).

## Tests

Unit tests run on synthetic data and need no game files:

```bash
npm test
```

Smoke tests need the real thing:

```bash
# Starts desktop Chocolate Doom with the WAD for a few seconds. Opens a window.
node --test smoke/desktop.smoke.js

# Router contract against a live origin (wrangler dev or production).
ROUTER_ORIGIN=http://localhost:8787 node --test smoke/router.smoke.js
```

## Deploying

One Worker serves the site and the router. `npm run deploy` builds `dist/` and publishes it with Wrangler. The first deploy and the `DOOM_KEY` secret are walked through in [docs/deploy.md](docs/deploy.md).

## Layout

| Path | What |
| --- | --- |
| `assets/` | Source PNGs and `wadinfo.txt`. The only art that is committed. |
| `art-samples/` | Reference images for the toad look. |
| `scripts/` | Every build and run command. |
| `site/` | The lobby page, script and engine config copied into `dist/`. |
| `router/` | The Cloudflare Worker and its `wrangler.toml`. |
| `engine/` | The doom-wasm submodule. Not modified. |
| `test/`, `smoke/` | Unit tests and tests that need the engine or a live router. |
| `docs/` | Design, art and deploy guides. |
| `build/`, `dist/`, `iwads/`, `tools/` | Generated or downloaded. Never committed. |

## Licences

The engine is Chocolate Doom under GPL-2.0, which is why the hosted page links back to this repository. The router and dev server are ported from [cloudflare/doom](https://github.com/cloudflare/doom) under BSD-3-Clause; see `router/LICENSE-cloudflare` and `site/LICENSE-cloudflare`. Freedoom is under its own BSD-style licence.
