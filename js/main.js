import { IS_DEV, GAME_VERSION, ANALYTICS } from './config.js';
import { GameEngine } from './core/engine.js';
import { UIRenderer } from './ui/renderer.js';
import { UIControls } from './ui/controls.js';
import { SaveManager } from './storage/save.js';
import { VKBridgeManager } from './vk/bridge.js';
import { AdManager } from './ads/monetization.js';

async function bootstrap() {
  // 🛡️ Страховка: если что-то зависнет, интерфейс появится через 3 сек
  const safetyTimeout = setTimeout(() => {
    const loader = document.getElementById('loader');
    const app = document.getElementById('app');
    if (loader && !loader.classList.contains('hidden')) {
      console.warn('[Main] Safety timeout triggered. Forcing UI.');
      loader.classList.add('hidden');
      app.classList.remove('hidden');
      app.classList.add('visible');
    }
  }, 3000);

  try {
    document.getElementById('app-version').textContent = GAME_VERSION;
    
    const vk = new VKBridgeManager();
    await vk.init();

    const storage = new SaveManager(vk);
    const savedData = await storage.load();

    const engine = new GameEngine();
    if (savedData) engine.deserialize(savedData);

    const renderer = new UIRenderer();
    renderer.bind(engine);
    new UIControls(engine, renderer);

    const ads = new AdManager(vk);
    ads.initBanner();

    document.addEventListener('ad:reward:request', async () => {
      const success = await ads.showRewarded();
      if (success) { engine.setMultiplier(2, 60); ANALYTICS.trackEvent('ad_rewarded_success'); }
    });

    document.addEventListener('ad:interstitial:request', async () => {
      await ads.showInterstitial();
      ANALYTICS.trackEvent('ad_interstitial_success');
    });

    if (savedData?.lastTick) {
      engine.calculateOfflineProgress(savedData.lastTick);
    }

    setInterval(async () => {
      await storage.save(JSON.parse(engine.serialize()));
    }, IS_DEV ? 5000 : 30000);

    document.addEventListener('app:visibility', ({ detail }) => {
      detail.hidden ? engine.stop() : engine.start();
    });

    // ✅ Убираем таймер безопасности, если всё прошло успешно
    clearTimeout(safetyTimeout);
    
    await new Promise(res => setTimeout(res, 500)); // Мин. 0.5 сек лоадер
    renderer.showApp();
    engine.start();

    ANALYTICS.trackEvent('app_started', { dev: IS_DEV });
    if (IS_DEV) console.log('[Main] Dev mode active. Timers ×10, Ads stubbed.');
  } catch (err) {
    clearTimeout(safetyTimeout);
    console.error('[Main] Critical boot error:', err);
    document.getElementById('loader').innerHTML = `<p style="color:#ef4444;padding:20px;text-align:center">Ошибка загрузки. <br><a href="javascript:location.reload()" style="color:#fff">Обновить страницу</a></p>`;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
else bootstrap();
