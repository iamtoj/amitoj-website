export type NavigationPlacement = 'primary' | 'footer';

type NavigationMatch =
  | { kind: 'exact'; paths: readonly string[] }
  | { kind: 'segment'; roots: readonly string[] };

export interface NavigationItem {
  id: string;
  label: string;
  href: `/${string}`;
  placements: readonly NavigationPlacement[];
  match: NavigationMatch;
}

export const navigationItems = [
  {
    id: 'about',
    label: 'About',
    href: '/about',
    placements: ['primary', 'footer'],
    match: { kind: 'exact', paths: ['/about'] },
  },
  {
    id: 'research',
    label: 'Research',
    href: '/research',
    placements: ['primary', 'footer'],
    match: { kind: 'segment', roots: ['/research'] },
  },
  {
    id: 'practices',
    label: 'Practices',
    href: '/practices',
    placements: ['primary', 'footer'],
    match: { kind: 'exact', paths: ['/practices'] },
  },
  {
    id: 'coaching',
    label: 'Coaching',
    href: '/coaching',
    placements: ['footer'],
    match: { kind: 'exact', paths: ['/coaching'] },
  },
  {
    id: 'yoga',
    label: 'Yoga',
    href: '/yoga',
    placements: ['footer'],
    match: { kind: 'exact', paths: ['/yoga'] },
  },
  {
    id: 'photography',
    label: 'Photography',
    href: '/photography',
    placements: ['footer'],
    match: { kind: 'exact', paths: ['/photography'] },
  },
  {
    id: 'writing',
    label: 'Writing',
    href: '/writing',
    placements: ['primary', 'footer'],
    match: { kind: 'segment', roots: ['/writing', '/essays', '/blog'] },
  },
  {
    id: 'library',
    label: 'Library',
    href: '/library',
    placements: ['primary', 'footer'],
    match: { kind: 'segment', roots: ['/library'] },
  },
  {
    id: 'contact',
    label: 'Contact',
    href: '/contact',
    placements: ['primary', 'footer'],
    match: { kind: 'segment', roots: ['/contact'] },
  },
  {
    id: 'third-enlightenment',
    label: 'Third Enlightenment',
    href: '/third-enlightenment',
    placements: ['footer'],
    match: { kind: 'segment', roots: ['/third-enlightenment'] },
  },
  {
    id: 'principles',
    label: 'Principles',
    href: '/principles',
    placements: ['footer'],
    match: { kind: 'segment', roots: ['/principles'] },
  },
] as const satisfies readonly NavigationItem[];

function normalizePathname(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || '/';
  return path === '/' ? path : path.replace(/\/+$/, '');
}

function matchesSegment(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function isNavigationItemActive(item: NavigationItem | undefined, pathname: string) {
  if (!item) return false;
  const normalized = normalizePathname(pathname);
  return item.match.kind === 'exact'
    ? item.match.paths.includes(normalized)
    : item.match.roots.some((root) => matchesSegment(normalized, root));
}

export function navigationItemsFor(placement: NavigationPlacement) {
  return (navigationItems as readonly NavigationItem[])
    .filter((item) => item.placements.includes(placement));
}
