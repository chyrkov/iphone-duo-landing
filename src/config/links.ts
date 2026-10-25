/** CTA destinations. Any element with data-link="<key>" gets this href. */
export const links = {
  buy: '#',
  preorder: '#',
  learnMore: '#story',
  specs: '#specs',
  compare: '#',
  accessories: '#',
  /** YouTube tutorial this page was built for — paste the video URL here. */
  tutorial: '#',
} as const;

export type LinkKey = keyof typeof links;

export function applyLinks(root: ParentNode = document): void {
  root.querySelectorAll<HTMLAnchorElement>('[data-link]').forEach((a) => {
    const key = a.dataset.link as LinkKey;
    if (key in links) a.href = links[key];
  });
}
