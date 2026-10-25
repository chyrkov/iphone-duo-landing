/**
 * Scroll-driven number counters. The real value is in the HTML (and in an
 * sr-only twin), so screen readers and crawlers never see intermediate numbers.
 */
export class Counters {
  private items: { el: HTMLElement; to: number; dec: number; last: string }[];
  private start: number;

  constructor(root: HTMLElement) {
    const host = root.querySelector<HTMLElement>('[data-count-at]');
    this.start = host ? Number(host.dataset.countAt) : 0.2;
    this.items = [...root.querySelectorAll<HTMLElement>('[data-count]')].map((el) => {
      el.setAttribute('aria-live', 'off');
      return { el, to: Number(el.dataset.count), dec: Number(el.dataset.decimals ?? 0), last: '' };
    });
  }

  /** @param local chapter progress 0..1 */
  update(local: number) {
    if (!this.items.length) return;
    this.items.forEach((it, i) => {
      const t = Math.min(1, Math.max(0, (local - this.start - i * 0.03) / 0.28));
      const e = 1 - Math.pow(1 - t, 3);
      const s = (it.to * e).toFixed(it.dec);
      if (s !== it.last) {
        it.el.textContent = s;
        it.last = s;
      }
    });
  }
}
