import { SAVE_KEY, VK_STORAGE_KEY, GAME_VERSION, IS_DEV } from '../config.js';

export class SaveManager {
  constructor(vkBridge) {
    this.vk = vkBridge;
    this.version = GAME_VERSION;
  }

  async load() {
    try {
      let raw = null;
      if (this.vk.isInitialized) raw = await this.vk.storageGet(VK_STORAGE_KEY);
      if (!raw) raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);
      if (data.version !== this.version) this._migrate(data);
      return data.payload;
    } catch (e) {
      console.warn('[Save] Load failed', e);
      return localStorage.getItem(SAVE_KEY);
    }
  }

  async save(payload) {
    const data = JSON.stringify({ version: this.version, payload });
    localStorage.setItem(SAVE_KEY, data);
    if (this.vk.isInitialized) {
      try { await this.vk.storageSet(VK_STORAGE_KEY, data); } 
      catch (e) { if (IS_DEV) console.warn('[Save] VK sync failed', e); }
    }
  }

  _migrate(data) {
    if (!data.payload.upgrades) data.payload.upgrades = {};
  }
}
