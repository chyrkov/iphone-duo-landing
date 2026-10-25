import { accessoryColors, colorways, pricing, strings } from '../config/copy';

function swatch(name: string, hex: string, checked: boolean): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', String(checked));
  b.setAttribute('aria-label', name);
  b.style.setProperty('--c', hex);
  b.innerHTML = '<i aria-hidden="true"></i>';
  return b;
}

/** Arrow-key support for a radiogroup of swatches. */
function radioGroup(buttons: HTMLButtonElement[], onPick: (i: number) => void) {
  const pick = (i: number, focus = false) => {
    buttons.forEach((b, j) => {
      b.setAttribute('aria-checked', String(i === j));
      b.tabIndex = i === j ? 0 : -1;
    });
    if (focus) buttons[i].focus();
    onPick(i);
  };
  buttons.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => pick(i));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); pick((i + 1) % buttons.length, true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); pick((i - 1 + buttons.length) % buttons.length, true); }
    });
  });
}

/** Colorway swatches: calls back with 0 (Star White) or 1 (Night Sky). */
export function initColorPicker(onChange: (t: number) => void) {
  const host = document.getElementById('swatches');
  const label = document.getElementById('swatch-name');
  if (!host) return;
  const buttons = colorways.map((c, i) => swatch(c.name, c.swatch, i === 0));
  host.append(...buttons);
  radioGroup(buttons, (i) => {
    if (label) label.textContent = colorways[i].name;
    onChange(i);
  });
}

/** Case / folio colour chips. */
export function initAccessoryPickers(onChange: (kind: 'case' | 'folio', hex: string) => void) {
  (['case', 'folio'] as const).forEach((kind) => {
    const host = document.querySelector<HTMLElement>(`[data-acc="${kind}"] .acc__colors`);
    if (!host) return;
    const list = accessoryColors[kind];
    const buttons = list.map((c, i) => swatch(c.name, c.hex, i === 0));
    host.append(...buttons);
    radioGroup(buttons, (i) => onChange(kind, list[i].hex));
  });
}

export function renderPricing() {
  const grid = document.getElementById('pricing-grid');
  if (!grid) return;
  grid.innerHTML = pricing
    .map((t) => `
      <article class="tier${t.price ? '' : ' tier--tbc'}" role="listitem">
        <h3>${t.capacity}</h3>
        <p class="tier__price">${t.price ?? strings.priceTbc}</p>
        ${t.monthly ? `<p class="tier__monthly">or ${t.monthly}</p>` : ''}
        <a class="btn btn--ghost btn--sm" data-link="buy" href="#">Buy ${t.capacity}</a>
      </article>`)
    .join('');
}
