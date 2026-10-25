import type { Metadata } from 'next';
import { ComingSoon } from '@/components/account/ComingSoon';

export const metadata: Metadata = { title: 'Recomienda y gana' };

/** Recomienda y gana (RF-08, CA-11, T-104): pantalla informativa. Sin códigos, referidos ni datos (DP-5 B). */
export default function RecomiendaPage() {
  return (
    <ComingSoon
      title="Recomienda y gana"
      description="Estamos preparando un programa para invitar a tus amigos a Trama. Aún no hay códigos de invitación ni recompensas."
    />
  );
}
