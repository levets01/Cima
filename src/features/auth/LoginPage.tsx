import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { LoginBackdrop } from './LoginBackdrop';
import { Button } from '@/components/ui/button';
import { auth } from '@/services/auth';

const MIN_LENGTH = 6;

export function LoginPage() {
  const navigate = useNavigate();
  const isSetup = !auth.hasPassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (auth.isAuthenticated()) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (isSetup) {
      if (password.length < MIN_LENGTH) return setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      if (password !== confirm) return setError('Las contraseñas no coinciden.');
    } else if (!password) {
      return setError('Ingresa tu contraseña.');
    }
    setBusy(true);
    try {
      if (isSetup) {
        await auth.setup(password, remember);
      } else if (!(await auth.login(password, remember))) {
        setError('Contraseña incorrecta. Inténtalo de nuevo.');
        setBusy(false);
        return;
      }
      navigate('/', { replace: true });
    } catch {
      setError('No se pudo iniciar sesión en este navegador.');
      setBusy(false);
    }
  };

  const field =
    'h-11 w-full rounded-lg border border-input bg-card pl-11 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#3A0C27] px-6 py-12">
      <LoginBackdrop />

      <div className="relative w-full max-w-[380px] rounded-3xl border border-white/40 bg-card/95 p-8 shadow-[0_30px_80px_-20px_rgba(20,0,12,0.6)] backdrop-blur-md sm:p-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo size={52} />
          <div className="mt-4 font-display text-3xl font-semibold tracking-tight text-primary">Cima</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Préstamos</div>
        </div>

        <h1 className="text-center text-2xl">{isSetup ? 'Crea tu contraseña' : 'Bienvenida'}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {isSetup ? 'Elige una contraseña para proteger tu información.' : 'Ingresa tu contraseña para continuar.'}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          <div className="relative">
            <label htmlFor="password" className="sr-only">Contraseña</label>
            <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              autoFocus
              placeholder="Contraseña"
              className={field}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {isSetup && (
            <div className="relative">
              <label htmlFor="confirm" className="sr-only">Confirmar contraseña</label>
              <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="confirm"
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Confirmar contraseña"
                className={field}
              />
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            Mantener la sesión iniciada
          </label>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Ingresando…' : isSetup ? 'Crear y entrar' : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          La contraseña se guarda cifrada solo en este navegador y no se puede recuperar.
        </p>
      </div>
    </div>
  );
}
