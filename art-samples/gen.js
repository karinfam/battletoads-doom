// Scratch: request one image from the public FLUX.1-schnell demo on Hugging Face.
// usage: node gen.js <out.png> <seed> <width> <height> <prompt>
const fs = require('fs')
const sharp = require('sharp')
const BASE = 'https://black-forest-labs-flux-1-schnell.hf.space/gradio_api'
async function main() {
  const [out, seed, width, height, prompt] = process.argv.slice(2)
  const call = await fetch(`${BASE}/call/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [prompt, Number(seed), false, Number(width), Number(height), 4] }),
  })
  const { event_id } = await call.json()
  if (!event_id) throw new Error('no event id')
  const stream = await (await fetch(`${BASE}/call/infer/${event_id}`)).text()
  const line = stream.split('\n').filter((l) => l.startsWith('data: ')).pop()
  if (!/event: complete/.test(stream)) throw new Error(stream.slice(0, 400))
  const url = JSON.parse(line.slice(6))[0].url
  const image = Buffer.from(await (await fetch(url)).arrayBuffer())
  await sharp(image).png().toFile(out)
  console.log(`${out}: ${image.length} bytes`)
}
main().catch((e) => { console.error(`FAILED ${process.argv[2]}: ${e.message}`); process.exit(1) })
