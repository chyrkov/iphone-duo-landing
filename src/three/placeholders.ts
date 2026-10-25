/**
 * Generated, clearly labelled placeholder screens. Every drawer paints a
 * plausible UI so the page reads well before real media arrives, and stamps
 * the media key so it is obvious what still needs a file.
 */

export type Rotation = 'none' | 'cw' | 'ccw';
type Draw = (g: CanvasRenderingContext2D, w: number, h: number, imgs: Record<string, HTMLImageElement | undefined>) => void;

interface Spec { draw: Draw; rot: Rotation; dark?: boolean }

const FONT = '"Inter Tight", "Helvetica Neue", system-ui, sans-serif';

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function wallpaper(g: CanvasRenderingContext2D, w: number, h: number, a: string, b: string, c: string) {
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, a);
  grd.addColorStop(0.55, b);
  grd.addColorStop(1, c);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight = 600, color = '#fff', align: CanvasTextAlign = 'left') {
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  g.fillText(s, x, y);
}

function iconGrid(g: CanvasRenderingContext2D, x0: number, y0: number, cols: number, rows: number, size: number, gap: number, seed: number) {
  const hues = [12, 38, 145, 200, 220, 265, 300, 340, 175, 52];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c + seed) % hues.length;
      const x = x0 + c * (size + gap);
      const y = y0 + r * (size + gap + size * 0.28);
      const grd = g.createLinearGradient(x, y, x + size, y + size);
      grd.addColorStop(0, `hsl(${hues[i]} 80% 62%)`);
      grd.addColorStop(1, `hsl(${(hues[i] + 30) % 360} 75% 45%)`);
      g.fillStyle = grd;
      rr(g, x, y, size, size, size * 0.24);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)';
      rr(g, x + size * 0.15, y + size + size * 0.1, size * 0.7, size * 0.08, size * 0.04);
      g.fill();
    }
  }
}

function widget(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, big: string, tint = 'rgba(255,255,255,.18)') {
  g.fillStyle = tint;
  rr(g, x, y, w, h, Math.min(w, h) * 0.16);
  g.fill();
  text(g, title, x + w * 0.09, y + h * 0.22, h * 0.11, 600, 'rgba(255,255,255,.8)');
  text(g, big, x + w * 0.09, y + h * 0.62, h * 0.3, 500, '#fff');
}

const specs: Record<string, Spec> = {
  'screen.inner.home': {
    rot: 'none',
    draw: (g, w, h) => {
      wallpaper(g, w, h, '#1b2a4a', '#3d2b5c', '#c46b5a');
      const s = h * 0.1;
      // page 1 — widgets + icons
      widget(g, w * 0.05, h * 0.09, w * 0.19, h * 0.36, 'Weather', '22°', 'rgba(70,140,255,.45)');
      widget(g, w * 0.26, h * 0.09, w * 0.19, h * 0.36, 'Calendar', 'Wed 1', 'rgba(255,255,255,.16)');
      iconGrid(g, w * 0.06, h * 0.56, 4, 2, s, s * 0.85, 0);
      // page 2 — icons
      iconGrid(g, w * 0.56, h * 0.1, 4, 4, s, s * 0.85, 3);
      // dock on the side
      g.fillStyle = 'rgba(255,255,255,.18)';
      rr(g, w * 0.955, h * 0.2, w * 0.03, h * 0.6, w * 0.015);
      g.fill();
    },
  },
  'screen.inner.todayView': {
    rot: 'cw', // device is rotated to portrait in the iOS 27 chapter
    draw: (g, w, h) => {
      wallpaper(g, w, h, '#0f1d33', '#24395c', '#6b4f7a');
      text(g, 'Today', w * 0.07, h * 0.1, h * 0.05, 700);
      const cw = w * 0.41, ch = h * 0.17;
      widget(g, w * 0.07, h * 0.14, cw, ch, 'Weather', '22° Sunny', 'rgba(70,140,255,.5)');
      widget(g, w * 0.52, h * 0.14, cw, ch, 'Fitness', '412 kcal', 'rgba(255,80,110,.45)');
      widget(g, w * 0.07, h * 0.34, w * 0.86, ch * 0.9, 'Up Next', 'Design review · 10:00', 'rgba(255,255,255,.16)');
      widget(g, w * 0.07, h * 0.52, cw, ch, 'Photos', 'Memories', 'rgba(255,190,90,.45)');
      widget(g, w * 0.52, h * 0.52, cw, ch, 'Battery', '100%', 'rgba(80,220,140,.4)');
      iconGrid(g, w * 0.1, h * 0.74, 4, 1, w * 0.14, w * 0.08, 5);
      // vertical Dynamic Island
      g.fillStyle = '#000';
      rr(g, w * 0.965, h * 0.42, w * 0.02, h * 0.12, w * 0.01);
      g.fill();
    },
  },
  'screen.inner.netflix': {
    rot: 'none',
    draw: (g, w, h) => {
      const grd = g.createRadialGradient(w * 0.62, h * 0.4, 10, w * 0.6, h * 0.45, w * 0.7);
      grd.addColorStop(0, '#e2733a');
      grd.addColorStop(0.45, '#5b1f2a');
      grd.addColorStop(1, '#07070a');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      text(g, 'Streaming app', w * 0.06, h * 0.16, h * 0.05, 700, '#e50914');
      text(g, 'Desert Light', w * 0.06, h * 0.62, h * 0.11, 700);
      text(g, 'Season 1 · Episode 3', w * 0.06, h * 0.7, h * 0.04, 500, 'rgba(255,255,255,.8)');
      g.fillStyle = 'rgba(255,255,255,.3)';
      g.fillRect(w * 0.06, h * 0.86, w * 0.88, h * 0.008);
      g.fillStyle = '#e50914';
      g.fillRect(w * 0.06, h * 0.86, w * 0.36, h * 0.008);
    },
  },
  'screen.inner.zoom': {
    rot: 'none',
    draw: (g, w, h) => {
      g.fillStyle = '#121214';
      g.fillRect(0, 0, w, h);
      const hues = [210, 25, 150, 280, 340, 45];
      const cols = 3, rows = 2, pad = w * 0.02;
      const tw = (w - pad * (cols + 1)) / cols, th = (h * 0.84 - pad * (rows + 1)) / rows;
      for (let i = 0; i < 6; i++) {
        const x = pad + (i % cols) * (tw + pad), y = pad + Math.floor(i / cols) * (th + pad);
        const grd = g.createLinearGradient(x, y, x, y + th);
        grd.addColorStop(0, `hsl(${hues[i]} 30% 38%)`);
        grd.addColorStop(1, `hsl(${hues[i]} 25% 18%)`);
        g.fillStyle = grd;
        rr(g, x, y, tw, th, 18);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.22)';
        g.beginPath();
        g.arc(x + tw / 2, y + th * 0.45, th * 0.18, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#1f1f23';
      g.fillRect(0, h * 0.86, w, h * 0.14);
      text(g, 'Video meeting app', w * 0.5, h * 0.945, h * 0.04, 600, '#4f8bff', 'center');
    },
  },
  'screen.inner.slack': {
    rot: 'none',
    draw: (g, w, h) => {
      g.fillStyle = '#3f0e40';
      g.fillRect(0, 0, w * 0.3, h);
      g.fillStyle = '#f8f8f8';
      g.fillRect(w * 0.3, 0, w * 0.7, h);
      text(g, 'Team chat app', w * 0.03, h * 0.09, h * 0.042, 700);
      ['# launch', '# design', '# hinge-team', '# general'].forEach((c, i) => text(g, c, w * 0.03, h * (0.18 + i * 0.07), h * 0.036, 500, 'rgba(255,255,255,.8)'));
      for (let i = 0; i < 5; i++) {
        const y = h * (0.1 + i * 0.16);
        g.fillStyle = `hsl(${i * 70} 60% 60%)`;
        rr(g, w * 0.33, y, h * 0.07, h * 0.07, 10);
        g.fill();
        text(g, ['Ava', 'Noah', 'Mia', 'Leo', 'Zoe'][i], w * 0.33 + h * 0.1, y + h * 0.03, h * 0.032, 700, '#1d1c1d');
        g.fillStyle = '#c9c9cc';
        rr(g, w * 0.33 + h * 0.1, y + h * 0.05, w * (0.3 + (i % 3) * 0.08), h * 0.022, 6);
        g.fill();
      }
    },
  },
  'screen.inner.photos': {
    rot: 'none',
    draw: (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      const n = 8, s = w / n;
      for (let i = 0; i < n * 6; i++) {
        const x = (i % n) * s, y = Math.floor(i / n) * s;
        const hue = (i * 37) % 360;
        const grd = g.createLinearGradient(x, y, x + s, y + s);
        grd.addColorStop(0, `hsl(${hue} 55% 55%)`);
        grd.addColorStop(1, `hsl(${(hue + 50) % 360} 45% 30%)`);
        g.fillStyle = grd;
        g.fillRect(x + 2, y + 2, s - 4, s - 4);
      }
    },
  },
  'screen.inner.standby': {
    rot: 'none',
    draw: (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      text(g, '9:41', w * 0.27, h * 0.66, h * 0.42, 300, '#ff9f5a', 'center');
      g.fillStyle = '#1c1c1e';
      rr(g, w * 0.55, h * 0.14, w * 0.4, h * 0.72, 40);
      g.fill();
      text(g, 'APRIL', w * 0.6, h * 0.26, h * 0.05, 700, '#ff453a');
      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      days.forEach((d, i) => text(g, d, w * (0.6 + i * 0.05), h * 0.36, h * 0.04, 600, 'rgba(255,255,255,.55)'));
      for (let d = 1; d <= 30; d++) {
        const col = (d + 2) % 7, row = Math.floor((d + 2) / 7);
        const x = w * (0.6 + col * 0.05), y = h * (0.45 + row * 0.08);
        if (d === 1) {
          g.fillStyle = '#ff453a';
          g.beginPath();
          g.arc(x + h * 0.012, y - h * 0.014, h * 0.032, 0, Math.PI * 2);
          g.fill();
        }
        text(g, String(d), x, y, h * 0.036, 500, '#fff');
      }
    },
  },
  'screen.inner.facetime': {
    rot: 'ccw', // laptop pose: hinge runs left–right
    draw: (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#3a4a5e');
      grd.addColorStop(1, '#141a22');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,220,190,.35)';
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.36, w * 0.16, h * 0.16, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.62, w * 0.3, h * 0.16, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#263241';
      rr(g, w * 0.7, h * 0.06, w * 0.24, h * 0.24, 22);
      g.fill();
      text(g, 'FaceTime', w * 0.06, h * 0.08, h * 0.04, 600);
      g.fillStyle = '#ff3b30';
      g.beginPath();
      g.arc(w * 0.5, h * 0.88, h * 0.05, 0, Math.PI * 2);
      g.fill();
    },
  },
  'screen.inner.siri': {
    rot: 'none',
    draw: (g, w, h, imgs) => {
      // Left: Siri AI conversation. Right: the right half of the Split View image.
      const split = imgs['screen.inner.splitView'];
      g.fillStyle = '#f2f2f5';
      g.fillRect(0, 0, w, h);
      if (split) g.drawImage(split, split.width / 2, 0, split.width / 2, split.height, w / 2, 0, w / 2, h);
      const grd = g.createLinearGradient(0, 0, w / 2, h);
      grd.addColorStop(0, '#0d0f1a');
      grd.addColorStop(1, '#1d1430');
      g.fillStyle = grd;
      g.fillRect(0, 0, w / 2 - 6, h);
      const orb = g.createRadialGradient(w * 0.25, h * 0.27, 4, w * 0.25, h * 0.27, h * 0.15);
      orb.addColorStop(0, '#ffffff');
      orb.addColorStop(0.35, '#ff7ad9');
      orb.addColorStop(0.7, '#6b7bff');
      orb.addColorStop(1, 'rgba(60,200,255,0)');
      g.fillStyle = orb;
      g.beginPath();
      g.arc(w * 0.25, h * 0.27, h * 0.15, 0, Math.PI * 2);
      g.fill();
      text(g, 'Siri', w * 0.25, h * 0.5, h * 0.05, 700, '#fff', 'center');
      g.fillStyle = 'rgba(255,255,255,.1)';
      rr(g, w * 0.05, h * 0.57, w * 0.4, h * 0.13, 26);
      g.fill();
      text(g, '“Summarize this email and', w * 0.075, h * 0.625, h * 0.032, 500, 'rgba(255,255,255,.9)');
      text(g, 'draft a reply.”', w * 0.075, h * 0.672, h * 0.032, 500, 'rgba(255,255,255,.9)');
      g.fillStyle = 'rgba(120,140,255,.22)';
      rr(g, w * 0.05, h * 0.74, w * 0.4, h * 0.17, 26);
      g.fill();
      text(g, 'Mindy is back from a foggy hike', w * 0.075, h * 0.795, h * 0.03, 500, '#fff');
      text(g, 'near Eibsee and shared a summit', w * 0.075, h * 0.84, h * 0.03, 500, '#fff');
      text(g, 'photo. Draft ready to review.', w * 0.075, h * 0.885, h * 0.03, 500, '#fff');
    },
  },
  'screen.outer.facetime': {
    rot: 'ccw', // tent pose: hinge on top
    draw: (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, '#2c3d52');
      grd.addColorStop(1, '#0f141c');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,214,186,.38)';
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.42, w * 0.13, h * 0.2, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.82, w * 0.3, h * 0.2, 0, 0, Math.PI * 2);
      g.fill();
      text(g, 'FaceTime · hands-free', w * 0.05, h * 0.1, h * 0.06, 600);
    },
  },
  'screen.outer.netflixClips': {
    rot: 'none',
    draw: (g, w, h) => {
      wallpaper(g, w, h, '#120b10', '#5b1f2a', '#e2733a');
      text(g, 'Clips', w * 0.08, h * 0.1, h * 0.04, 700, '#e50914');
    },
  },
};

const generic: Spec = {
  rot: 'none',
  draw: (g, w, h) => wallpaper(g, w, h, '#1d2433', '#2c2340', '#3b2a2a'),
};

/** Paint a placeholder for `key` into a canvas of size w×h (screen orientation). */
export function drawPlaceholder(key: string, w: number, h: number, imgs: Record<string, HTMLImageElement | undefined>): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const spec = specs[key] ?? generic;
  g.save();
  let cw = w, ch = h;
  if (spec.rot === 'cw') { g.translate(w, 0); g.rotate(Math.PI / 2); cw = h; ch = w; }
  if (spec.rot === 'ccw') { g.translate(0, h); g.rotate(-Math.PI / 2); cw = h; ch = w; }
  spec.draw(g, cw, ch, imgs);
  stamp(g, key, cw, ch);
  g.restore();
  return c;
}

function stamp(g: CanvasRenderingContext2D, key: string, w: number, h: number) {
  const label = `PLACEHOLDER · ${key}`;
  const size = Math.max(14, Math.round(Math.min(w, h) * 0.026));
  g.font = `600 ${size}px ${FONT}`;
  const tw = g.measureText(label).width;
  const x = (w - tw) / 2 - size * 0.8, y = h - size * 3.4;
  g.fillStyle = 'rgba(0,0,0,.55)';
  rr(g, x, y, tw + size * 1.6, size * 1.9, size);
  g.fill();
  g.strokeStyle = 'rgba(255,214,10,.9)';
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = '#ffd60a';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(label, x + size * 0.8, y + size * 0.97);
}
