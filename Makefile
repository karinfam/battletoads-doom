# Battletoads Doom. Every target calls a Node script in scripts/, so the same
# commands work from make, from `npm run <target>` and on Windows.
#
#   IWAD=iwads/doom.wad        base game for wad, run and check (default: Freedoom)
#   PLACEHOLDERS="TROO PLAY"   prefixes to fill with generated test art
#   ARGS="-warp 1 3 -nosound"  extra arguments for make run

IWAD ?= iwads/freedoom1.wad
PLACEHOLDERS ?=
ARGS ?=

# P0 lumps from the design doc: player body, fist, status bar face.
P0 = PLAY PUNG STFST STFTL STFTR STFOUCH STFEVL STFKILL STFGOD STFDEAD

export IWAD PLACEHOLDERS ARGS

.PHONY: iwad tools check check-p0 wad run engine site dev dev-worker deploy test clean

iwad:
	node scripts/fetch-freedoom

tools:
	node scripts/fetch-tools

check:
	node scripts/check-assets

check-p0:
	node scripts/check-assets --require "$(P0)"

wad:
	node scripts/build-wad

run:
	node scripts/run-doom

engine:
	node scripts/build-engine

site:
	node scripts/build-site

dev:
	node scripts/dev-server

dev-worker:
	npx wrangler dev --config router/wrangler.toml

deploy: site
	npx wrangler deploy --config router/wrangler.toml

test:
	node --test

clean:
	node -e "for (const d of ['build', 'dist']) require('fs').rmSync(d, { recursive: true, force: true })"
