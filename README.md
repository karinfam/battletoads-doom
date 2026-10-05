# Battletoads Doom

Doom 1 with the player redrawn as a Battletoad, playable in co-op or deathmatch from a browser link.

Three pieces make it up:

- **`toads.wad`**, built from the PNGs in `assets/`. It replaces the player sprites, the status bar face and the fist, and nothing else. No gameplay, map or engine changes.
- **A browser build of Chocolate Doom**, from the `engine/` submodule (Cloudflare's [doom-wasm](https://github.com/cloudflare/doom-wasm)), compiled to WebAssembly.
- **A WebSocket router** in `router/`, a Cloudflare Worker that also serves the site. It passes game packets between players in a room.

The base game is [Freedoom](https://freedoom.github.io/), so nothing purchased is needed. On desktop you can also play on a purchased `doom.wad`.

The design is in [docs/design.md](docs/design.md). Art workflow: [docs/art.md](docs/art.md). Deploying: [docs/deploy.md](docs/deploy.md).

## Quick start

You need three things installed first. Everything else is fetched or built by one command.

| | macOS | Windows |
| --- | --- | --- |
| Node.js 22 or newer | `brew install node` or https://nodejs.org | `winget install OpenJS.NodeJS.LTS` or https://nodejs.org |
| Git | `brew install git` | `winget install Git.Git` |
| GitHub CLI, logged in | `brew install gh && gh auth login` | `winget install GitHub.cli` then `gh auth login` |

macOS also needs [Homebrew](https://brew.sh) itself, which the setup uses to install Chocolate Doom and DeuTex's build dependencies.

Then, on either platform, paste this into a terminal:

```bash
git clone --recurse-submodules https://github.com/karinfam/battletoads-doom.git
cd battletoads-doom
npm install
node scripts/setup
node scripts/dev-server
```

Open http://localhost:8000, click Start Multiplayer, and open the invite link in a second tab to play against yourself. Co-op is the default; deathmatch is a toggle in the lobby.

`node scripts/setup` does five things, skipping any that are already done, so it is safe to run again after a `git pull`:

1. **Tools.** Chocolate Doom and DeuTex. On Windows it downloads pinned builds into `tools/`. On macOS it installs Chocolate Doom and the build dependencies with Homebrew, then compiles DeuTex 5.2.3 from its checksummed source release into `tools/deutex/`, because Homebrew has no DeuTex. On Linux, install both with `sudo apt install chocolate-doom deutex` and run setup afterwards.
2. **Freedoom** 0.13.0 into `iwads/`, the free base game.
3. **The WAD.** `build/toads.wad` from the art in `assets/`. Player frames without art yet get labelled placeholder boxes, so the build always covers the whole player.
4. **The engine.** Downloads the latest browser build from the `engine` GitHub Actions workflow into `build/engine/`. This is the step that needs `gh`. To compile it yourself instead, with `emcc` and `bash` on your PATH or with Docker installed, run `node scripts/build-engine` before setup.
5. **The site.** Assembles `dist/`, which the dev server serves.

The GitHub CLI is only needed for step 4. If you build the engine yourself, skip installing it.

## Commands

Every command is a Node script in `scripts/`. `make <target>`, `npm run <target>` and `node scripts/<name>` do the same thing, so pick whichever you have. They are written here as `node scripts/...` because that works everywhere, including Windows without `make`.

| Command | Does |
| --- | --- |
| `node scripts/setup` | Everything in Quick start, from tools to `dist/`. |
| `node scripts/fetch-tools` | Chocolate Doom and DeuTex for this platform. `--force` rebuilds or redownloads. |
| `node scripts/fetch-freedoom` | Freedoom into `iwads/`. |
| `node scripts/check-assets` | Lists which player frames in `assets/` still have no art. |
| `node scripts/build-wad` | `build/toads.wad`. `--placeholders none` is the strict release build that refuses missing art. |
| `node scripts/build-site` | `dist/` with content-hashed WAD names. |
| `node scripts/dev-server` | Serves `dist/` and an in-memory router on http://localhost:8000. |
| `node scripts/run-doom` | Desktop Chocolate Doom with the WAD merged. |
| `npm run dev-worker` | The real Cloudflare Worker under `wrangler dev`. Needs `DOOM_KEY=<random string>` in `router/.dev.vars`. |
| `npm test` | Unit tests. No game files needed. |

The scripts look for Chocolate Doom and DeuTex in `tools/<name>/` first, then on your PATH, or at the paths in the `CHOCOLATE_DOOM` and `DEUTEX` environment variables if set.

## Play on the desktop

After `node scripts/setup`, run desktop Chocolate Doom with the WAD merged:

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
