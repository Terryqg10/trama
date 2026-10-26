import { siApplepay, siGooglepay, siMastercard, siPaypal, siVisa } from 'simple-icons';

/** Pasarelas que se muestran bajo el total (CA-150). Los trazados vienen de `simple-icons`: no se dibujan a mano. */
const METHODS = [siVisa, siMastercard, siPaypal, siApplepay, siGooglepay] as const;

/** Texto del aviso: la tienda es una demostración (Stripe en modo de pruebas), así que no se promete «pago seguro». */
export const DEMO_PAYMENT_NOTICE = 'Entorno de demostración. No se realizarán cargos reales.';

/**
 * Iconos de pago y aviso de demostración del carrito lateral (CA-150, T-119, Enmienda 49). Un solo color (`currentColor`,
 * token `fg-muted`): los colores de marca serían hex en un componente, que la regla de estilos prohíbe. Cada icono es un
 * elemento de lista con su nombre accesible.
 */
export function PaymentIcons() {
  return (
    <div data-testid="payment-icons">
      <ul aria-label="Métodos de pago" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-fg-muted">
        {METHODS.map((method) => (
          <li key={method.slug} className="flex items-center">
            <svg viewBox="0 0 24 24" role="img" aria-label={method.title} className="h-6 w-auto max-w-10 fill-current">
              <path d={method.path} />
            </svg>
          </li>
        ))}
      </ul>
      <p data-testid="payment-demo-notice" className="mt-2 text-xs text-fg-muted">
        {DEMO_PAYMENT_NOTICE}
      </p>
    </div>
  );
}
