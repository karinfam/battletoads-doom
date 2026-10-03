'use strict'
// The local router: serves the site and passes the router contract.

const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { test } = require('node:test')
const { createServer } = require('../scripts/dev-server')
const { checkRouter } = require('./router-contract')
const { tempDir } = require('./helpers')

test('dev-server serves the site and routes packets by client id', async () => {
  const root = tempDir()
  fs.writeFileSync(path.join(root, 'index.html'), '<p>site</p>')
  const server = createServer(root)
  await new Promise((resolve) => server.listen(0, resolve))
  const origin = `http://localhost:${server.address().port}`
  try {
    assert.strictEqual(await (await fetch(origin)).text(), '<p>site</p>')
    assert.strictEqual((await fetch(`${origin}/../package.json`)).status, 404)
    await checkRouter(origin)
  } finally {
    server.closeAllConnections()
    server.close()
  }
})
