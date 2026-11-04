import { useState, type CSSProperties, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { auth } from '@/services/auth';

const MIN_LENGTH = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const navigate = useNavigate();
  const isSetup = !auth.hasAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  if (auth.isAuthenticated() && !done) return <Navigate to="/" replace />;

  const fail = (message: string) => {
    setError(message);
    setShake(true);
    setBusy(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || done) return;
    setError('');
    if (!EMAIL_RE.test(email.trim())) return fail('Escribe un correo válido, por ejemplo nombre@correo.com.');
    if (isSetup) {
      if (password.length < MIN_LENGTH) return fail(`Usa al menos ${MIN_LENGTH} caracteres.`);
      if (password !== confirm) return fail('Las dos contraseñas no coinciden.');
    } else if (!password) {
      return fail('Escribe tu contraseña.');
    }
    setBusy(true);
    try {
      if (isSetup) {
        await auth.setup(email, password, remember);
      } else if (!(await auth.login(email, password, remember))) {
        return fail('El correo o la contraseña no son correctos.');
      }
      // Confirmación visible y salida suave antes de entrar
      setDone(true);
      setTimeout(() => navigate('/', { replace: true }), 650);
    } catch {
      fail('Este navegador no permite guardar el acceso. Revisa que no esté en modo privado.');
    }
  };

  // Fortaleza (solo al crear la cuenta): longitud + variedad de caracteres
  const score = Math.min(
    3,
    (password.length >= MIN_LENGTH ? 1 : 0) +
      (password.length >= 10 ? 1 : 0) +
      (/[A-Z]/.test(password) && /\d|[^A-Za-z0-9]/.test(password) ? 1 : 0)
  );
  const strength = ['', 'Débil', 'Aceptable', 'Fuerte'][score];

  const input =
    'h-12 w-full rounded-xl border border-input bg-card px-4 text-[15px] text-foreground placeholder:text-muted-foreground/70 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/10';
  const label = 'mb-1.5 block text-sm font-semibold text-foreground';
  // Cada bloque entra en orden: --i define su turno
  const turn = (i: number) => ({ '--i': i }) as CSSProperties;
  const invalid = !!error;

  return (
    <div className="relative grid min-h-screen bg-background text-foreground [--accent:345_60%_95%] [--primary:339_50%_44%] [--ring:339_50%_50%] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative z-20 hidden overflow-hidden lg:block" style={{ clipPath: "url(#aside-clip)", background: 'radial-gradient(900px 600px at 50% 72%, #D3B6C2 0%, transparent 70%), linear-gradient(160deg, #CBB0BC 0%, #C0A1AE 50%, #AE8C9B 100%)' }}>
        <svg aria-hidden className="absolute inset-x-0 bottom-0 w-full" style={{ height: "min(76%, calc(100% - 390px))" }} viewBox="0 0 400 500" preserveAspectRatio="xMidYMax meet" fill="none">
          <defs>
            <radialGradient id="sp-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#FFE3EC" stopOpacity=".5" />
              <stop offset="1" stopColor="#FFE3EC" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sp-seed" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#FBEBC0" />
              <stop offset="1" stopColor="#C8962E" />
            </radialGradient>
            <linearGradient id="sp-leaf" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#6E9E7F" />
              <stop offset="1" stopColor="#B6D7B0" />
            </linearGradient>
            <linearGradient id="sp-stem" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#6E9E7F" />
              <stop offset="1" stopColor="#A9CDA6" />
            </linearGradient>
            <linearGradient id="pt-back" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#F29BB8" />
              <stop offset="1" stopColor="#FFF1F5" />
            </linearGradient>
            <linearGradient id="pt-mid" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#E56F98" />
              <stop offset="1" stopColor="#FFD3E1" />
            </linearGradient>
            <linearGradient id="pt-in" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#CF4F7E" />
              <stop offset="1" stopColor="#FBB1C9" />
            </linearGradient>
            <radialGradient id="sp-mound" cx="50%" cy="0%" r="100%">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity=".22" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle className="sprout-glow" cx="200" cy="250" r="190" fill="url(#sp-glow)" />

          {/* suelo y raíces */}
          <ellipse cx="200" cy="462" rx="120" ry="16" fill="url(#sp-mound)" />
          <path d="M96 462C150 448 250 448 304 462" stroke="#FFE7B0" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
          <path className="sprout-draw" pathLength="1" style={{ '--d': '1100ms', '--delay': '500ms' } as CSSProperties} d="M195 462C189 476 178 484 166 492M203 463C208 477 220 485 232 493M199 464C199 478 197 486 195 494" stroke="#FFE7B0" strokeOpacity=".75" strokeWidth="1.3" strokeLinecap="round" />

          {/* semilla */}
          <ellipse className="sprout-seed" cx="200" cy="452" rx="18" ry="11.5" transform="rotate(-14 200 452)" fill="url(#sp-seed)" />

          <g className="sprout-sway">
            {/* tallo */}
            <path className="sprout-draw" pathLength="1" style={{ '--d': '2300ms', '--delay': '900ms' } as CSSProperties} d="M200 446C192 400 214 340 201 242" stroke="url(#sp-stem)" strokeWidth="3.2" strokeLinecap="round" />

            {/* hojas con nervadura */}
            <g transform="translate(199 408) scale(-1 1) rotate(-12)">
              <g className="sprout-leaf" style={{ '--delay': '2100ms' } as CSSProperties}>
                <path d="M0 0C22-26 70-34 108-14C78 6 32 16 0 0Z" fill="url(#sp-leaf)" stroke="#E4F2DF" strokeOpacity=".6" strokeWidth=".9" />
                <path d="M2 0C34-8 68-12 100-13" stroke="#E4F2DF" strokeOpacity=".6" strokeWidth=".9" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(205 352) rotate(-18)">
              <g className="sprout-leaf" style={{ '--delay': '2600ms' } as CSSProperties}>
                <path d="M0 0C22-26 70-34 108-14C78 6 32 16 0 0Z" fill="url(#sp-leaf)" stroke="#E4F2DF" strokeOpacity=".6" strokeWidth=".9" />
                <path d="M2 0C34-8 68-12 100-13" stroke="#E4F2DF" strokeOpacity=".6" strokeWidth=".9" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(203 300) scale(-.7 .7) rotate(-26)">
              <g className="sprout-leaf" style={{ '--delay': '3000ms' } as CSSProperties}>
                <path d="M0 0C22-26 70-34 108-14C78 6 32 16 0 0Z" fill="url(#sp-leaf)" stroke="#E4F2DF" strokeOpacity=".6" strokeWidth=".9" />
              </g>
            </g>

            {/* flor: tres capas de pétalos, de atrás hacia adelante */}
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '-84deg', '--delay': '3200ms' } as CSSProperties}>
                <path d="M0 0C-38.0 -22.9 -32.0 -81.1 0 -104C32.0 -81.1 38.0 -22.9 0 0Z" fill="url(#pt-back)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -81" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '-56deg', '--delay': '3370ms' } as CSSProperties}>
                <path d="M0 0C-38.0 -22.9 -32.0 -81.1 0 -104C32.0 -81.1 38.0 -22.9 0 0Z" fill="url(#pt-back)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -81" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '-28deg', '--delay': '3540ms' } as CSSProperties}>
                <path d="M0 0C-38.0 -22.9 -32.0 -81.1 0 -104C32.0 -81.1 38.0 -22.9 0 0Z" fill="url(#pt-back)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -81" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '0deg', '--delay': '3710ms' } as CSSProperties}>
                <path d="M0 0C-38.0 -22.9 -32.0 -81.1 0 -104C32.0 -81.1 38.0 -22.9 0 0Z" fill="url(#pt-back)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -81" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '28deg', '--delay': '3880ms' } as CSSProperties}>
                <path d="M0 0C-38.0 -22.9 -32.0 -81.1 0 -104C32.0 -81.1 38.0 -22.9 0 0Z" fill="url(#pt-back)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -81" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '56deg', '--delay': '4050ms' } as CSSProperties}>
                <path d="M0 0C-38.0 -22.9 -32.0 -81.1 0 -104C32.0 -81.1 38.0 -22.9 0 0Z" fill="url(#pt-back)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -81" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '84deg', '--delay': '4220ms' } as CSSProperties}>
                <path d="M0 0C-38.0 -22.9 -32.0 -81.1 0 -104C32.0 -81.1 38.0 -22.9 0 0Z" fill="url(#pt-back)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -81" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '-66deg', '--delay': '3700ms' } as CSSProperties}>
                <path d="M0 0C-32.3 -18.0 -27.2 -64.0 0 -82C27.2 -64.0 32.3 -18.0 0 0Z" fill="url(#pt-mid)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -64" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '-40deg', '--delay': '3850ms' } as CSSProperties}>
                <path d="M0 0C-32.3 -18.0 -27.2 -64.0 0 -82C27.2 -64.0 32.3 -18.0 0 0Z" fill="url(#pt-mid)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -64" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '-14deg', '--delay': '4000ms' } as CSSProperties}>
                <path d="M0 0C-32.3 -18.0 -27.2 -64.0 0 -82C27.2 -64.0 32.3 -18.0 0 0Z" fill="url(#pt-mid)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -64" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '14deg', '--delay': '4150ms' } as CSSProperties}>
                <path d="M0 0C-32.3 -18.0 -27.2 -64.0 0 -82C27.2 -64.0 32.3 -18.0 0 0Z" fill="url(#pt-mid)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -64" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '40deg', '--delay': '4300ms' } as CSSProperties}>
                <path d="M0 0C-32.3 -18.0 -27.2 -64.0 0 -82C27.2 -64.0 32.3 -18.0 0 0Z" fill="url(#pt-mid)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -64" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '66deg', '--delay': '4450ms' } as CSSProperties}>
                <path d="M0 0C-32.3 -18.0 -27.2 -64.0 0 -82C27.2 -64.0 32.3 -18.0 0 0Z" fill="url(#pt-mid)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -64" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '-42deg', '--delay': '4200ms' } as CSSProperties}>
                <path d="M0 0C-24.7 -12.8 -20.8 -45.2 0 -58C20.8 -45.2 24.7 -12.8 0 0Z" fill="url(#pt-in)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -45" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '-21deg', '--delay': '4340ms' } as CSSProperties}>
                <path d="M0 0C-24.7 -12.8 -20.8 -45.2 0 -58C20.8 -45.2 24.7 -12.8 0 0Z" fill="url(#pt-in)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -45" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '0deg', '--delay': '4480ms' } as CSSProperties}>
                <path d="M0 0C-24.7 -12.8 -20.8 -45.2 0 -58C20.8 -45.2 24.7 -12.8 0 0Z" fill="url(#pt-in)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -45" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '21deg', '--delay': '4620ms' } as CSSProperties}>
                <path d="M0 0C-24.7 -12.8 -20.8 -45.2 0 -58C20.8 -45.2 24.7 -12.8 0 0Z" fill="url(#pt-in)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -45" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(200 238)">
              <g className="sprout-petal" style={{ '--a': '42deg', '--delay': '4760ms' } as CSSProperties}>
                <path d="M0 0C-24.7 -12.8 -20.8 -45.2 0 -58C20.8 -45.2 24.7 -12.8 0 0Z" fill="url(#pt-in)" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".9" />
                <path d="M0 -6L0 -45" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
              </g>
            </g>

            {/* estambres y centro */}
            <g className="sprout-leaf" style={{ '--delay': '4700ms' } as CSSProperties}><path d="M200 238L177.0 218.7" stroke="#F6D77E" strokeWidth="1.2" strokeLinecap="round" /><circle cx="177.0" cy="218.7" r="2.4" fill="#FBE3A8" /></g>
            <g className="sprout-leaf" style={{ '--delay': '4780ms' } as CSSProperties}><path d="M200 238L185.0 212.0" stroke="#F6D77E" strokeWidth="1.2" strokeLinecap="round" /><circle cx="185.0" cy="212.0" r="2.4" fill="#FBE3A8" /></g>
            <g className="sprout-leaf" style={{ '--delay': '4860ms' } as CSSProperties}><path d="M200 238L194.8 208.5" stroke="#F6D77E" strokeWidth="1.2" strokeLinecap="round" /><circle cx="194.8" cy="208.5" r="2.4" fill="#FBE3A8" /></g>
            <g className="sprout-leaf" style={{ '--delay': '4940ms' } as CSSProperties}><path d="M200 238L205.2 208.5" stroke="#F6D77E" strokeWidth="1.2" strokeLinecap="round" /><circle cx="205.2" cy="208.5" r="2.4" fill="#FBE3A8" /></g>
            <g className="sprout-leaf" style={{ '--delay': '5020ms' } as CSSProperties}><path d="M200 238L215.0 212.0" stroke="#F6D77E" strokeWidth="1.2" strokeLinecap="round" /><circle cx="215.0" cy="212.0" r="2.4" fill="#FBE3A8" /></g>
            <g className="sprout-leaf" style={{ '--delay': '5100ms' } as CSSProperties}><path d="M200 238L223.0 218.7" stroke="#F6D77E" strokeWidth="1.2" strokeLinecap="round" /><circle cx="223.0" cy="218.7" r="2.4" fill="#FBE3A8" /></g>
            <circle className="sprout-seed" style={{ '--delay': '4600ms' } as CSSProperties} cx="200" cy="238" r="9" fill="url(#sp-seed)" />
          </g>

          <circle className="sprout-spark" style={{ '--d': '5.5s', '--delay': '5200ms' } as CSSProperties} cx="150" cy="300" r="2" fill="#FFE7B0" />
          <circle className="sprout-spark" style={{ '--d': '6.2s', '--delay': '6100ms' } as CSSProperties} cx="256" cy="280" r="1.6" fill="#FFE7B0" />
          <circle className="sprout-spark" style={{ '--d': '5s', '--delay': '7000ms' } as CSSProperties} cx="120" cy="360" r="1.4" fill="#FFE7B0" />
          <circle className="sprout-spark" style={{ '--d': '6.8s', '--delay': '5600ms' } as CSSProperties} cx="282" cy="350" r="2.2" fill="#FFE7B0" />
          <circle className="sprout-spark" style={{ '--d': '5.2s', '--delay': '8100ms' } as CSSProperties} cx="176" cy="230" r="1.5" fill="#FFE7B0" />
          <circle className="sprout-spark" style={{ '--d': '6s', '--delay': '6600ms' } as CSSProperties} cx="230" cy="200" r="1.8" fill="#FFE7B0" />
          
        </svg>

        <div className="relative z-10 flex h-full flex-col px-14 pt-14">
          <div className="font-display text-[34px] font-semibold leading-none tracking-[0.01em] text-[#5A1639]">Cima</div>
          <h2 className="mt-14 font-display text-[58px] font-medium leading-[1.04] tracking-[-0.015em] text-[#4A1230]">
            Tu negocio crece,
            <br />
            un préstamo a la vez.
          </h2>
          <p className="mt-6 max-w-[42ch] text-[16px] leading-relaxed text-[#5A1639]/80">
            Registra, cobra y mira tu rentabilidad en un solo lugar.
          </p>
        </div>
      </aside>

      {/* Recorte curvo del panel: el formulario emerge por debajo de este borde */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id="aside-clip" clipPathUnits="objectBoundingBox">
            <path d="M0 0H0.82C0.95 0.22 0.95 0.78 0.82 1H0Z" />
          </clipPath>
        </defs>
      </svg>

      <main className="login-stage login-slide relative z-0 flex items-center justify-center overflow-hidden px-6 py-12 sm:px-12">

        <div className={`relative w-full max-w-[380px] ${done ? 'login-exit' : ''}`}>
          <div className="login-in" style={turn(0)}>
            <Logo size={76} />
          </div>

          <h1 className="login-in mt-8 font-display text-[44px] font-semibold leading-none tracking-tight text-primary" style={turn(1)}>
            {isSetup ? 'Crea tu cuenta' : 'Bienvenida'}
          </h1>
          <p className="login-in mt-3 text-[15px] leading-relaxed text-muted-foreground" style={turn(2)}>
            {isSetup
              ? 'Es tu primera vez aquí. Con tu correo y una contraseña protegerás el acceso desde este equipo.'
              : 'Ingresa con tu correo y tu contraseña.'}
          </p>

          <form onSubmit={submit} className="mt-8" noValidate>
            <div className={shake ? 'login-shake' : ''} onAnimationEnd={() => setShake(false)}>
              <div className="login-in" style={turn(3)}>
                <label htmlFor="email" className={label}>Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  placeholder="nombre@correo.com"
                  aria-invalid={invalid && !isSetup}
                  aria-describedby={error ? 'login-error' : undefined}
                  className={input}
                />
              </div>

              <div className="login-in mt-5" style={turn(4)}>
                <label htmlFor="password" className={label}>Contraseña</label>
                <div className="relative">
                  <input
                    id="password"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsOn(e.getModifierState('CapsLock'))}
                    onBlur={() => setCapsOn(false)}
                    autoComplete={isSetup ? 'new-password' : 'current-password'}
                    aria-invalid={invalid && !isSetup}
                    aria-describedby={error ? 'login-error' : undefined}
                    className={`${input} pr-24`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-pressed={show}
                    className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-4 text-sm font-semibold text-primary transition-colors hover:text-primary/70 focus-visible:outline-none focus-visible:underline"
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    {show ? 'Ocultar' : 'Ver'}
                  </button>
                </div>

                {capsOn && <p className="login-fade mt-2 text-[13px] text-warning">Tienes activadas las mayúsculas.</p>}

                {isSetup && password.length > 0 && (
                  <div className="login-fade mt-2.5 flex items-center gap-3" aria-live="polite">
                    <div className="flex flex-1 gap-1.5">
                      {[1, 2, 3].map((n) => (
                        <span
                          key={n}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            score >= n ? (score === 3 ? 'bg-success' : score === 2 ? 'bg-gold' : 'bg-destructive') : 'bg-border'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="w-16 text-right text-[13px] text-muted-foreground">{strength}</span>
                  </div>
                )}
              </div>

              {isSetup && (
                <div className="login-in mt-5" style={turn(5)}>
                  <label htmlFor="confirm" className={label}>Repite la contraseña</label>
                  <input
                    id="confirm"
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    aria-describedby={error ? 'login-error' : undefined}
                    className={input}
                  />
                </div>
              )}
            </div>

            <label className="login-in mt-5 flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground" style={turn(6)}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30"
              />
              Mantener la sesión en este equipo
            </label>

            <div id="login-error" role="alert" className="mt-4 min-h-[44px]">
              {error && (
                <p key={error} className="login-fade flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13.5px] leading-snug text-destructive">
                  <AlertCircle size={16} className="mt-px shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <div className="login-in" style={turn(7)}>
              <button
                type="submit"
                disabled={busy || done}
                className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.6)] transition duration-200 hover:-translate-y-px hover:bg-primary/90 hover:shadow-[0_12px_24px_-8px_hsl(var(--primary)/0.65)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-default disabled:hover:translate-y-0"
              >
                {done ? (
                  <>
                    <Check size={18} className="login-fade" /> Listo
                  </>
                ) : busy ? (
                  <>
                    <span className="login-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                    Verificando
                  </>
                ) : isSetup ? (
                  'Crear cuenta'
                ) : (
                  'Ingresar'
                )}
              </button>
            </div>
          </form>

          <p className="login-in mt-10 border-t border-border pt-5 text-[13px] leading-relaxed text-muted-foreground" style={turn(8)}>
            El correo y la contraseña se guardan en este navegador, y la contraseña va cifrada. Si la pierdes no hay forma de recuperarla desde la aplicación.
          </p>
        </div>
      </main>
    </div>
  );
}
