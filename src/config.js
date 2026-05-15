// Game-wide configuration. Tune these to balance the game.

export const GRID = {
  cols: 25,
  rows: 45,           // Portrait: 25 wide × 45 tall (~9:16.2 ratio)
  tileSize: 36,       // Logical tile size in world pixels
  spawnCol: 12,       // Top-middle entry (0..24)
  exitCol: 12,        // Bottom-middle exit
};

export const CAMERA = {
  // Zoom is in screen-pixels-per-world-pixel.
  // minZoom is computed at runtime so the entire grid fits the screen.
  // maxZoom caps how far you can zoom in.
  maxZoom: 3.5,
  zoomSpeed: 0.0025,
  panFriction: 0.88,
};

// Tower archetypes. Cost is BASE; upgrades use a multiplier.
export const TOWERS = {
  fire: {
    id: "fire",
    name: "Fire",
    color: "#ff5a2a",
    glow: "#ffb070",
    cost: 20,
    levels: [
      { dmg: 8,  range: 3.2, fireRate: 1.0, splash: 0.6, projSpeed: 14, projColor: "#ff7733" },
      { dmg: 14, range: 3.4, fireRate: 1.1, splash: 0.7, projSpeed: 15, projColor: "#ff8844" },
      { dmg: 24, range: 3.6, fireRate: 1.2, splash: 0.9, projSpeed: 16, projColor: "#ff9955" },
      { dmg: 42, range: 3.9, fireRate: 1.3, splash: 1.1, projSpeed: 18, projColor: "#ffaa66" },
      { dmg: 75, range: 4.3, fireRate: 1.5, splash: 1.4, projSpeed: 20, projColor: "#ffd28a" },
    ],
    desc: "Splash damage to grouped enemies.",
  },
  water: {
    id: "water",
    name: "Water",
    color: "#3aa9ff",
    glow: "#9bd6ff",
    cost: 18,
    levels: [
      { dmg: 3,  range: 3.0, fireRate: 2.6, slow: 0.35, slowDur: 1.2, projSpeed: 18, projColor: "#7ec5ff" },
      { dmg: 5,  range: 3.1, fireRate: 2.8, slow: 0.40, slowDur: 1.3, projSpeed: 19, projColor: "#8fcfff" },
      { dmg: 8,  range: 3.2, fireRate: 3.0, slow: 0.45, slowDur: 1.5, projSpeed: 20, projColor: "#a0d8ff" },
      { dmg: 14, range: 3.4, fireRate: 3.4, slow: 0.55, slowDur: 1.7, projSpeed: 22, projColor: "#b7e2ff" },
      { dmg: 24, range: 3.7, fireRate: 4.0, slow: 0.65, slowDur: 2.0, projSpeed: 24, projColor: "#d6efff" },
    ],
    desc: "Rapid fire that slows enemies.",
  },
  earth: {
    id: "earth",
    name: "Earth",
    color: "#8a6a2a",
    glow: "#d6b06a",
    cost: 22,
    levels: [
      { dmg: 16, range: 2.6, fireRate: 0.55, stunDur: 0.20, projSpeed: 12, projColor: "#b58a3c" },
      { dmg: 28, range: 2.7, fireRate: 0.60, stunDur: 0.25, projSpeed: 12, projColor: "#c69a48" },
      { dmg: 48, range: 2.8, fireRate: 0.65, stunDur: 0.30, projSpeed: 13, projColor: "#d6aa54" },
      { dmg: 84, range: 3.0, fireRate: 0.75, stunDur: 0.40, projSpeed: 14, projColor: "#e6ba62" },
      { dmg: 150,range: 3.2, fireRate: 0.90, stunDur: 0.55, projSpeed: 15, projColor: "#f6cc78" },
    ],
    desc: "Heavy slow shots that briefly stun.",
  },
  air: {
    id: "air",
    name: "Air",
    color: "#bfe9ff",
    glow: "#ffffff",
    cost: 24,
    levels: [
      { dmg: 6,  range: 4.6, fireRate: 1.6, projSpeed: 26, projColor: "#e6f6ff" },
      { dmg: 10, range: 4.8, fireRate: 1.8, projSpeed: 28, projColor: "#ecf8ff" },
      { dmg: 17, range: 5.1, fireRate: 2.0, projSpeed: 30, projColor: "#f2faff" },
      { dmg: 30, range: 5.5, fireRate: 2.3, projSpeed: 32, projColor: "#f8fcff" },
      { dmg: 52, range: 6.0, fireRate: 2.7, projSpeed: 34, projColor: "#ffffff" },
    ],
    desc: "Long range. Picks off distant targets.",
  },
  ether: {
    id: "ether",
    name: "Ether",
    color: "#a26bff",
    glow: "#d8b8ff",
    cost: 35,
    levels: [
      { dmg: 5,  range: 3.4, fireRate: 1.4, chain: 2, chainRange: 1.6, projSpeed: 22, projColor: "#c39bff" },
      { dmg: 9,  range: 3.6, fireRate: 1.5, chain: 3, chainRange: 1.8, projSpeed: 23, projColor: "#cdaaff" },
      { dmg: 16, range: 3.8, fireRate: 1.6, chain: 3, chainRange: 2.0, projSpeed: 24, projColor: "#d7baff" },
      { dmg: 28, range: 4.1, fireRate: 1.8, chain: 4, chainRange: 2.3, projSpeed: 26, projColor: "#e1c9ff" },
      { dmg: 50, range: 4.5, fireRate: 2.0, chain: 5, chainRange: 2.7, projSpeed: 28, projColor: "#ecdaff" },
    ],
    desc: "Chains lightning between enemies.",
  },
};

export const TOWER_ORDER = ["fire", "water", "earth", "air", "ether"];

// Upgrade cost: base * multiplier^(level)
export const UPGRADE = {
  multipliers: [1.5, 2.0, 2.8, 4.0], // L1->L2, L2->L3, L3->L4, L4->L5
  sellRefund: 0.7, // % of total spent returned on sell
};

// Wave / economy tuning. Round 1 starting gold = 100,
// which buys 5 base towers (20g each) OR 3 towers + 1 upgrade (~60+30=90).
export const ECONOMY = {
  startingGold: 100,
  startingLives: 20,
  enemyKillReward: 2,         // gold per kill, scales with hp tier
  waveCompleteBonus: 25,      // flat bonus per wave
  waveCompleteScale: 8,       // + (wave * scale)
};

export const ENEMIES = {
  // Base enemy template; per-wave we scale hp/speed/count
  grunt: { color: "#aaaaaa", radius: 0.32, baseHp: 18, baseSpeed: 2.0, reward: 2, lives: 1 },
  runner:{ color: "#7af0a0", radius: 0.26, baseHp: 12, baseSpeed: 3.6, reward: 2, lives: 1 },
  tank:  { color: "#7c93ff", radius: 0.42, baseHp: 60, baseSpeed: 1.4, reward: 5, lives: 2 },
  swarm: { color: "#ffcc55", radius: 0.20, baseHp: 7,  baseSpeed: 2.6, reward: 1, lives: 1 },
  boss:  { color: "#ff5577", radius: 0.55, baseHp: 350,baseSpeed: 1.2, reward: 30, lives: 5 },
};
