/** Smooth height animation for the <details> FAQ (works without JS too). */
export function initFaq(reduced: boolean) {
  if (reduced) return;
  document.querySelectorAll<HTMLDetailsElement>('.faq details').forEach((d) => {
    const summary = d.querySelector('summary')!;
    const body = d.querySelector<HTMLElement>(':scope > div')!;
    let anim: Animation | null = null;
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      anim?.cancel();
      if (!d.open) {
        d.open = true;
        const h = body.scrollHeight;
        anim = body.animate({ height: ['0px', `${h}px`], opacity: [0, 1] }, { duration: 380, easing: 'cubic-bezier(.22,.61,.21,1)' });
      } else {
        const h = body.scrollHeight;
        anim = body.animate({ height: [`${h}px`, '0px'], opacity: [1, 0] }, { duration: 300, easing: 'cubic-bezier(.65,0,.35,1)' });
        anim.onfinish = () => (d.open = false);
      }
    });
  });
}
