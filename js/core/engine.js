import { BALANCE, UPGRADES, IS_DEV } from '../config.js';

/**
 * Ядро экономики. Не знает об UI, рекламе или хранилище.
 * Взаимодействие только через Pub/Sub события.
 */
export class GameEngine {
  constructor() {
    this.state = {
      coins: 0,
      perClick: BALANCE.baseClick,
      perSecond: BALANCE.basePerSecond,
      upgrades: {},
      lastTick: Date.now(),
      lastSave: Date.now(),
      multiplier: 1,
    };
    this._subscribers = new Map();
    this._tickInterval = null;
    this._initUpgradesState();
  }

  /** Инициализация состояния улучшений */
  _initUpgradesState() {
    UPGRADES.forEach(u => {
      if (!this.state.upgrades[u.id]) {
        this.state.upgrades[u.id] = { level: 0, cost: u.baseCost };
      }
    });
  }

  /** Запуск игрового цикла */
  start() {
    const interval = IS_DEV ? 100 : 1000;
    this._tickInterval = setInterval(() => this._tick(), interval / BALANCE.devSpeedMultiplier);
    this.emit('started', this.state);
  }

  /** Остановка цикла */
  stop() {
    clearInterval(this._tickInterval);
    this._tickInterval = null;
  }

  /** Внутренний тик экономики */
  _tick() {
    const now = Date.now();
    const delta = (now - this.state.lastTick) / 1000;
    this.state.lastTick = now;

    if (this.state.perSecond > 0) {
      const earned = this.state.perSecond * this.state.multiplier * delta * BALANCE.devSpeedMultiplier;
      this.state.coins += earned;
    }

    this.emit('tick', { coins: this.state.coins, eps: this.state.perSecond * this.state.multiplier });
  }

  /** Обработка клика */
  click() {
    const amount = this.state.perClick * this.state.multiplier;
    this.state.coins += amount;
    this.emit('click', { amount, total: this.state.coins });
    return amount;
  }

  /** Покупка улучшения */
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

  /** Расчёт офлайн-дохода */
  calculateOfflineProgress(lastSavedTimestamp) {
    const now = Date.now();
    const diffSec = Math.min((now - lastSavedTimestamp) / 1000, BALANCE.maxOfflineHours * 3600);
    if (diffSec < 10 || this.state.perSecond === 0) return 0;

    const earned = this.state.perSecond * diffSec * BALANCE.offlineMultiplier;
    this.state.coins += earned;
    this.state.lastTick = now;
    this.emit('offlineEarnings', { earned, seconds: diffSec });
    return earned;
  }

  /** Установка множителя (например, от рекламы) */
  setMultiplier(val, durationSec = 30) {
    this.state.multiplier = val;
    this.emit('multiplierChanged', { value: val });
    setTimeout(() => {
      this.state.multiplier = 1;
      this.emit('multiplierChanged', { value: 1 });
    }, durationSec * 1000 / BALANCE.devSpeedMultiplier);
  }

  /** Pub/Sub: Подписка */
  on(event, handler) {
    if (!this._subscribers.has(event)) this._subscribers.set(event, new Set());
    this._subscribers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /** Pub/Sub: Отписка */
  off(event, handler) {
    this._subscribers.get(event)?.delete(handler);
  }

  /** Pub/Sub: Публикация */
  emit(event, payload) {
    this._subscribers.get(event)?.forEach(fn => {
      try { fn(payload); } catch (e) { console.error(`[Engine] Event ${event} error:`, e); }
    });
  }

  /** Экспорт состояния для сохранения */
  serialize() {
    return JSON.stringify({
      coins: this.state.coins,
      perClick: this.state.perClick,
      perSecond: this.state.perSecond,
      upgrades: this.state.upgrades,
      lastTick: this.state.lastTick,
      lastSave: Date.now(),
      multiplier: 1,
    });
  }

  /** Импорт состояния */
  deserialize(json) {
    try {
      const data = JSON.parse(json);
      Object.assign(this.state, data);
      this._initUpgradesState();
      this.emit('stateLoaded', this.state);
      return true;
    } catch {
      return false;
    }
  }
}