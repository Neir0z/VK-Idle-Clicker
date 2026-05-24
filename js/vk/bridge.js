import vkBridge from '../lib/vk-bridge.min.js';
import { IS_DEV } from '../config.js';

/**
 * Обёртка над VK Bridge. Безопасные вызовы, обработка visibility, dev-заглушки.
 */
export class VKBridgeManager {
  constructor() {
    this.isInitialized = false;
    this.user = null;
    this._visibilityHandler = this._onVisibilityChange.bind(this);
  }

  /** Инициализация моста */
  async init() {
    try {
      if (typeof vkBridge === 'undefined') throw new Error('VK Bridge script not loaded');
      await vkBridge.send('VKWebAppInit');
      this.isInitialized = true;
      if (IS_DEV) console.log('[VK] Initialized');
      
      document.addEventListener('visibilitychange', this._visibilityHandler);
      await this._getUser();
    } catch (e) {
      console.warn('[VK] Init failed, running in fallback mode', e);
      this.isInitialized = false;
    }
  }

  /** Получение данных пользователя */
  async _getUser() {
    try {
      const data = await vkBridge.send('VKWebAppGetUserInfo');
      this.user = data;
      if (IS_DEV) console.log('[VK] User:', data);
    } catch {
      this.user = { id: 0, first_name: 'DevUser' };
    }
  }

  /** Storage Get */
  async storageGet(key) {
    if (!this.isInitialized) return null;
    try {
      const res = await vkBridge.send('VKWebAppStorageGet', { keys: [key] });
      return res.keys?.[0]?.value || null;
    } catch { return null; }
  }

  /** Storage Set */
  async storageSet(key, value) {
    if (!this.isInitialized) return;
    try {
      await vkBridge.send('VKWebAppStorageSet', { key, value });
    } catch (e) { if (IS_DEV) console.warn('[VK] StorageSet error', e); }
  }

  /** Обработка сворачивания/разворачивания */
  _onVisibilityChange() {
    const hidden = document.hidden;
    if (this.isInitialized) {
      try {
        vkBridge.send(hidden ? 'VKWebAppHide' : 'VKWebAppShow');
      } catch {}
    }
    document.dispatchEvent(new CustomEvent('app:visibility', { detail: { hidden } }));
  }

  /** Проверка поддержки метода */
  supports(method) {
    return this.isInitialized && typeof vkBridge.supports === 'function' && vkBridge.supports(method);
  }

  /** Прямой вызов (обёртка) */
  async send(method, params = {}) {
    if (!this.isInitialized) throw new Error('VK Bridge not initialized');
    return vkBridge.send(method, params);
  }
}