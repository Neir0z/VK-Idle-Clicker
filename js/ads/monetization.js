import { ADS, IS_DEV, ANALYTICS } from '../config.js';

/**
 * Менеджер рекламы. Dev-заглушки, проверка supports(), аналитика.
 * Ядро игры не импортирует этот модуль.
 */
export class AdManager {
  constructor(vkBridge) {
    this.vk = vkBridge;
    this._rewardedActive = false;
  }

  /** Rewarded Video */
  async showRewarded() {
    if (this._rewardedActive) return false;
    this._rewardedActive = true;
    ANALYTICS.trackEvent('ad_rewarded_start');

    try {
      if (IS_DEV || !this.vk.supports('VKWebAppShowNativeAd')) {
        await this._devSimulateAd(ADS.rewarded.fallbackDelay);
        return true;
      }
      const res = await this.vk.send('VKWebAppShowNativeAd', { ad_format: 'reward', placement_id: ADS.rewarded.placement });
      return res?.result === true;
    } catch (e) {
      console.warn('[Ads] Rewarded failed', e);
      return false;
    } finally {
      this._rewardedActive = false;
    }
  }

  /** Interstitial */
  async showInterstitial() {
    ANALYTICS.trackEvent('ad_interstitial_start');
    try {
      if (IS_DEV || !this.vk.supports('VKWebAppShowNativeAd')) {
        await this._devSimulateAd(ADS.interstitial.fallbackDelay);
        return true;
      }
      await this.vk.send('VKWebAppShowNativeAd', { ad_format: 'interstitial', placement_id: ADS.interstitial.placement });
      return true;
    } catch (e) {
      console.warn('[Ads] Interstitial failed', e);
      return false;
    }
  }

  /** Dev-симуляция просмотра рекламы */
  _devSimulateAd(delay) {
    return new Promise(resolve => {
      if (IS_DEV) console.log(`[Ads] Dev simulation (${delay}ms)...`);
      setTimeout(resolve, delay);
    });
  }

  /** Инициализация баннера (если поддерживается) */
  initBanner() {
    if (!ADS.banner.enabled) return;
    if (IS_DEV) {
      console.log('[Ads] Banner dev stub active');
      return;
    }
    if (this.vk.supports('VKWebAppShowNativeAd')) {
      this.vk.send('VKWebAppShowNativeAd', { ad_format: 'banner', placement_id: ADS.banner.placement }).catch(() => {});
    }
  }
}