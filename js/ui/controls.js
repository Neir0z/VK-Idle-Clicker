import { ANALYTICS } from '../config.js';

export class UIControls {
  constructor(engine, renderer) {
    this.engine = engine;
    this.renderer = renderer;
    this._lastClick = 0;
    this._bindEvents();
  }

   _bindEvents() {
    document.getElementById('btn-click').addEventListener('pointerdown', (e) => this._handleClick(e), { passive: true });

    document.getElementById('upgrades-list').addEventListener('click', (e) => {
      const btn = e.target.closest('.upgrade-buy');
      if (!btn || btn.disabled) return;
      if (this.engine.buyUpgrade(btn.dataset.id)) ANALYTICS.trackEvent('buy_upgrade', { id: btn.dataset.id });
    });

    const modal = document.getElementById('modal-settings');
    document.getElementById('btn-settings').addEventListener('click', () => modal.showModal());
    document.getElementById('btn-close-modal').addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

    document.getElementById('btn-reward').addEventListener('click', () => document.dispatchEvent(new CustomEvent('ad:reward:request')));
    document.getElementById('btn-interstitial').addEventListener('click', () => document.dispatchEvent(new CustomEvent('ad:interstitial:request')));

    // 🆕 Престиж с подтверждением
    document.getElementById('btn-prestige').addEventListener('click', () => {
      if (confirm(`Сбросить прогресс за ${Math.floor(this.engine.state.coins / 10000)}💎? Доход вырастет навсегда.`)) {
        if (this.engine.doPrestige()) ANALYTICS.trackEvent('prestige');
      }
    });
  }

  _handleClick(e) {
    if (performance.now() - this._lastClick < 50) return;
    this._lastClick = performance.now();
    const amount = this.engine.click();
    const rect = e.currentTarget.getBoundingClientRect();
    this.renderer.spawnClickFx(amount, e.clientX - rect.left, e.clientY - rect.top);
    ANALYTICS.trackEvent('click', { amount });
  }
}
