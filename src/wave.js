import { ENEMIES } from "./config.js";
import { Enemy } from "./enemy.js";

export function buildWave(waveNum) {
  const w = waveNum, isBoss = w % 10 === 0;
  const count = Math.floor(6 + w * 1.6);
  const hpScale = Math.pow(1.18, w - 1);
  const speedScale = 1 + Math.min(0.6, w * 0.025);
  const enemies = [];
  for (let i = 0; i < count; i++) {
    let typeId = "grunt";
    const roll = Math.random();
    if (w >= 2 && roll < 0.25) typeId = "swarm";
    if (w >= 3 && roll >= 0.25 && roll < 0.45) typeId = "runner";
    if (w >= 5 && roll >= 0.45 && roll < 0.62) typeId = "tank";
    const t = ENEMIES[typeId];
    enemies.push({ typeId, hp: Math.round(t.baseHp * hpScale), speed: t.baseSpeed * speedScale, reward: t.reward, lives: t.lives, delay: 0.45 + Math.random() * 0.25 });
  }
  if (isBoss) {
    const t = ENEMIES.boss;
    enemies.push({ typeId: "boss", hp: Math.round(t.baseHp * hpScale * (1 + w / 20)), speed: t.baseSpeed * speedScale, reward: t.reward, lives: t.lives, delay: 1.2 });
  }
  for (let i = 1; i < enemies.length; i++) { if (enemies[i].typeId === "swarm" && enemies[i - 1].typeId === "swarm") enemies[i].delay = 0.18; }
  return enemies;
}

export class WaveRunner {
  constructor(spec) { this.spec = spec; this.index = 0; this.timer = 0; this.done = false; }
  update(dt, onSpawn) {
    if (this.done) return;
    this.timer -= dt;
    while (this.timer <= 0 && this.index < this.spec.length) {
      const desc = this.spec[this.index];
      onSpawn(new Enemy(desc.typeId, desc.hp, desc.speed, desc.reward, desc.lives));
      this.index++;
      if (this.index < this.spec.length) this.timer += this.spec[this.index].delay;
      else this.done = true;
    }
  }
}