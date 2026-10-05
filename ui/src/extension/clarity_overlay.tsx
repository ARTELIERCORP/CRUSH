import { createRoot, Root } from 'react-dom/client';
import { CrushAsrPipeline } from './asr_pipeline';
import { AsrHud } from '../components/AsrHud';
import { AsrConfig } from '../types';

declare global {
  interface Window {
    __crushClarityLoaded?: boolean;
    CrushAsrPipeline?: typeof CrushAsrPipeline;
  }
}

if (!window.__crushClarityLoaded) {
  window.__crushClarityLoaded = true;

  const DEFAULT_CONFIG: AsrConfig = {
    enabled: false,
    splitEnabled: false,
    splitX: 0.50,
    sharpness: 0.30,
  };

  const loadConfig = (): AsrConfig => {
    try {
      const raw = localStorage.getItem('crush_asr_config');
      if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch (_) {}
    return { ...DEFAULT_CONFIG };
  };

  const saveConfig = (cfg: AsrConfig): void => {
    try {
      localStorage.setItem('crush_asr_config', JSON.stringify(cfg));
    } catch (_) {}
  };

  const currentConfig: AsrConfig = loadConfig();

  class ClarityPlayerController {
    player: HTMLElement;
    video: HTMLVideoElement;
    pipeline: CrushAsrPipeline | null = null;
    canvas: HTMLCanvasElement | null = null;
    hudContainer: HTMLDivElement | null = null;
    hudRoot: Root | null = null;
    divider: HTMLDivElement | null = null;
    rafId: number | null = null;
    hideTimer: number | null = null;
    isDragging: boolean = false;
    resizeObserver: ResizeObserver | null = null;
    styleObserver: MutationObserver | null = null;

    constructor(player: HTMLElement, video: HTMLVideoElement) {
      this.player = player;
      this.video = video;

      this.createCanvas();
      this.createHud();
      this.createSplitDivider();
      this.bindEvents();
      this.bindObservers();
      this.syncState();

      this.showHud(2200);
    }

    createCanvas(): void {
      const container = this.video.parentElement || this.player;
      const existing = container.querySelector('.crush-asr-canvas');
      if (existing) existing.remove();

      this.canvas = document.createElement('canvas');
      this.canvas.className = 'crush-asr-canvas';
      this.canvas.style.position = 'absolute';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '10';
      this.canvas.style.display = 'none';

      if (this.video.nextSibling) {
        container.insertBefore(this.canvas, this.video.nextSibling);
      } else {
        container.appendChild(this.canvas);
      }
      this.updateGeometry();
    }

    createHud(): void {
      const existingHud = this.player.querySelector('.crush-clarity-hud-root');
      if (existingHud) existingHud.remove();

      this.hudContainer = document.createElement('div');
      this.hudContainer.className = 'crush-clarity-hud-root';
      this.hudContainer.style.position = 'absolute';
      this.hudContainer.style.top = '16px';
      this.hudContainer.style.left = '50%';
      this.hudContainer.style.transform = 'translateX(-50%)';
      this.hudContainer.style.zIndex = '35';
      this.hudContainer.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

      if (window.getComputedStyle(this.player).position === 'static') {
        this.player.style.position = 'relative';
      }

      this.player.appendChild(this.hudContainer);
      this.hudRoot = createRoot(this.hudContainer);
      this.renderHud();
    }

    renderHud(): void {
      if (!this.hudRoot) return;

      this.hudRoot.render(
        <AsrHud
          initialConfig={currentConfig}
          onToggleAsr={(enabled) => {
            currentConfig.enabled = enabled;
            if (!enabled) currentConfig.splitEnabled = false;
            saveConfig(currentConfig);
            this.syncState();
          }}
          onToggleCompare={(splitEnabled) => {
            if (!currentConfig.enabled) return;
            currentConfig.splitEnabled = splitEnabled;
            saveConfig(currentConfig);
            this.syncState();
          }}
          onPip={() => {
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(() => {});
            } else if (this.video && this.video.requestPictureInPicture) {
              this.video.requestPictureInPicture().catch(() => {});
            }
          }}
        />
      );
    }

    createSplitDivider(): void {
      const existingDivider = this.player.querySelector('.crush-split-divider');
      if (existingDivider) existingDivider.remove();

      this.divider = document.createElement('div');
      this.divider.className = 'crush-split-divider';
      this.divider.style.position = 'absolute';
      this.divider.style.top = '0';
      this.divider.style.bottom = '0';
      this.divider.style.width = '2px';
      this.divider.style.background = 'rgba(255, 255, 255, 0.4)';
      this.divider.style.zIndex = '25';
      this.divider.style.cursor = 'ew-resize';
      this.divider.style.left = `${currentConfig.splitX * 100}%`;
      this.divider.style.display = 'none';

      const handle = document.createElement('div');
      handle.style.position = 'absolute';
      handle.style.top = '50%';
      handle.style.left = '50%';
      handle.style.transform = 'translate(-50%, -50%)';
      handle.style.width = '28px';
      handle.style.height = '28px';
      handle.style.borderRadius = '50%';
      handle.style.background = 'rgba(15, 18, 26, 0.85)';
      handle.style.border = '1px solid rgba(255, 255, 255, 0.3)';
      handle.style.color = '#fff';
      handle.style.display = 'flex';
      handle.style.alignItems = 'center';
      handle.style.justifyContent = 'center';
      handle.style.fontSize = '10px';
      handle.style.userSelect = 'none';
      handle.textContent = '◂ ▸';

      this.divider.appendChild(handle);
      this.player.appendChild(this.divider);
    }

    updateGeometry(): void {
      if (!this.canvas || !this.video) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.video.offsetWidth || this.video.clientWidth || this.video.videoWidth || 1280;
      const h = this.video.offsetHeight || this.video.clientHeight || this.video.videoHeight || 720;
      const targetW = Math.min(Math.round(w * dpr), 1920);
      const targetH = Math.min(Math.round(h * dpr), 1080);

      const topPx = `${this.video.offsetTop}px`;
      const leftPx = `${this.video.offsetLeft}px`;
      const widthPx = `${w}px`;
      const heightPx = `${h}px`;

      if (this.canvas.style.top !== topPx) this.canvas.style.top = topPx;
      if (this.canvas.style.left !== leftPx) this.canvas.style.left = leftPx;
      if (this.canvas.style.width !== widthPx) this.canvas.style.width = widthPx;
      if (this.canvas.style.height !== heightPx) this.canvas.style.height = heightPx;

      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }
    }

    bindObservers(): void {
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.updateGeometry());
        this.resizeObserver.observe(this.video);
        if (this.video.parentElement) {
          this.resizeObserver.observe(this.video.parentElement);
        }
      }
      if (window.MutationObserver) {
        this.styleObserver = new MutationObserver(() => this.updateGeometry());
        this.styleObserver.observe(this.video, { attributes: true, attributeFilter: ['style', 'class'] });
      }
    }

    bindEvents(): void {
      const onMouseMove = () => this.showHud(2200);
      this.player.addEventListener('mousemove', onMouseMove);
      this.player.addEventListener('mouseenter', onMouseMove);
      this.player.addEventListener('mouseleave', () => this.hideHud());

      const onDragStart = (e: MouseEvent | TouchEvent) => {
        this.isDragging = true;
        e.preventDefault();
      };

      const onDragMove = (e: MouseEvent | TouchEvent) => {
        if (!this.isDragging || !this.divider) return;
        const rect = this.player.getBoundingClientRect();
        if (rect.width <= 0) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const relX = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
        currentConfig.splitX = relX;
        this.divider.style.left = `${relX * 100}%`;
        if (this.pipeline) {
          this.pipeline.splitX = relX;
        }
      };

      const onDragEnd = () => {
        if (this.isDragging) {
          this.isDragging = false;
          saveConfig(currentConfig);
        }
      };

      if (this.divider) {
        this.divider.addEventListener('mousedown', onDragStart);
        this.divider.addEventListener('touchstart', onDragStart, { passive: false });
      }
      window.addEventListener('mousemove', onDragMove);
      window.addEventListener('touchmove', onDragMove, { passive: false });
      window.addEventListener('mouseup', onDragEnd);
      window.addEventListener('touchend', onDragEnd);
    }

    showHud(autoFadeMs: number): void {
      if (this.hideTimer) window.clearTimeout(this.hideTimer);
      if (this.hudContainer) {
        this.hudContainer.style.opacity = '1';
        this.hudContainer.style.pointerEvents = 'auto';
      }
      if (autoFadeMs > 0) {
        this.hideTimer = window.setTimeout(() => this.hideHud(), autoFadeMs);
      }
    }

    hideHud(): void {
      if (this.hideTimer) window.clearTimeout(this.hideTimer);
      if (this.hudContainer) {
        this.hudContainer.style.opacity = '0';
        this.hudContainer.style.pointerEvents = 'none';
      }
    }

    startPipeline(): void {
      if (!this.pipeline && this.canvas) {
        try {
          const PipelineClass = window.CrushAsrPipeline || CrushAsrPipeline;
          this.pipeline = new PipelineClass(this.canvas);
        } catch (e) {
          console.error('[Crush ASR] Pipeline initialization failed:', e);
          return;
        }
      }
      if (!this.pipeline || !this.canvas) return;

      this.pipeline.splitEnabled = currentConfig.splitEnabled;
      this.pipeline.splitX = currentConfig.splitX;

      this.updateGeometry();

      let renderedOnce = false;
      const step = () => {
        if (!currentConfig.enabled) return;

        if (this.video.readyState >= 2 && this.pipeline && this.canvas) {
          try {
            this.pipeline.render(this.video);
            if (!renderedOnce) {
              this.canvas.style.display = 'block';
              renderedOnce = true;
            }
          } catch (e) {
            console.error('[Crush ASR] Render error:', e);
            this.canvas.style.display = 'none';
            renderedOnce = false;
          }
        }

        this.rafId = requestAnimationFrame(step);
      };

      this.rafId = requestAnimationFrame(step);
    }

    stopPipeline(): void {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.canvas) {
        this.canvas.style.display = 'none';
      }
    }

    syncState(): void {
      const isEnabled = currentConfig.enabled;
      this.renderHud();

      if (!this.divider) return;

      if (!isEnabled) {
        this.stopPipeline();
        this.divider.style.display = 'none';
        return;
      }

      if (currentConfig.splitEnabled) {
        this.divider.style.left = `${currentConfig.splitX * 100}%`;
        this.divider.style.display = 'block';
      } else {
        this.divider.style.display = 'none';
      }

      this.startPipeline();
    }
  }

  let observer: MutationObserver | null = null;

  const initClarityEngine = (): void => {
    const video = document.querySelector<HTMLVideoElement>('#movie_player video') || document.querySelector<HTMLVideoElement>('video');
    if (!video) return;

    const player = (video.closest('#movie_player') || video.parentElement) as HTMLElement | null;
    if (!player) return;

    const playerRecord = player as HTMLElement & { __crushClarityController?: ClarityPlayerController };
    if (playerRecord.__crushClarityController) return;
    playerRecord.__crushClarityController = new ClarityPlayerController(player, video);

    if (observer) {
      observer.disconnect();
    }
  };

  let scanTimer: number | null = null;
  const scheduleScan = (): void => {
    if (scanTimer) window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(initClarityEngine, 200);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleScan);
  } else {
    scheduleScan();
  }

  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        scheduleScan();
        break;
      }
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('yt-navigate-finish', scheduleScan);
  window.addEventListener('popstate', scheduleScan);
}
