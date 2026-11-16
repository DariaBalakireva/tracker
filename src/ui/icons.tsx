import type { CSSProperties, ReactNode } from 'react';

type P = { size?: number; style?: CSSProperties; className?: string };

function Stroke({ size = 24, style, className, w = 2.2, children }: P & { w?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconPlus = (p: P) => <Stroke w={2.6} {...p}><path d="M12 5v14M5 12h14" /></Stroke>;
export const IconMinus = (p: P) => <Stroke w={2.6} {...p}><path d="M5 12h14" /></Stroke>;
export const IconCheck = (p: P) => <Stroke w={3} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Stroke>;
export const IconClose = (p: P) => <Stroke w={2.4} {...p}><path d="M6 6l12 12M18 6L6 18" /></Stroke>;
export const IconToday = (p: P) => <Stroke {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></Stroke>;
export const IconList = (p: P) => <Stroke {...p}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></Stroke>;
export const IconBag = (p: P) => <Stroke {...p}><path d="M5.5 8h13l-1.2 12H6.7L5.5 8z" /><path d="M9 8a3 3 0 0 1 6 0" /></Stroke>;
export const IconChart = (p: P) => <Stroke {...p}><path d="M5 20v-8M12 20V5M19 20v-5" /></Stroke>;
export const IconGear = (p: P) => (
  <Stroke w={2} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Stroke>
);
export const IconChevronLeft = (p: P) => <Stroke w={2.5} {...p}><path d="M15 6l-6 6 6 6" /></Stroke>;
export const IconChevronRight = (p: P) => <Stroke w={2.5} {...p}><path d="M9 6l6 6-6 6" /></Stroke>;
export const IconImage = (p: P) => <Stroke w={1.7} {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></Stroke>;
export const IconWallet = (p: P) => <Stroke w={2} {...p}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16 14.5h2" /></Stroke>;
export const IconCalendar = (p: P) => <Stroke w={2} {...p}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Stroke>;
export const IconTrash = (p: P) => <Stroke w={2} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Stroke>;
export const IconEdit = (p: P) => <Stroke w={2} {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></Stroke>;
export const IconSwap = (p: P) => <Stroke w={2.2} {...p}><path d="M7 4L4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7" /></Stroke>;
export const IconUndo = (p: P) => <Stroke w={2.2} {...p}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Stroke>;
export const IconShare = (p: P) => <Stroke w={2} {...p}><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></Stroke>;
export const IconDownload = (p: P) => <Stroke w={2} {...p}><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 19h14" /></Stroke>;
export const IconArchive = (p: P) => <Stroke w={2} {...p}><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" /></Stroke>;
export const IconMoon = (p: P) => <Stroke w={2} {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></Stroke>;
export const IconLink = (p: P) => <Stroke w={2} {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Stroke>;

export function Sparkle({ size = 16, color = '#C9BBFF', style, className }: P & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style} className={className}>
      <path d="M12 2C12.6 7.4 16.6 11.4 22 12C16.6 12.6 12.6 16.6 12 22C11.4 16.6 7.4 12.6 2 12C7.4 11.4 11.4 7.4 12 2Z" fill={color} />
    </svg>
  );
}

export function Flame({ size = 13 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c.8 3.6 5.5 5.9 5.5 11a5.5 5.5 0 0 1-11 0c0-2.8 1.6-4.4 2.7-5.5.2 1.7.9 2.7 2 3.3.4-3.3-.6-5.8.8-8.8z" fill="#FF8A65" />
    </svg>
  );
}
