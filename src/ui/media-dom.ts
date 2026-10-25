import { slot, url, type MediaKey } from '../config/media';

/**
 * Fill every [data-media="key"] element from the media manifest.
 * Videos load lazily and only play while on screen.
 */
export function initMediaDom() {
  const videos: HTMLVideoElement[] = [];
  document.querySelectorAll<HTMLElement>('[data-media]').forEach((el) => {
    const s = slot(el.dataset.media as MediaKey);
    if (!s) return;
    if (el instanceof HTMLImageElement) {
      if (!s.src) {
        el.closest('figure')?.classList.add('is-placeholder');
        return;
      }
      el.src = url(s.src);
      if (s.srcSmall) {
        el.srcset = `${url(s.srcSmall)} 640w, ${url(s.src)} 1272w`;
        el.sizes = '(max-width: 600px) 100vw, 1200px';
      }
      if (!el.alt) el.alt = s.alt;
    } else if (el instanceof HTMLVideoElement) {
      if (!s.src) return;
      el.dataset.src = url(s.src);
      if (s.poster) el.poster = url(s.poster);
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', s.alt);
      videos.push(el);
    }
  });

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) {
          v.src = v.dataset.src;
          v.load();
        }
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }
  }, { threshold: 0.25 });
  videos.forEach((v) => io.observe(v));
}
