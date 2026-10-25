import type { ChapterRange, Story } from '../scroll/timeline';
import { Counters } from './counters';

/**
 * Chapter text panels. Visibility, masked line reveals, staged cards and pose
 * highlights are pure functions of timeline time, so they reverse with scroll.
 */

interface PanelItem {
  chapter: ChapterRange;
  el: HTMLElement;
  reveals: HTMLElement[];
  steps: { el: HTMLElement; at: number }[];
  ranges: { el: HTMLElement; a: number; b: number }[];
  counters: Counters;
  last: { o: number; vis: boolean };
  lastR: number[];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  if (b <= a) return v >= a ? 1 : 0;
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export class Panels {
  private items: PanelItem[] = [];

  constructor(private readonly story: Story, private readonly reduced: boolean) {
    for (const chapter of story.chapters) {
      const el = document.querySelector<HTMLElement>(`.panel[data-chapter="${chapter.id}"]`);
      if (!el) continue;
      el.dataset.side = chapter.side;
      this.items.push({
        chapter,
        el,
        reveals: [...el.querySelectorAll<HTMLElement>('[data-reveal]')],
        steps: [...el.querySelectorAll<HTMLElement>('[data-step]')].map((s) => ({ el: s, at: Number(s.dataset.step) })),
        ranges: [...el.querySelectorAll<HTMLElement>('[data-range]')].map((s) => {
          const [a, b] = s.dataset.range!.split('-').map(Number);
          return { el: s, a, b };
        }),
        counters: new Counters(el),
        last: { o: -1, vis: false },
        lastR: [],
      });
    }
  }

  /** @param time timeline time  @param intro 0..1 load-in for the hero */
  update(time: number, intro: number) {
    const { chapter: current, local } = this.story.chapterAt(time);
    for (const it of this.items) {
      const active = it.chapter === current;
      const inW = it.chapter.textIn ?? [0, 0.12];
      const outW = it.chapter.textOut ?? [0.86, 1];
      let o = 0;
      if (active) o = this.reduced ? 1 : smooth(inW[0], inW[1], local) * (1 - smooth(outW[0], outW[1], local));
      if (it.chapter.index === 0 && active) o *= clamp01(intro * 3);
      this.write(it, o);
      if (o <= 0) continue;

      // Staggered reveals
      const isHero = it.chapter.index === 0;
      it.reveals.forEach((r, i) => {
        let v = 1;
        if (!this.reduced) {
          v = isHero
            ? easeOut(clamp01((intro - 0.25 - i * 0.08) / 0.45))
            : easeOut(clamp01((local - inW[0] - 0.02 - i * 0.028) / 0.14));
        }
        v = Math.round(v * 1000) / 1000;
        if (it.lastR[i] !== v) {
          r.style.setProperty('--r', String(v));
          it.lastR[i] = v;
        }
      });

      for (const s of it.steps) s.el.classList.toggle('is-on', this.reduced || local >= s.at);
      for (const r of it.ranges) r.el.classList.toggle('is-active', local >= r.a && (local < r.b || r.b >= 1));
      it.counters.update(this.reduced ? 1 : local);
    }
  }

  private write(it: PanelItem, o: number) {
    const rounded = Math.round(o * 1000) / 1000;
    if (rounded === it.last.o) return;
    it.last.o = rounded;
    if (!this.reduced) it.el.style.opacity = String(rounded);
    else it.el.style.opacity = rounded > 0 ? '1' : '0';
    const vis = rounded > 0;
    if (vis !== it.last.vis) {
      it.el.classList.toggle('is-visible', vis);
      it.el.toggleAttribute('inert', !vis);
      it.last.vis = vis;
    }
    it.el.style.transform = this.reduced ? '' : `translate3d(0, ${((1 - rounded) * 10).toFixed(2)}px, 0)`;
  }
}
