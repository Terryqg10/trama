import type { Metadata } from 'next';
import { ComingSoon } from '@/components/account/ComingSoon';

export const metadata: Metadata = { title: 'Trama Club' };

/** Trama Club (RF-07, CA-10, T-103): pantalla informativa. Sin puntos, canje ni datos (DP-4 B). */
export default function ClubPage() {
  return (
    <ComingSoon
      title="Trama Club"
      description="Estamos preparando un programa de puntos para quienes compran en Trama. Aún no se acumula ni se canjea nada."
    />
  );
}
