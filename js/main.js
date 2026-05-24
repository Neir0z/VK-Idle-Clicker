import { IS_DEV, GAME_VERSION, ANALYTICS } from './config.js';
import { GameEngine } from './core/engine.js';
import { UIRenderer } from './ui/renderer.js';
import { UIControls } from './ui/controls.js';
import { SaveManager } from './storage/save.js';
import { VKBridgeManager } from './vk/bridge.js';
import { AdManager } from './ads/monetization.js';

/**
 * Точка входа. Инициализация модулей, загрузочный экран, обработка ошибок.
 */
async function bootstrap() {
  try {
    document.getElementById('app-version').textContent = GAME_VERSION;
    
    // 1. Инициализация VK Bridge
    const vk = new VKBridgeManager();
    await vk.init();

    // 2. Менеджер сохранений
    const storage = new SaveManager(vk);
    const savedData = await storage.load();

    // 3. Ядро игры
    const engine = new GameEngine();
    if (savedData) engine.deserialize(savedData);

    // 4. UI
    const renderer = new UIRenderer();
    renderer.bind(engine);
    const controls = new UIControls(engine, renderer);

    // 5. Реклама
    const ads = new AdManager(vk);
    ads.initBanner();

    // 6. Подписка на рекламу (через DOM Events, чтобы не нарушать изоляцию)
    document.addEventListener('ad:reward:request', async () => {
      const success = await ads.showRewarded();
      if (success) {
        engine.setMultiplier(2, 60);
        ANALYTICS.trackEvent('ad_rewarded_success');
      }
    });

    document.addEventListener('ad:interstitial:request', async () => {
      await ads.showInterstitial();
      ANALYTICS.trackEvent('ad_interstitial_success');
    });

    // 7. Офлайн-прогресс
    if (savedData?.lastTick) {
      const offline = engine.calculateOfflineProgress(savedData.lastTick);
      if (offline > 0 && !IS_DEV) {
        // Можно показать модалку офлайн-дохода (опционально)
        console.log(`[Main] Offline earnings: ${offline}`);
      }
    }

    // 8. Автосохранение
    setInterval(async () => {
      await storage.save(JSON.parse(engine.serialize()));
    }, IS_DEV ? 5000 : 30000);

    // 9. Обработка visibility для паузы/возобновления
    document.addEventListener('app:visibility', ({ detail }) => {
      if (detail.hidden) engine.stop();
      else engine.start();
    });

    // 10. Запуск (минимум 0.5 сек загрузочный экран)
    const minLoadTime = new Promise(res => setTimeout(res, 500));
    await minLoadTime;
    renderer.showApp();
    engine.start();

    ANALYTICS.trackEvent('app_started', { dev: IS_DEV });
    if (IS_DEV) console.log('[Main] Dev mode active. Timers ×10, Ads stubbed.');

  } catch (err) {
    console.error('[Main] Critical boot error:', err);
    document.getElementById('loader').innerHTML = `<p style="color:#ef4444;padding:20px;text-align:center">Ошибка загрузки. Обновите страницу.</p>`;
  }
}

// Запуск после парсинга DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}