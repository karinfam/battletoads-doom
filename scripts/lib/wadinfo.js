'use strict'
// Reads and writes DeuTex wadinfo.txt files.
// Entry syntax: NAME [=] [x y] [file] [x y] [*], comments start with # or ;

const fs = require('fs')

// -> Map of lower-case section name -> [{ name, x, y }]
function parseWadinfo(text) {
  const sections = new Map()
  let current = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[#;].*$/, '').trim()
    if (!line) continue
    const header = line.match(/^\[(\w+)\]$/)
    if (header) {
      current = header[1].toLowerCase()
      if (!sections.has(current)) sections.set(current, [])
      continue
    }
    if (!current) throw new Error(`wadinfo: entry before any [section]: ${raw}`)
    const tokens = line.split(/[\s=]+/).filter(Boolean)
    const numbers = tokens.slice(1).filter((t) => /^-?\d+$/.test(t)).map(Number)
    sections.get(current).push({
      name: tokens[0].toUpperCase(),
      x: numbers.length >= 2 ? numbers[0] : null,
      y: numbers.length >= 2 ? numbers[1] : null,
    })
  }
  return sections
}

function readWadinfo(file) {
  return fs.existsSync(file) ? parseWadinfo(fs.readFileSync(file, 'utf8')) : new Map()
}

function formatWadinfo(sections, comment) {
  const lines = comment ? comment.split('\n').map((l) => `# ${l}`.trimEnd()) : []
  for (const [section, entries] of sections) {
    if (!entries.length) continue
    lines.push('', `[${section}]`)
    for (const e of entries) {
      lines.push(e.x === null ? e.name : `${e.name}\t${e.x}\t${e.y}`)
    }
  }
  return lines.join('\n') + '\n'
}

module.exports = { parseWadinfo, readWadinfo, formatWadinfo }
