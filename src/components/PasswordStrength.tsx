import { validatePassword, type NivelPassword } from '@/lib/password';

const ETIQUETA: Record<NivelPassword, string> = {
  debil: 'Contraseña débil',
  buena: 'Contraseña buena',
  fuerte: 'Contraseña fuerte',
};

const ANCHO: Record<NivelPassword, string> = {
  debil: 'w-1/3',
  buena: 'w-2/3',
  fuerte: 'w-full',
};

const COLOR: Record<NivelPassword, string> = {
  debil: 'bg-red-600',
  buena: 'bg-yellow-500',
  fuerte: 'bg-green-600',
};

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { nivel } = validatePassword(password);

  return (
    <div>
      <div className="h-2 w-full rounded-full bg-black/10" aria-hidden="true">
        <div
          className={`h-2 rounded-full transition-all motion-reduce:transition-none ${ANCHO[nivel]} ${COLOR[nivel]}`}
        />
      </div>
      <p className="mt-1 text-sm" role="status" aria-live="polite">
        {ETIQUETA[nivel]}
      </p>
    </div>
  );
}
