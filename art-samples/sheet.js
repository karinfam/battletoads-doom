// Scratch: contact sheet of generator samples at Doom scale in the four player colours.
const path = require('path')
const sharp = require('sharp')
const wadlib = require('../scripts/lib/wad')
const { doomify, toRgba, PLAYER_RAMPS } = require('../scripts/lib/doomify')
const palette = wadlib.playpal(wadlib.readWad(path.join(__dirname, '../iwads/freedoom1.wad')))
const SCALE = 5
async function main() {
  const samples = process.argv.slice(2)
  const rows = []
  for (const file of samples) {
    const art = await doomify(path.join(__dirname, file), palette, { height: 56 })
    const raw = await sharp(path.join(__dirname, file)).resize({ height: 56 * SCALE }).png().toBuffer()
    const rawMeta = await sharp(raw).metadata()
    const tiles = [{ input: raw, width: rawMeta.width }]
    for (const ramp of Object.keys(PLAYER_RAMPS)) {
      const png = await sharp(toRgba(art, palette, ramp), { raw: { width: art.width, height: art.height, channels: 4 } })
        .resize({ width: art.width * SCALE, kernel: 'nearest' }).png().toBuffer()
      tiles.push({ input: png, width: art.width * SCALE })
    }
    rows.push({ tiles, art })
    console.log(`${file}: ${art.width}x${art.height} at Doom scale`)
  }
  const gap = 16
  const rowH = 56 * SCALE
  const width = Math.max(...rows.map((r) => r.tiles.reduce((n, t) => n + t.width + gap, gap)))
  const composites = []
  rows.forEach((row, y) => {
    let x = gap
    for (const tile of row.tiles) {
      composites.push({ input: tile.input, left: x, top: gap + y * (rowH + gap) })
      x += tile.width + gap
    }
  })
  await sharp({ create: { width, height: gap + rows.length * (rowH + gap), channels: 4, background: '#3a3a3a' } })
    .composite(composites).png().toFile(path.join(__dirname, 'sheet.png'))
}
main()
