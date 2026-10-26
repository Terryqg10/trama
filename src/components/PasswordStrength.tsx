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

// Adaptaciones al estilo de Trama (CA-155, T-123), a conservar al sincronizar con el OS:
// - Tokens en lugar de `bg-red-600`, `bg-yellow-500`, `bg-green-600` y `bg-black/10` (la regla de estilos los prohíbe).
// - `aria-live` sin `role="status"`: en Trama `status` marca cargas y resultados de formulario, y los tests y lectores
//   esperan uno solo. La región existe siempre (vacía y oculta) para que el primer cambio se anuncie.
const COLOR: Record<NivelPassword, string> = {
  debil: 'bg-danger',
  buena: 'bg-accent',
  fuerte: 'bg-success',
};

export function PasswordStrength({ password }: { password: string }) {
  const { nivel } = validatePassword(password);
  const typed = password !== '';

  return (
    <div data-testid="password-strength" data-level={typed ? nivel : 'vacio'} className={typed ? undefined : 'sr-only'}>
      <div className="h-2 w-full rounded-full bg-surface-muted" aria-hidden="true">
        {typed ? (
          <div
            className={`h-2 rounded-full transition-all motion-reduce:transition-none ${ANCHO[nivel]} ${COLOR[nivel]}`}
          />
        ) : null}
      </div>
      <p className="mt-1 text-sm text-fg-muted" aria-live="polite">
        {typed ? ETIQUETA[nivel] : ''}
      </p>
    </div>
  );
}
