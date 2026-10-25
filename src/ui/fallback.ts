import { slot, url, type MediaKey } from '../config/media';
import type { Story } from '../scroll/timeline';

/**
 * No-WebGL fallback: a poster image per chapter. The Unfold chapter scrubs
 * through the supplied unfold frames, so the story still reads.
 */
const MAP: Record<string, MediaKey[]> = {
  hero: ['hero.still'],
  unfold: ['film.unfold1', 'film.unfold2', 'film.unfold3', 'film.unfold4', 'film.displayEnd'],
  display: ['film.displayEnd'],
  ios: ['film.siri'],
  durability: ['hero.still'],
  posable: ['hero.still'],
  cameras: ['hero.still'],
  chip: ['film.displayEnd'],
  battery: ['film.displayEnd'],
  siri: ['film.siri'],
  colors: ['hero.still'],
  accessories: ['hero.still'],
  buy: ['hero.still'],
};

export class Fallback {
  private imgs = new Map<MediaKey, HTMLImageElement>();
  private host = document.getElementById('fallback')!;
  private current: HTMLImageElement | null = null;

  constructor(private readonly story: Story) {
    const keys = new Set(Object.values(MAP).flat());
    for (const k of keys) {
      const s = slot(k);
      if (!s.src) continue;
      const img = document.createElement('img');
      img.src = url(s.src);
      img.alt = '';
      img.decoding = 'async';
      this.host.append(img);
      this.imgs.set(k, img);
    }
  }

  update(time: number) {
    const { chapter, local } = this.story.chapterAt(time);
    const list = MAP[chapter.id] ?? ['hero.still'];
    const key = list[Math.min(list.length - 1, Math.floor(local * list.length))];
    const img = this.imgs.get(key) ?? null;
    this.host.classList.toggle('side-right', chapter.side === 'right');
    if (img !== this.current) {
      this.current?.classList.remove('is-on');
      img?.classList.add('is-on');
      this.current = img;
    }
  }
}
