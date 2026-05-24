import { IS_DEV } from '../config.js';

export class VKBridgeManager {
  constructor() {
    this.isInitialized = false;
    this.user = null;
    // Берём из глобальной области, куда его подключает обычный <script>
    this._bridge = window.vkBridge || window.VKBridge;
    this._visibilityHandler = this._onVisibilityChange.bind(this);
  }

  async init() {
    try {
      if (!this._bridge) throw new Error('VK Bridge not found');
      
      // VKWebAppInit зависает в обычном браузере, добавляем таймаут
      const initPromise = this._bridge.send('VKWebAppInit');
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Init timeout')), 3000));
      
      await Promise.race([initPromise, timeout]);
      this.isInitialized = true;
      if (IS_DEV) console.log('[VK] Initialized');
      
      document.addEventListener('visibilitychange', this._visibilityHandler);
      await this._getUser();
    } catch (e) {
      console.warn('[VK] Init failed or outside VK. Fallback mode active.');
      this.isInitialized = false;
    }
  }

  async _getUser() {
    try {
      const data = await this._bridge.send('VKWebAppGetUserInfo');
      this.user = data;
    } catch { this.user = { id: 0, first_name: 'DevUser' }; }
  }

  async storageGet(key) {
    if (!this.isInitialized) return null;
    try {
      const res = await this._bridge.send('VKWebAppStorageGet', { keys: [key] });
      return res.keys?.[0]?.value || null;
    } catch { return null; }
  }

  async storageSet(key, value) {
    if (!this.isInitialized) return;
    try { await this._bridge.send('VKWebAppStorageSet', { key, value }); }
    catch (e) { if (IS_DEV) console.warn('[VK] StorageSet error', e); }
  }

  _onVisibilityChange() {
    const hidden = document.hidden;
    if (this.isInitialized) {
      try { this._bridge.send(hidden ? 'VKWebAppHide' : 'VKWebAppShow'); } catch {}
    }
    document.dispatchEvent(new CustomEvent('app:visibility', { detail: { hidden } }));
  }

  supports(method) {
    return this.isInitialized && typeof this._bridge?.supports === 'function' && this._bridge.supports(method);
  }

  async send(method, params = {}) {
    if (!this.isInitialized) throw new Error('VK Bridge not initialized');
    return this._bridge.send(method, params);
  }
}
