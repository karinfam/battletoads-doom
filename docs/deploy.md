# Deploying to Cloudflare

One Worker serves the site and the router, so there is one thing to deploy. Everything below runs from the repo root in PowerShell. Nothing here has been run against a real Cloudflare account yet: the Worker has only been tested locally with `npm run dev-worker`.

## Before the first deploy

1. **Make a Cloudflare account** at https://dash.cloudflare.com/sign-up. The Workers Free plan is enough. Do not add a payment method and you cannot be charged.
2. **Log Wrangler in.** This opens a browser window and asks you to allow access:

   ```bash
   npx wrangler login
   ```

3. **Check what will ship.** `build/toads.wad` is what players get. Rebuild it so it matches `assets/`:

   ```bash
   node scripts/build-wad
   ```

   Player lumps that have no art yet ship as labelled placeholder boxes. That is fine for a test deploy. For a real release, `node scripts/build-wad --placeholders none` refuses to build until every lump has art.

4. **Get the engine**, if `build/engine/` is empty (a fresh clone, say):

   ```bash
   gh run download --name engine --dir build/engine
   ```

## Deploy

1. Build the site and publish it. The first deploy asks you to pick a `workers.dev` subdomain if the account has none:

   ```bash
   npm run deploy
   ```

   Wrangler prints the address, something like `https://battletoads-doom.<your-subdomain>.workers.dev`.

2. Set the secret that signs room ids. Generate a random value, then paste it when Wrangler asks:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   ```bash
   npx wrangler secret put DOOM_KEY --config router/wrangler.toml
   ```

   Do this straight after the first deploy. Until it is set, room ids are signed with nothing and anyone could forge one. Never put the value in a file that gets committed.

## Check it works

1. Run the router test against the live address:

   ```powershell
   $env:ROUTER_ORIGIN = "https://battletoads-doom.<your-subdomain>.workers.dev"; node --test smoke/router.smoke.js
   ```

2. Open the address, click Start Multiplayer, and send the invite link to someone on a different network. This is milestone M4 in the design doc.

## Updating

After changing art, the lobby or the router:

```bash
npm run deploy
```

The WAD file names carry a content hash, so players never mix an old WAD with a new one. Anyone mid-game keeps playing on what they loaded.

## Your own domain (optional)

The `workers.dev` address is free. To use a domain instead, add it to the Cloudflare account first (Cloudflare has to manage its DNS), then add this to `router/wrangler.toml` and deploy again:

```toml
routes = [
  { pattern = "doom.example.com", custom_domain = true }
]
```

## What it costs

On the Workers Free plan, nothing. When a daily limit is hit, requests fail until midnight UTC instead of being billed.

| Limit | Free plan | What it means here |
| --- | --- | --- |
| Static files | Free and unlimited | The page, the engine and both WADs. |
| Worker requests | 100,000 per day | Room creation and joins. Tiny. |
| Durable Object requests | 100,000 per day, with incoming WebSocket messages counted 20 to 1 | Roughly four hours of four-player play per day. An estimate, not measured. |
| Durable Object duration | 13,000 GB-s per day | Roughly 28 hours of open rooms per day. An estimate. |

Charges only become possible if you upgrade the account to Workers Paid ($5 a month plus usage). There is no reason to for this project.

Sources: [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), read on 3 Oct 2026.

## Taking it down

If you are asked to remove the site, or just want it gone:

```bash
npx wrangler delete --config router/wrangler.toml
```

## Things to keep in mind

- The engine is GPL-2.0, so the page links to this repo's source. Keep the repo public while the site is up.
- A purchased `doom.wad` must never be hosted. The site build refuses any base game that is not Freedoom.
- A player who drops can stall the room for everyone. The lobby tells people to start a new room. This is a known limit of the upstream design.
