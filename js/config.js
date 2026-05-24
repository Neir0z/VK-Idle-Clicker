export const IS_DEV = new URLSearchParams(window.location.search).has('dev');

export const GAME_VERSION = '1.0.0';
export const SAVE_KEY = 'vk_idle_clicker_save';
export const VK_STORAGE_KEY = 'idle_clicker_data';

export const BALANCE = {
  baseClick: 1,
  basePerSecond: 0,
  offlineMultiplier: 0.5,
  maxOfflineHours: 12,
  devSpeedMultiplier: IS_DEV ? 10 : 1,
};

export const UPGRADES = [
  { id: 'cursor', name: 'Авто-курсор', desc: '+1/сек', baseCost: 15, eps: 1, growth: 1.15 },
  { id: 'robot', name: 'Робот-кликер', desc: '+5/сек', baseCost: 100, eps: 5, growth: 1.18 },
  { id: 'factory', name: 'Монетный завод', desc: '+20/сек', baseCost: 500, eps: 20, growth: 1.20 },
  { id: 'quantum', name: 'Квантовый генератор', desc: '+100/сек', baseCost: 3000, eps: 100, growth: 1.25 },
];

export const ADS = {
  rewarded: { placement: 'rewarded_main', fallbackDelay: 1500 },
  interstitial: { placement: 'interstitial_wave', fallbackDelay: 800 },
  banner: { placement: 'banner_bottom', enabled: true },
};

export const ANALYTICS = {
  trackEvent: (name, params = {}) => {
    if (IS_DEV) console.log(`[Analytics] ${name}`, params);
  },
};
