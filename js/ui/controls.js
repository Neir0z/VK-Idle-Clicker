import { ANALYTICS } from '../config.js';

/**
 * Обработка пользовательского ввода.
 * Debounce, валидация, делегирование событий.
 */
export class UIControls {
  constructor(engine, renderer) {
    this.engine = engine;
    this.renderer = renderer;
    this._lastClick = 0;
    this._bindEvents();
  }

  _bindEvents() {
    // Клик по основной кнопке (поддержка touch/mouse)
    const btnClick = document.getElementById('btn-click');
    btnClick.addEventListener('pointerdown', (e) => this._handleClick(e), { passive: true });

    // Делегирование покупок
    document.getElementById('upgrades-list').addEventListener('click', (e) => {
      const btn = e.target.closest('.upgrade-buy');
      if (!btn || btn.disabled) return;
      const id = btn.dataset.id;
      if (this.engine.buyUpgrade(id)) {
        ANALYTICS.trackEvent('buy_upgrade', { id });
      }
    });

    // Настройки
    const modal = document.getElementById('modal-settings');
    document.getElementById('btn-settings').addEventListener('click', () => modal.showModal());
    document.getElementById('btn-close-modal').addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

    // Реклама (проброс событий, логика в monetization.js)
    document.getElementById('btn-reward').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('ad:reward:request'));
    });
    document.getElementById('btn-interstitial').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('ad:interstitial:request'));
    });
  }

  _handleClick(e) {
    // Anti-spam / debounce 50ms
    const now = performance.now();
    if (now - this._lastClick < 50) return;
    this._lastClick = now;

    const amount = this.engine.click();
    const rect = e.currentTarget.getBoundingClientRect();
    // Координаты относительно контейнера эффектов
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.renderer.spawnClickFx(amount, x, y);
    ANALYTICS.trackEvent('click', { amount });
  }
}