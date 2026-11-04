/** Fondo decorativo del login: vino profundo, anillos dorados y curva de crecimiento abstracta. */
export function LoginBackdrop() {
  const rings = [170, 260, 360, 470, 590, 720];
  const bars = [0.28, 0.36, 0.33, 0.46, 0.55, 0.52, 0.66, 0.78];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 700px at 12% 8%, #8A2A5C 0%, transparent 60%), radial-gradient(900px 700px at 92% 95%, #A8416F 0%, transparent 55%), linear-gradient(135deg, #5A1439 0%, #3A0C27 100%)',
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <linearGradient id="lb-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#D2A23A" stopOpacity="0" />
            <stop offset=".35" stopColor="#E8C46A" stopOpacity=".9" />
            <stop offset="1" stopColor="#F6DD9A" />
          </linearGradient>
          <linearGradient id="lb-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E8C46A" stopOpacity=".22" />
            <stop offset="1" stopColor="#E8C46A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lb-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F3C4D5" stopOpacity=".28" />
            <stop offset="1" stopColor="#F3C4D5" stopOpacity="0" />
          </linearGradient>
          <filter id="lb-noise">
            <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0" />
          </filter>
        </defs>

        {/* anillos concéntricos (eco de la moneda del logo) */}
        <g stroke="#E8C46A" fill="none">
          {rings.map((r, i) => (
            <circle key={r} cx="720" cy="450" r={r} strokeOpacity={0.22 - i * 0.028} strokeWidth={i === 0 ? 1.2 : 1} />
          ))}
        </g>

        {/* retícula horizontal tenue */}
        <g stroke="#fff" strokeOpacity=".05">
          {[560, 640, 720, 800].map((y) => (
            <line key={y} x1="0" x2="1440" y1={y} y2={y} />
          ))}
        </g>

        {/* barras de fondo */}
        <g>
          {bars.map((h, i) => (
            <rect key={i} x={760 + i * 84} y={900 - h * 420} width="46" height={h * 420} rx="10" fill="url(#lb-bar)" />
          ))}
        </g>

        {/* curva de crecimiento */}
        <path
          d="M0 800 C 160 790, 240 760, 360 745 S 560 700, 700 650 S 940 560, 1080 470 S 1300 330, 1440 250 L1440 900 L0 900 Z"
          fill="url(#lb-area)"
        />
        <path
          d="M0 800 C 160 790, 240 760, 360 745 S 560 700, 700 650 S 940 560, 1080 470 S 1300 330, 1440 250"
          stroke="url(#lb-gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="1080" cy="470" r="6" fill="#F6DD9A" />
        <circle cx="1080" cy="470" r="16" stroke="#F6DD9A" strokeOpacity=".35" />

        <rect width="1440" height="900" filter="url(#lb-noise)" opacity=".05" />
      </svg>
    </div>
  );
}
