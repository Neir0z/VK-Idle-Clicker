import { UPGRADES, COMBO, PRESTIGE } from '../config.js';

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
      comboBar: document.getElementById('val-combo'),
      prestigeBtn: document.getElementById('btn-prestige'),
      prestigeInfo: document.getElementById('val-prestige'),
    };
    this._upgradeElements = new Map();
    this._createOfflineModal();
    this._initUpgradesDOM();
  }

  _createOfflineModal() {
    const dialog = document.createElement('dialog');
    dialog.id = 'modal-offline';
    dialog.className = 'modal';
    dialog.innerHTML = `
      <div class="modal__content" style="text-align:center">
        <h3>💤 Пока тебя не было</h3>
        <p class="modal__text" id="offline-amount">+0 монет</p>
        <p class="modal__text" style="color:var(--text-muted)">Игра работала в фоне!</p>
        <button id="btn-close-offline" class="btn btn--primary" type="button">Забрать</button>
      </div>
    `;
    document.body.appendChild(dialog);
    document.getElementById('btn-close-offline').addEventListener('click', () => dialog.close());
  }

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
        </button>`;
      fragment.appendChild(li);
      this._upgradeElements.set(u.id, { row: li, cost: li.querySelector('.upgrade-cost'), btn: li.querySelector('.upgrade-buy') });
    });
    this.els.upgradesList.appendChild(fragment);
  }

  showApp() {
    this.els.loader.classList.add('hidden');
    this.els.app.classList.remove('hidden');
    requestAnimationFrame(() => this.els.app.classList.add('visible'));
  }

  updateStats({ coins, eps, combo, prestigeGems }) {
    this.els.coins.textContent = this._formatNumber(coins);
    this.els.eps.textContent = this._formatNumber(eps);
    if (combo !== undefined) this.els.comboBar.textContent = `🔥 x${combo.toFixed(1)}`;
    this.els.prestigeInfo.textContent = `💎 ${prestigeGems} (+${(prestigeGems * PRESTIGE.baseMultiplier * 100).toFixed(0)}%)`;
    
    const canPrestige = coins >= PRESTIGE.minCoinsForPrestige;
    this.els.prestigeBtn.disabled = !canPrestige;
    this.els.prestigeBtn.textContent = canPrestige ? `⚡ Сбросить (+${Math.floor(coins / 10000)}💎)` : `⚡ Престиж (нужно ${this._formatNumber(PRESTIGE.minCoinsForPrestige)})`;
  }

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

  spawnClickFx(amount, x, y, combo) {
    const span = document.createElement('span');
    span.className = 'fx-particle';
    span.textContent = `+${this._formatNumber(amount)}`;
    if (combo >= 5) span.style.fontSize = '1.2em';
    if (combo >= 10) { span.style.color = '#f59e0b'; span.style.textShadow = '0 0 8px #f59e0b'; }
    if (combo >= 15) { span.style.color = '#ef4444'; span.style.textShadow = '0 0 12px #ef4444'; }
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    this.els.clickFx.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
    
    // Вибрация на мобильных
    if (navigator.vibrate && combo >= 3) navigator.vibrate(10);
  }

  showOfflineModal(earned) {
    const modal = document.getElementById('modal-offline');
    document.getElementById('offline-amount').textContent = `+${this._formatNumber(earned)} монет`;
    modal.showModal();
  }

  _formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    const suffixes = ['', 'K', 'M', 'B', 'T'];
    const tier = Math.log10(Math.abs(num)) / 3 | 0;
    if (tier === 0) return Math.floor(num).toString();
    return (num / Math.pow(10, tier * 3)).toFixed(1) + suffixes[tier];
  }

  bind(engine) {
    engine.on('tick', (p) => this.updateStats({ coins: p.coins, eps: p.eps, prestigeGems: engine.state.prestigeGems }));
    engine.on('click', (p) => {
      this.updateStats({ coins: p.total, eps: engine.state.perSecond, combo: p.combo, prestigeGems: engine.state.prestigeGems });
    });
    engine.on('upgradeBought', (p) => this.updateUpgrades(engine.state.upgrades, p.coins));
    engine.on('stateLoaded', (s) => {
      this.updateStats({ coins: s.coins, eps: s.perSecond, combo: s.combo || 0, prestigeGems: s.prestigeGems || 0 });
      this.updateUpgrades(s.upgrades, s.coins);
    });
    engine.on('prestige', () => {
      this.updateStats({ coins: engine.state.coins, eps: engine.state.perSecond, combo: 0, prestigeGems: engine.state.prestigeGems });
      this.updateUpgrades(engine.state.upgrades, engine.state.coins);
    });
    engine.on('milestone', ({ value }) => {
      const toast = document.createElement('div');
      toast.textContent = `🎉 Этап пройден: ${this._formatNumber(value)} монет!`;
      toast.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:var(--success);color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;animation:floatUp 1s forwards;z-index:999;pointer-events:none;';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 1000);
    });
    engine.on('offlineEarnings', ({ earned }) => {
      if (earned > 0) this.showOfflineModal(earned);
    });
    engine.on('multiplierChanged', ({ value }) => {
      this.els.btnReward.textContent = value > 1 ? '⏳ Ускорение...' : '🎁 Ускорить ×2';
      this.els.btnReward.disabled = value > 1;
    });
  }
}
