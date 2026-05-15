# Elemental Defense

A portrait-mode tower defense game inspired by Field Runners. Built with vanilla
HTML5 Canvas + ES modules so it runs in any browser, then wrapped with
[Capacitor](https://capacitorjs.com/) for native iOS / Android distribution.

## Gameplay

- **Field**: 25 columns × 45 rows. Enemies spawn from the top-middle and exit
  through the bottom-middle. Towers form walls; A* pathfinding routes enemies
  around them, but you can never fully block the path.
- **Camera**: pinch / wheel to zoom (max-out fits the whole field on screen,
  max-in is 3.5× world scale). One-finger drag to pan with inertia.
- **5 tower elements**: Fire (splash), Water (slow), Earth (heavy + stun),
  Air (long range), Ether (chain lightning).
- **5 upgrade levels** per tower. Visual size, ring count, barrel scale, and
  muzzle flash all grow with level. Upgrade costs scale 1.5× → 2× → 2.8× → 4×.
- **Economy**: starting gold = **100**, base towers cost **20** (Water) – **35**
  (Ether). So round 1 you can build **5 base towers** _or_ **3 towers + a
  Lv 1→2 upgrade**, exactly as designed. Per-wave clear bonus = `25 + wave * 8`,
  plus per-kill rewards scaled to enemy class.

## Run locally

Any static server works. From the repo root:

```sh
npx serve -l 5173 .
# then open http://localhost:5173
```

Or just open `index.html` in a browser that allows `file://` ES modules
(Safari does, Chrome does not — use `serve` for Chrome).

## Build for iOS / Android (Capacitor)

```sh
npm install
npx cap add ios       # requires macOS + Xcode
npx cap add android   # requires Android Studio
npx cap sync
npx cap open ios      # opens Xcode
npx cap open android  # opens Android Studio
```

From there: archive in Xcode for App Store, or Build APK / AAB in Android
Studio for Google Play. The `webDir` is the repo root, so any change to the
HTML/JS/CSS only needs `npx cap sync` to push into the native shells.

App identifiers in `capacitor.config.json`:

- `appId`: `com.yooncreative.elementaldefense`
- `appName`: `Elemental Defense`

## Project layout

```
index.html             Entry HTML + HUD overlay (canvas + DOM hybrid)
capacitor.config.json  iOS/Android wrapper config
src/
  main.js              Bootstraps Game and starting overlay
  game.js              Game loop, render, state, tap-to-place / select
  config.js            All tunables: grid, towers, economy, enemies
  grid.js              25×45 cell grid; tower placement; can-block check
  pathfinding.js       A* with 4-neighbour movement and binary min-heap
  camera.js            Zoom (clamped), pan, world<->screen, inertia clamp
  input.js             Pointer events: 1-finger pan, 2-finger pinch, tap
  tower.js             Tower model: stats, target picking, upgrade/sell
  projectile.js        Bullets / waves / chains with light homing
  enemy.js             Enemy model: HP, slow/stun, follows recomputed path
  wave.js              Wave composition + WaveRunner spawner
  ui.js                DOM HUD, tower buttons, selection panel, overlays
  styles.css           HUD layout (pure CSS, safe-area aware for notch)
```

## Tuning

All economy / tower / enemy numbers live in `src/config.js`. Adjust there to
re-balance without touching game code.
