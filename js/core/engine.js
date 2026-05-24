import { BALANCE, UPGRADES, IS_DEV, COMBO, PRESTIGE } from '../config.js';

export class GameEngine {
  constructor() {
    this.state = {
      coins: 0,
      perClick: BALANCE.baseClick,
      perSecond: BALANCE.basePerSecond,
      upgrades: {},
      lastTick: Date.now(),
      prestigeGems: 0,
      prestigeMultiplier: 0,
      combo: 0,
      lastComboTime: 0,
      milestone: 0,
    };
    this._subscribers = new Map();
    this._tickInterval = null;
    this._initUpgradesState();
  }

  _initUpgradesState() {
    UPGRADES.forEach(u => {
      if (!this.state.upgrades[u.id]) {
        this.state.upgrades[u.id] = { level: 0, cost: u.baseCost };
      }
    });
  }

  start() {
    const interval = IS_DEV ? 100 : 1000;
    this._tickInterval = setInterval(() => this._tick(), interval / BALANCE.devSpeedMultiplier);
    this.emit('started', this.state);
  }

  stop() { clearInterval(this._tickInterval); this._tickInterval = null; }

  _tick() {
    const now = Date.now();
    const delta = (now - this.state.lastTick) / 1000;
    this.state.lastTick = now;
    if (this.state.perSecond > 0) {
      this.state.coins += this.state.perSecond * (1 + this.state.prestigeMultiplier) * delta * BALANCE.devSpeedMultiplier;
    }
    this.emit('tick', { coins: this.state.coins, eps: this.state.perSecond * (1 + this.state.prestigeMultiplier) });
    this._checkMilestones();
  }

  click() {
    const now = Date.now();
    if (now - this.state.lastComboTime > COMBO.decayMs) this.state.combo = 0;
    this.state.combo = Math.min(this.state.combo + 1, COMBO.maxCombo);
    this.state.lastComboTime = now;

    const comboMult = 1 + this.state.combo * COMBO.multiplierPerCombo;
    const prestigeMult = 1 + this.state.prestigeMultiplier;
    const amount = this.state.perClick * comboMult * prestigeMult;
    this.state.coins += amount;
    this.emit('click', { amount, total: this.state.coins, combo: this.state.combo });
    return { amount, combo: this.state.combo };
  }

  buyUpgrade(id) {
    const cfg = UPGRADES.find(u => u.id === id);
    if (!cfg) return false;
    const upg = this.state.upgrades[id];
    if (this.state.coins < upg.cost) return false;

    this.state.coins -= upg.cost;
    upg.level++;
    upg.cost = Math.floor(cfg.baseCost * Math.pow(cfg.growth, upg.level));
    this.state.perSecond += cfg.eps;

    this.emit('upgradeBought', { id, level: upg.level, cost: upg.cost, coins: this.state.coins, eps: this.state.perSecond });
    return true;
  }

  doPrestige() {
    if (this.state.coins < PRESTIGE.minCoinsForPrestige) return false;
    const newGems = Math.floor(this.state.coins / (PRESTIGE.minCoinsForPrestige / PRESTIGE.gemsPer10k));
    this.state.prestigeGems += newGems;
    this.state.prestigeMultiplier = this.state.prestigeGems * PRESTIGE.baseMultiplier;
    
    // Сброс прогресса
    this.state.coins = 0;
    this.state.perClick = BALANCE.baseClick;
    this.state.perSecond = BALANCE.basePerSecond;
    this.state.combo = 0;
    this.state.milestone = 0;
    this._initUpgradesState();
    UPGRADES.forEach(u => this.state.upgrades[u.id] = { level: 0, cost: u.baseCost });

    this.emit('prestige', { gems: this.state.prestigeGems, multiplier: this.state.prestigeMultiplier });
    return true;
  }

  calculateOfflineProgress(lastSavedTimestamp) {
    const now = Date.now();
    const diffSec = Math.min((now - lastSavedTimestamp) / 1000, BALANCE.maxOfflineHours * 3600);
    if (diffSec < 10 || this.state.perSecond === 0) return 0;
    const earned = this.state.perSecond * (1 + this.state.prestigeMultiplier) * diffSec * BALANCE.offlineMultiplier;
    this.state.coins += earned;
    this.state.lastTick = now;
    this.emit('offlineEarnings', { earned, seconds: diffSec });
    return earned;
  }

  _checkMilestones() {
    const thresholds = [100, 1000, 10000, 100000, 1000000];
    const next = thresholds.find(t => t > this.state.coins);
    if (next && this.state.coins >= next && this.state.milestone < next) {
      this.state.milestone = next;
      this.emit('milestone', { value: next });
    }
  }

  on(event, handler) {
    if (!this._subscribers.has(event)) this._subscribers.set(event, new Set());
    this._subscribers.get(event).add(handler);
    return () => this.off(event, handler);
  }
  off(event, handler) { this._subscribers.get(event)?.delete(handler); }
  emit(event, payload) {
    this._subscribers.get(event)?.forEach(fn => { try { fn(payload); } catch (e) { console.error(`[Engine] ${event}`, e); } });
  }

  serialize() {
    return JSON.stringify({
      coins: this.state.coins, perClick: this.state.perClick, perSecond: this.state.perSecond,
      upgrades: this.state.upgrades, lastTick: this.state.lastTick,
      prestigeGems: this.state.prestigeGems, prestigeMultiplier: this.state.prestigeMultiplier,
      milestone: this.state.milestone, lastSave: Date.now(), multiplier: 1
    });
  }
  deserialize(json) {
    try {
      const data = JSON.parse(json);
      Object.assign(this.state, data);
      this._initUpgradesState();
      this.emit('stateLoaded', this.state);
      return true;
    } catch { return false; }
  }
}
