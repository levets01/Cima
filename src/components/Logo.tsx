import { useId } from 'react';

/** Isotipo de Cima: una rosa con dos hojas. */
export function Logo({ size = 44, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Cima" className={className}>
      <defs>
        <linearGradient id={`${id}lf`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#5F9072" /><stop offset="1" stopColor="#A9CDA6" /></linearGradient>
        <radialGradient id={`${id}pe`} cx="50%" cy="50%" r="60%"><stop offset="0" stopColor="#A93C69" /><stop offset="1" stopColor="#74194A" /></radialGradient>
        <radialGradient id={`${id}pi`} cx="50%" cy="50%" r="60%"><stop offset="0" stopColor="#EE9AB9" /><stop offset="1" stopColor="#C65A86" /></radialGradient>
        <radialGradient id={`${id}pc`} cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#F5B3CC" /><stop offset="1" stopColor="#CF5B88" /></radialGradient>
      </defs>
      <path d="M31 44C22 42 13 46 9 56C20 58 29 54 31 44Z" fill={`url(#${id}lf)`} />
      <path d="M33 44C42 42 51 46 55 56C44 58 35 54 33 44Z" fill={`url(#${id}lf)`} />
      <path d="M30 46C24 48 18 51 13 55M34 46C40 48 46 51 51 55" stroke="#E4F2DF" strokeOpacity=".6" strokeWidth=".8" strokeLinecap="round" />
      <circle cx="43.11" cy="28.98" r="10.5" fill={`url(#${id}pe)`} stroke="#FFD6E3" strokeOpacity=".55" strokeWidth=".9" />
      <circle cx="34.98" cy="37.11" r="10.5" fill={`url(#${id}pe)`} stroke="#FFD6E3" strokeOpacity=".55" strokeWidth=".9" />
      <circle cx="23.87" cy="34.13" r="10.5" fill={`url(#${id}pe)`} stroke="#FFD6E3" strokeOpacity=".55" strokeWidth=".9" />
      <circle cx="20.89" cy="23.02" r="10.5" fill={`url(#${id}pe)`} stroke="#FFD6E3" strokeOpacity=".55" strokeWidth=".9" />
      <circle cx="29.02" cy="14.89" r="10.5" fill={`url(#${id}pe)`} stroke="#FFD6E3" strokeOpacity=".55" strokeWidth=".9" />
      <circle cx="40.13" cy="17.87" r="10.5" fill={`url(#${id}pe)`} stroke="#FFD6E3" strokeOpacity=".55" strokeWidth=".9" />
      <circle cx="37.36" cy="30.50" r="8.2" fill={`url(#${id}pi)`} stroke="#FFFFFF" strokeOpacity=".6" strokeWidth=".9" />
      <circle cx="29.38" cy="32.49" r="8.2" fill={`url(#${id}pi)`} stroke="#FFFFFF" strokeOpacity=".6" strokeWidth=".9" />
      <circle cx="25.02" cy="25.51" r="8.2" fill={`url(#${id}pi)`} stroke="#FFFFFF" strokeOpacity=".6" strokeWidth=".9" />
      <circle cx="30.31" cy="19.21" r="8.2" fill={`url(#${id}pi)`} stroke="#FFFFFF" strokeOpacity=".6" strokeWidth=".9" />
      <circle cx="37.94" cy="22.29" r="8.2" fill={`url(#${id}pi)`} stroke="#FFFFFF" strokeOpacity=".6" strokeWidth=".9" />
      <circle cx="32" cy="26" r="6.2" fill={`url(#${id}pc)`} />
      <path d="M32.42 26.43L32.40 26.52L32.36 26.61L32.30 26.70L32.23 26.78L32.15 26.85L32.04 26.92L31.93 26.97L31.80 27.01L31.67 27.03L31.52 27.03L31.38 27.01L31.23 26.97L31.08 26.91L30.93 26.82L30.80 26.71L30.67 26.59L30.56 26.44L30.46 26.27L30.39 26.09L30.34 25.89L30.31 25.68L30.31 25.46L30.34 25.24L30.40 25.02L30.48 24.80L30.60 24.59L30.75 24.39L30.92 24.20L31.12 24.04L31.35 23.90L31.60 23.78L31.86 23.70L32.15 23.64L32.44 23.63L32.74 23.65L33.03 23.70L33.33 23.80L33.62 23.93L33.89 24.10L34.15 24.31L34.38 24.55L34.59 24.83L34.76 25.13L34.90 25.46L34.99 25.81L35.05 26.17L35.06 26.55L35.02 26.93L34.94 27.30L34.80 27.67L34.63 28.03L34.40 28.37L34.13 28.68L33.82 28.97L33.47 29.21L33.09 29.42L32.69 29.57L32.26 29.68L31.81 29.74L31.35 29.74L30.89 29.69L30.43 29.58L29.99 29.41L29.56 29.19L29.16 28.91L28.79 28.58L28.46 28.20L28.17 27.78L27.93 27.33L27.75 26.84L27.63 26.33L27.56 25.80L27.57 25.26L27.64 24.71L27.78 24.18L27.98 23.66L28.25 23.16L28.58 22.69L28.97 22.26L29.41 21.88L29.90 21.55L30.43 21.28L31.00 21.07L31.60 20.94L32.21 20.87L32.83 20.88L33.46 20.97L34.07 21.13L34.67 21.37L35.24 21.68L35.77 22.06L36.26 22.51L36.69 23.02L37.06 23.58L37.37 24.19L37.60 24.83L37.75 25.51L37.82 26.21L37.81 26.91L37.71 27.62L37.52 28.31L37.25 28.99L36.90 29.63L36.46 30.23L35.96 30.77L35.38 31.26L34.75 31.67L34.07 32.01L33.34 32.27L32.58 32.44L31.80 32.52L31.01 32.50L30.23 32.38L29.45 32.17L28.70 31.87L27.99 31.47L27.32 30.99L26.72 30.43L26.18 29.79L25.72 29.09" stroke="#FFE3EC" strokeOpacity=".85" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
