import { useId } from 'react';

/** Isotipo de Cima: moneda vino con aro dorado y "C" serif (Cormorant Garamond) en dorado. */
export function Logo({ size = 44, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Cima Préstamos" className={className}>
      <defs>
        <radialGradient id={`${id}w`} cx="35%" cy="28%" r="85%">
          <stop offset="0" stopColor="#8A2A5C" />
          <stop offset=".55" stopColor="#651746" />
          <stop offset="1" stopColor="#430F2D" />
        </radialGradient>
        <linearGradient id={`${id}r`} x1="12" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F3D486" />
          <stop offset=".5" stopColor="#D4A640" />
          <stop offset="1" stopColor="#A97C22" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F8E3A3" />
          <stop offset=".55" stopColor="#E0B54E" />
          <stop offset="1" stopColor="#C8962E" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={`url(#${id}r)`} />
      <circle cx="32" cy="32" r="29.2" fill={`url(#${id}w)`} />
      <circle cx="32" cy="32" r="26" stroke={`url(#${id}r)`} strokeOpacity=".6" strokeWidth=".7" />
      <path transform="translate(16.222 46.352) scale(0.046 -0.046)" fill={`url(#${id}l)`} d="M427 636Q457 636 489.5 633.0Q522 630 551.0 624.0Q580 618 600 609Q609 606 611.5 601.5Q614 597 615 586L628 447Q628 444 623.0 443.0Q618 442 616 446Q588 527 536.5 571.0Q485 615 411 615Q343 615 289.5 578.5Q236 542 205.5 475.0Q175 408 175 315Q175 245 193.0 188.5Q211 132 244.0 92.0Q277 52 322.0 30.5Q367 9 421 9Q492 9 538.5 47.5Q585 86 626 170Q628 173 632.5 172.0Q637 171 637 168L622 44Q621 32 618.5 28.5Q616 25 607 21Q559 4 511.5 -4.0Q464 -12 421 -12Q313 -12 229.0 28.5Q145 69 97.0 141.5Q49 214 49 308Q49 380 77.5 440.5Q106 501 157.5 544.5Q209 588 278.0 612.0Q347 636 427 636Z" />
    </svg>
  );
}
