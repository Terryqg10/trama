'use client';

import { useEffect, useRef } from 'react';
import { DemoNotice } from '@/components/DemoNotice';
import type { CouponNotice } from '@/lib/newsletter/state';

const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' });

const PLAIN = 'rounded-control border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-fg';

/**
 * Código de bienvenida tras suscribirse (RF-27, CA-136, T-094, Enmienda 41). Sin correo propio, el código se enseña en pantalla,
 * con botón de copiar. Si el email ya tenía uno caducado o canjeado, solo se dice (el servidor no genera otro). Sirve al modal
 * promocional y a la sección de la portada, y vive dentro de la región `aria-live` del formulario.
 */
export function WelcomeCoupon({ notice }: { readonly notice: CouponNotice }) {
  const ref = useRef<HTMLDivElement>(null);
  // En el modal el código queda debajo del pliegue en un móvil: se lleva a la vista al aparecer (sin forzar el desplazamiento si ya se ve).
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, []);

  if (notice.status === 'issued' || notice.status === 'existing') {
    return (
      <div ref={ref}>
      <DemoNotice
        testId="welcome-coupon"
        title={
          <>
            Tu código de bienvenida:{' '}
            <code data-testid="welcome-coupon-code" className="select-all whitespace-nowrap rounded-control bg-surface px-2 py-1 font-semibold text-fg">
              {notice.code}
            </code>
          </>
        }
        copy={{ value: notice.code, label: 'Copiar código' }}
      >
        <span className="block">10 % en tu primera compra, válido hasta el {dateFormat.format(new Date(notice.expiresAt))}.</span>
        <span className="block">Código de demostración: se canjea en el pago.</span>
      </DemoNotice>
      </div>
    );
  }

  return (
    <div ref={ref}>
      {notice.status === 'expired' ? (
        <p data-testid="welcome-coupon-expired" className={PLAIN}>
          Tu código de bienvenida ha caducado.
        </p>
      ) : (
        <p data-testid="welcome-coupon-redeemed" className={PLAIN}>
          Tu código de bienvenida ya se ha usado.
        </p>
      )}
    </div>
  );
}
