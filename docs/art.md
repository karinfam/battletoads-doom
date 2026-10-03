# Toad art

There is no final toad art yet. The mod replaces 69 player lumps, and until each one has real art the build fills it with a labelled placeholder box. This page covers what has to be made, how an image becomes game art, and the generators looked at so far.

## What has to be made

| Lumps | Count | What the player sees |
| --- | --- | --- |
| `PLAYA0` to `PLAYD0` | 4 | Walking. This is what other players see of you. |
| `PLAYE0`, `PLAYF0` | 2 | Attacking, and the same pose with a muzzle flash. |
| `PLAYG0` | 1 | Flinching in pain. |
| `PLAYH0` to `PLAYN0` | 7 | Falling over dead. `N` is the corpse on the floor. |
| `PLAYO0` to `PLAYW0` | 9 | The messy death. `W` is what is left. |
| `PUNGA0` to `PUNGD0` | 4 | Your own fist in first person: ready, then three punch frames. |
| `STFST*`, `STFTL*`, `STFTR*`, `STFOUCH*`, `STFEVL*`, `STFKILL*` | 40 | Your face in the status bar at five damage levels: looking around, turning to a hit, shocked, grinning, gritting teeth. |
| `STFGOD0`, `STFDEAD0` | 2 | Face when invulnerable, and when dead. |

In first person you only ever see your own face and fist. The body is for the other players.

## From image to game

1. Make or generate an image of the subject on a flat magenta background.
2. Import it. This cuts out the background, shrinks it to Doom scale, snaps it to the game palette and records its offsets:

   ```bash
   node scripts/import-art path/to/image.png PLAYA0
   ```

   `--crop x,y,w,h` takes part of the source, which is how a face comes out of a full-body image. `--height 56` overrides the height for a world sprite.

3. Build and look. Lumps without art still get placeholders:

   ```bash
   node scripts/build-wad
   ```

   ```bash
   node scripts/run-doom
   ```

4. When all 69 are done, `node scripts/check-assets --require p0` passes and `node scripts/build-wad --placeholders none` builds the release WAD.

Green skin is forced into palette indices 112 to 127, the ramp the engine recolours per player, so one set of art gives green, grey, brown and red toads. Skin that reads as yellow or olive misses the ramp and stays the same colour for everyone.

## Samples so far

In `art-samples/`: two full-body images from FLUX.1-schnell, a sheet showing each at Doom scale in the four player colours (`sheet.png`), and a mock-up of the first one in the game (`mock-in-game.png`). The mock-up uses one standing image for several frames; it is a look test, not art.

`body-pixel.png` is the chosen look. Every frame should match it: use it as the reference image for whichever generator is picked. The prompt that made it is in `art-samples/prompts.md`.

## Generators

Nothing is connected to Claude Code for image generation yet, and the connector directory has no pixel-art generator. Options, as of 3 Oct 2026:

| Generator | Fit for this job | Cost and access | Tried |
| --- | --- | --- | --- |
| FLUX.1-schnell, public demo on Hugging Face | Good single images. No help keeping one character consistent across 23 body frames. | Free with no account, but the quota ran out after two images. A free Hugging Face token raises it. | Yes: both samples. |
| [Retro Diffusion](https://github.com/Retro-Diffusion/api-examples) | Built for pixel art at game sizes. Has walking and other animations, and takes reference images, which is what keeps frames consistent. Has an MCP server for Claude Code. | Prepaid, about $0.03 to $0.18 per image, $0.14 to $0.25 per animation. Needs an account and API key. | No. |
| PixelLab | Built for pixel art characters with animations, with an MCP server for coding assistants. | Needs an account and API token. Pricing and limits not checked: its pages blocked automated reading. | No. |
| Local model on this PC's RTX 3070 (8 GB) | Unlimited and private, quality depends on the model and setup. | Free, but a multi-gigabyte install. | No. |

The hard part is not one good image, it is 23 body frames and 42 faces that all look like the same toad. That favours a generator with animation or reference-image support.
