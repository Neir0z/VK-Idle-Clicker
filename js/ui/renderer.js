import { UPGRADES } from '../config.js';

/**
 * Отрисовка интерфейса. Подписывается на события Engine.
 * Минимизирует DOM-операции, использует CSS-анимации.
 */
export class UIRenderer {
  constructor() {
    this.els = {
      coins: document.getElementById('val-coins'),
      eps: document.getElementById('val-eps'),
      upgradesList: document.getElementById('upgrades-list'),
      clickFx: document.getElementById('click-fx'),
      btnReward: document.getElementById('btn-reward'),
      btnInterstitial: document.getElementById('btn-interstitial'),
      app: document.getElementById('app'),
      loader: document.getElementById('loader'),
    };
    this._upgradeElements = new Map();
    this._initUpgradesDOM();
  }

  /** Создание DOM для улучшений (один раз) */
  _initUpgradesDOM() {
    const fragment = document.createDocumentFragment();
    UPGRADES.forEach(u => {
      const li = document.createElement('li');
      li.className = 'upgrade-item';
      li.dataset.id = u.id;
      li.innerHTML = `
        <div class="upgrade-info">
          <span class="upgrade-name">${u.name}</span>
          <span class="upgrade-desc">${u.desc}</span>
        </div>
        <button class="btn btn--primary upgrade-buy" type="button" data-id="${u.id}">
          <span class="upgrade-cost">0</span>
        </button>
      `;
      fragment.appendChild(li);
      this._upgradeElements.set(u.id, {
        row: li,
        cost: li.querySelector('.upgrade-cost'),
        btn: li.querySelector('.upgrade-buy'),
      });
    });
    this.els.upgradesList.appendChild(fragment);
  }

  /** Показать основной интерфейс */
  showApp() {
    this.els.loader.classList.add('hidden');
    this.els.app.classList.remove('hidden');
    // Небольшая задержка для transition
    requestAnimationFrame(() => this.els.app.classList.add('visible'));
  }

  /** Обновление чисел */
  updateStats({ coins, eps }) {
    this.els.coins.textContent = this._formatNumber(coins);
    this.els.eps.textContent = this._formatNumber(eps);
  }

  /** Обновление состояния улучшений */
  updateUpgrades(upgrades, coins) {
    for (const [id, data] of Object.entries(upgrades)) {
      const el = this._upgradeElements.get(id);
      if (!el) continue;
      el.cost.textContent = this._formatNumber(data.cost);
      const canBuy = coins >= data.cost;
      el.btn.disabled = !canBuy;
      el.row.classList.toggle('disabled', !canBuy);
    }
  }

  /** Эффект клика (floating text) */
  spawnClickFx(amount, x, y) {
    const span = document.createElement('span');
    span.className = 'fx-particle';
    span.textContent = `+${this._formatNumber(amount)}`;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    this.els.clickFx.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }

  /** Форматирование чисел (K, M, B) */
  _formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    const suffixes = ['', 'K', 'M', 'B', 'T'];
    const tier = Math.log10(Math.abs(num)) / 3 | 0;
    if (tier === 0) return Math.floor(num).toString();
    const suffix = suffixes[tier] || `e${tier * 3}`;
    const scale = Math.pow(10, tier * 3);
    const scaled = num / scale;
    return scaled.toFixed(1) + suffix;
  }

  /** Подписка на события Engine */
  bind(engine) {
    engine.on('tick', (p) => this.updateStats(p));
    engine.on('click', (p) => this.updateStats({ coins: p.total, eps: engine.state.perSecond }));
    engine.on('upgradeBought', (p) => this.updateUpgrades(engine.state.upgrades, p.coins));
    engine.on('stateLoaded', (s) => {
      this.updateStats({ coins: s.coins, eps: s.perSecond });
      this.updateUpgrades(s.upgrades, s.coins);
    });
    engine.on('multiplierChanged', ({ value }) => {
      this.els.btnReward.textContent = value > 1 ? '⏳ Ускорение...' : '🎁 Ускорить ×2';
      this.els.btnReward.disabled = value > 1;
    });
  }
}