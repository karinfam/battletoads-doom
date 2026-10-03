<!-- Exported from the design doc on 2026-10-03 (revision 150). The doc is the
     source of truth. Decisions taken since are in CLAUDE.md. -->

# Battletoads Doom: Design Doc

2026-10-03 · Karin

## Summary

Battletoads Doom is a straight reskin of Doom 1. It swaps the player and enemies for Battletoads characters and is playable in multiplayer from a browser link.

It ships as three pieces:

1. `toads.wad`: a vanilla-compatible patch WAD holding the replacement art.
2. A browser build of Chocolate Doom, forked from Cloudflare's doom-wasm, that loads Freedoom Phase 1 plus `toads.wad`.
3. A WebSocket router that passes game packets between players in the same room.

The engine's gameplay code is not changed. The same WAD also runs on desktop Chocolate Doom against a purchased `doom.wad`.

## Goals and non-goals

The project is a reskin with a multiplayer link. Anything that changes how Doom plays is out of scope.

**Goals**

- Replace the player with a Battletoad: body sprites, status bar face, first-person fists and weapons.
- Replace Doom 1's enemies with Battletoads enemies, one for one.
- Play multiplayer in the browser from a shared link, with no install.
- Stay vanilla-compatible, so the WAD runs unmodified on Chocolate Doom.

**Non-goals**

- New mechanics, weapons or enemy behaviour. Hitboxes, damage and AI stay as Doom's.
- New maps.
- A distinct toad per player. Vanilla has one player sprite set, recoloured per player.
- ZScript, DECORATE or any ZDoom-family feature.
- Touch controls or mobile support in v1.

## Architecture

_[Diagram in the original doc: system architecture · 3 build inputs, 1 site, 1 router]_

Three build inputs are bundled into one static site. Players load it, then exchange game packets through a room on the router.

| Component | Source | What we change |
| --- | --- | --- |
| `toads.wad` | New | Everything. It is the mod. |
| Engine | Fork of [cloudflare/doom-wasm](https://github.com/cloudflare/doom-wasm), GPL-2.0 | Launch arguments and preloaded files in the page script. No C changes planned. |
| Base game | [Freedoom](https://freedoom.github.io/) Phase 1, a release after 0.13 | Nothing. Downloaded at build time. |
| Site and lobby | Adapted from the `assets` folder of [cloudflare/doom](https://github.com/cloudflare/doom), BSD-3-Clause | Branding, WAD names, router URL. |
| Router | Fork of `router/index.mjs` in [cloudflare/doom](https://github.com/cloudflare/doom) | Wrangler config. Routing logic unchanged. |

Networking is Doom's original lockstep model. One player acts as the server, and the game only advances when every client has every other client's input.

## The mod: toads.wad

`toads.wad` replaces art lumps by name and nothing else. The names match Doom's, so the engine picks them up with no code or DeHackEd changes.

| Target | Lump prefix | Priority | Notes |
| --- | --- | --- | --- |
| Player body | `PLAY` | P0 | What other players see. Frames A to W. |
| Status bar face | `STF*` | P0 | A graphic, not a sprite. Lives outside the sprite markers. Local player only. |
| Fist | `PUNG` | P0 | First-person view. |
| Imp | `TROO` | P0 | Pipeline test case. Frames A to U. |
| Zombieman, Shotgun guy | `POSS`, `SPOS` | P1 |  |
| Demon and Spectre | `SARG` | P1 | Spectre reuses the same art. |
| Lost Soul, Cacodemon | `SKUL`, `HEAD` | P1 |  |
| Baron, Cyberdemon, Spider Mastermind | `BOSS`, `CYBR`, `SPID` | P1 |  |
| Weapons in hand | `PISG`, `SHTG`, `CHGG`, `MISG`, `SAWG`, `PLSG`, `BFGG` | P2 | Plus flash lumps `PISF`, `SHTF`, `CHGF`, `MISF`, `PLSF`, `BFGF`. |
| Sounds | `DS*` | P2 | Optional toad and enemy audio. |

**Constraints**

- **Naming.** A sprite lump is a 4-letter prefix, a frame letter and a rotation digit. Rotation 0 means one image for every viewing angle. Rotations 1 to 8 are the eight angles, with mirrored pairs sharing a lump, such as `TROOA2A8`.
- **Single-angle art in v1.** Every replaced frame ships as a rotation 0 lump, so characters always face the camera. This cuts the imp from about 53 images to 21.
- **Palette.** All art is quantised to Doom's 256-colour `PLAYPAL`. Transparency comes from PNG alpha.
- **Player colours.** The engine remaps the green ramp, palette indices 112 to 127, per player. Draw toad skin in that range to get four colour variants for free.
- **Size.** A Doom humanoid is about 56 pixels tall. NES sprites need upscaling or redrawing to match.
- **Offsets.** Each sprite carries x and y offsets that put its feet on the floor. Wrong offsets make sprites float or sink.
- **Fixed hitboxes.** Collision size, health and behaviour belong to the engine. Pick replacements with a similar silhouette.
- **Base art.** On the browser build, anything not replaced shows Freedoom's art and Freedoom's maps.

## Asset pipeline

The WAD is built from source PNGs by a script, so Claude Code can rebuild and test it without a GUI.

1. **Author.** One PNG per lump in `assets/sprites/`, named for the lump, such as `TROOA0.png`. Truecolour with alpha.
2. **Describe.** `assets/wadinfo.txt` lists every lump and its x and y offsets.
3. **Check.** `scripts/check-assets` reads the frame list for each prefix from the base IWAD and reports missing or extra frames.
4. **Build.** `make wad` runs DeuTex to compose `build/toads.wad`, quantising to `PLAYPAL`.
5. **Run.** `make run` starts `chocolate-doom -iwad <iwad> -merge build/toads.wad -warp 1 1`.

| Tool | Role |
| --- | --- |
| [DeuTex](https://www.mankier.com/6/deutex) | Command-line WAD composer. Builds a PWAD from `wadinfo.txt` and folders of PNGs. Takes sprite offsets from `wadinfo.txt`, or from PNG grab chunks with `-pngoffsets`. |
| [SLADE](https://slade.mancubus.net/) | GUI, for people only. Inspect the built WAD and nudge offsets by eye. |
| [Chocolate Doom](https://www.chocolate-doom.org/) | Desktop test engine. The browser build is the same code base. |

**Rules**

- Load with `-merge`, never `-file`. Vanilla Doom cannot take sprites from a patch WAD, and `-merge` is Chocolate Doom's fix for that.
- Start each lump's offsets from the lump it replaces, read from the IWAD. First-person lumps such as `PUNG` use screen-space offsets, so this matters most there.
- A rotation 0 lump must replace all eight angles of that frame. Milestone 1 confirms `-merge` drops the originals. If it does not, the build has to ship all eight angles.
- DeuTex can close the sprite block with `S_END` or `SS_END`. Milestone 1 settles which one loads cleanly.
- Source PNGs are the source of truth. `build/` is never committed.

## Browser build

The engine is compiled once with Emscripten. Swapping WADs is a page-script change, with no C changes planned.

**Compile.** Follow the [doom-wasm README](https://github.com/cloudflare/doom-wasm): install Emscripten, automake and SDL2, then run `./scripts/clean.sh` and `./scripts/build.sh`. The outputs are `websockets-doom.js`, `websockets-doom.wasm` and `websockets-doom.wasm.map` in `src/`.

**Page script.** Upstream's [index.html](https://github.com/cloudflare/doom-wasm/blob/main/src/index.html) passes launch arguments and preloads files into the engine's virtual filesystem. Our version changes the IWAD, adds the merge and preloads both WADs:

```js

```

This snippet is adapted from upstream and has not been run.

**Base game**

- Use Freedoom Phase 1, pinned to one release after 0.13. Those releases are vanilla-compatible except for save game buffer overflows.
- Saving on large maps may crash this engine. Multiplayer does not need saves, so the lobby should not advertise them.
- The purchased `doom.wad` cannot be hosted publicly. It is used for desktop testing only and never committed.
- Shareware `doom1.wad`, which upstream uses, is expected to refuse patch WADs as vanilla does. Not verified.

**Licence.** doom-wasm is GPL-2.0. The fork's source must be public wherever the build is hosted.

## Multiplayer

Multiplayer reuses Cloudflare's design unchanged: up to four players per room, with the first player acting as the Doom server. Details below come from the [router repo](https://github.com/cloudflare/doom) and Cloudflare's [write-up](https://blog.cloudflare.com/doom-multiplayer-workers/).

**Join flow**

1. The host clicks New game. The lobby script asks the router for a new room and receives a room id.
2. The page shows an invite link that contains the room id.
3. The host's engine starts as the server and opens a WebSocket to that room.
4. A guest opens the link. The lobby script validates the room id, asks for a name and starts the engine as a client on the same room.
5. The host starts the game once everyone has joined.

**Router**

- Each room is one Durable Object instance. It keeps a table of open sockets keyed by each client's id.
- Each client picks a random 32-bit id at startup, which stands in for an IP address.
- Every WebSocket message is an envelope: 4 bytes To, 4 bytes From, both little-endian, then the original Doom packet.
- The room looks up the To id and forwards the message with the To field stripped.
- The API has three routes: `newroom`, `room/<id>` and `ws/<id>`.
- A room id is a Durable Object id plus a short hash salted with a secret, `DOOM_KEY`. The secret is set with Wrangler and never committed.

**Game mode.** The lobby defaults to co-op and offers deathmatch as a toggle. Upstream's site script already builds the launch arguments for both, so port that logic from `assets/carmack.js` instead of writing it fresh.

**WAD consistency.** Lockstep play breaks if players load different data. Every player gets both WADs from the same site, and the build adds a content hash to each WAD file name so a stale cache cannot mix versions.

**Local development.** Upstream ships a Node WebSocket router at `scripts/router.js`. Use it to test two browser tabs against each other before touching Cloudflare.

**Known limits, inherited from upstream**

- Abrupt disconnects are handled badly. A closed tab can stall the room.
- The game advances at the pace of the slowest connection.
- Room state is not persisted. If the Durable Object restarts, the game is lost.

## Hosting and deployment

Host the site and the router together on Cloudflare. The router needs Durable Objects, so Cloudflare is required either way, and one origin avoids cross-origin setup for the room API.

| Piece | Where | Notes |
| --- | --- | --- |
| Router | Cloudflare Worker with one Durable Object class, `Router` | Works on the Workers Free plan with the SQLite storage backend. |
| Site | Cloudflare static hosting on the same domain | GitHub Pages also works, but the room API then needs CORS headers. |
| Secret | `DOOM_KEY`, set with `wrangler secret put` | Salts room ids. |

**Upstream config is out of date.** The router repo's instructions use a 2021 beta of Wrangler and create the class with `--new-class Router`. Accounts with no existing key-value Durable Object namespace can now only create classes through a `new_sqlite_classes` migration, per the [July 2026 changelog](https://developers.cloudflare.com/changelog/post/2026-07-09-restrict-new-kv-backed-namespaces/). Rewrite the config for current Wrangler:

```toml

```

The router keeps no stored state, so the storage backend change should not touch its logic. This config is a sketch and has not been deployed.

**Deploy steps**

1. `make site` assembles `dist/`: page, lobby script, engine files, both WADs with hashed names.
2. `wrangler deploy` publishes the router.
3. The site deploy publishes `dist/` to the same domain.
4. A smoke test opens two browser sessions, creates a room in one and joins from the other.

## Repo layout

One repo holds the art, the build scripts, the site and the router. The engine fork is a submodule so upstream stays easy to diff.

```text

```

| Make target | Does |
| --- | --- |
| `make wad` | Checks assets, then builds `build/toads.wad`. |
| `make run` | Runs desktop Chocolate Doom with the WAD merged. `IWAD=` picks the base game. |
| `make engine` | Compiles the doom-wasm fork. |
| `make site` | Assembles `dist/` with hashed WAD names. |
| `make dev` | Starts the local Node router and a static server. |
| `make deploy` | Publishes the router and the site. |

## Milestones

Engineering runs on placeholder art first, so none of it waits on drawing. Real art starts at M5.

| # | Milestone | Done when |
| --- | --- | --- |
| M0 | Repo and tooling | `make run` starts unmodified Freedoom in desktop Chocolate Doom. |
| M1 | Pipeline proof | A placeholder imp, built from generated PNGs as rotation 0 lumps, shows in game under `-merge` with both `doom.wad` and `freedoom1.wad`. No sprite errors at startup. |
| M2 | Browser single-player | The same placeholder imp shows in the browser build, served from a local static server. |
| M3 | Local multiplayer | Two browser tabs join one room through the local Node router and see each other in a co-op game. |
| M4 | Deployed multiplayer | Two people on different networks play from a shared link on the production domain. |
| M5 | Player and imp art | All P0 lumps pass `check-assets`. A four-player game shows four toad colours. |
| M6 | Enemy roster | All P1 lumps pass `check-assets` and each enemy has been seen in game. |
| M7 | Polish | P2 items chosen in Open questions are done. Lobby copy and branding are final. |

M1 also settles two pipeline questions: the sprite end marker, and whether rotation 0 lumps cleanly replace eight-angle originals.

## Risks

The two forks are from 2021 and nothing in the browser path has been run yet. Most risk sits in M1 to M4.

| Risk | Why it might bite | Mitigation |
| --- | --- | --- |
| Engine build rot | doom-wasm has 11 commits and instructions written for 2021 tooling. Current Emscripten may not compile it. | Try current Emscripten first. If it fails, pin an older emsdk release and record the version in the repo. |
| Freedoom on this engine | Freedoom is vanilla-compatible on paper, but this engine has strict vanilla limits and has only been shown with shareware Doom. | Test `freedoom1.wad` on desktop Chocolate Doom in M0. If some maps crash, limit the lobby to maps that work. |
| Rotation 0 replacement | Doom errors if one frame has both a rotation 0 lump and angled lumps. This relies on `-merge` dropping the originals. | M1 tests it. Fallback: the build script emits all eight angles from one image. |
| Router drift | Upstream config targets a Wrangler beta and a class type new accounts cannot create. | Rewrite the config as shown in Hosting. Test with `wrangler dev` before deploying. |
| Disconnects | A dropped player can stall a lockstep game. | Accept in v1. The lobby tells players to start a new room. |
| Art volume | Roughly 20 frames per character across about 10 characters, even at one angle. Approximate. | Placeholders unblock engineering. Ship P0 first. |
| Intellectual property | Battletoads belongs to Rare and Microsoft. This is an unlicensed fan project. | Keep it free and non-commercial. Never host the paid Doom WAD. Be ready to take the site down if asked. This is not legal advice. |

## Open questions

None of these block M0 to M4. The art questions need answers before M5.

- [x] Single-angle sprites in v1, as assumed here, or full eight-angle rotations?
- [ ] Which toad is the player: Rash, Zitz or Pimple? Vanilla allows one sprite set.
      - [ ] Ans: Whichever is available.
- [ ] Which Battletoads enemy replaces each Doom monster?
      - [ ] Lets actually keep the original Doom monsters.
- [ ] Art source: redraw at Doom scale, or upscale the original sprites?
      - [ ] Redraw at Doom scale.
- [ ] Default game mode: co-op, as assumed here, or deathmatch?
      - [ ] Co-op.
- [ ] Are weapons reskinned, or left as Freedoom's?
      - [ ] Left as
- [ ] Custom sounds or music? Upstream runs with `-nomusic`.
      - [ ] No default?
- [ ] Site hosting on Cloudflare, as recommended, or GitHub Pages?
      - [ ] Cloudflare - but lets talk risk of cost?
- [ ] Which domain and Cloudflare account?

## References

- [cloudflare/doom-wasm](https://github.com/cloudflare/doom-wasm): the engine fork base, with build steps.
- [doom-wasm index.html](https://github.com/cloudflare/doom-wasm/blob/main/src/index.html): launch arguments and file preloading.
- [cloudflare/doom](https://github.com/cloudflare/doom): site assets, router Worker and the local Node router.
- [Multiplayer Doom on Cloudflare Workers](https://blog.cloudflare.com/doom-multiplayer-workers/): network design, packet envelope, known limits.
- [Durable Objects storage backend change](https://developers.cloudflare.com/changelog/post/2026-07-09-restrict-new-kv-backed-namespaces/): why the router config must change.
- [Chocolate Doom manual](https://www.mankier.com/6/chocolate-doom): `-merge` and other launch options.
- [DeuTex manual](https://www.mankier.com/6/deutex): composing a WAD from PNGs.
- [Freedoom](https://freedoom.github.io/) and its [Doom Wiki page](https://doomwiki.org/wiki/Freedoom): base game and compatibility notes.
- [Doom Wiki: Sprite](https://doomwiki.org/wiki/Sprite): lump naming, frames and rotations.
- [SLADE](https://slade.mancubus.net/): WAD inspection.
