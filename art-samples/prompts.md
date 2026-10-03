# Sample prompts

Both samples came from the public FLUX.1-schnell demo on Hugging Face (4 steps, 512x768) on 3 Oct 2026, through `gen.js`.

Shared pieces:

- Toad: "a muscular anthropomorphic green toad brawler with black sunglasses, black spiked wristbands, black knee pads and a studded belt, bare chest with a pale yellow-green belly"
- Background: "isolated on a flat solid bright magenta background, no shadow, no text"

| File | Seed | Prompt |
| --- | --- | --- |
| `body-pixel.png` (chosen look) | 11 | "pixel art game sprite of [toad], full body, front view, standing in a fighting stance facing the viewer, 1993 DOS first-person shooter enemy sprite style, limited palette, [background]" |
| `body-model.png` | 12 | "photo of a painted latex and clay stop-motion model of [toad], full body, front view, standing in a fighting stance facing the viewer, harsh studio light, digitized 1993 video game sprite, [background]" |

`sheet.js` rebuilds `sheet.png`: each sample at Doom scale in the four player colours.
