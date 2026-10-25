/**
 * Pantalla informativa «Próximamente» de la cuenta (Trama Club y Recomienda y gana; SPEC-005 RF-07 y RF-08, DP-4 y DP-5 B).
 * Solo texto: sin formularios, sin cifras ni condiciones y sin acceso a datos. Deja claro que la función aún no existe.
 */
export function ComingSoon({ title, description }: { readonly title: string; readonly description: string }) {
  return (
    <div>
      <h1 className="text-display font-bold">{title}</h1>
      <section
        aria-labelledby="proximamente-titulo"
        data-testid="coming-soon"
        className="mt-8 rounded-container border border-border bg-surface p-8"
      >
        <p className="inline-flex rounded-control bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
          Próximamente
        </p>
        <h2 id="proximamente-titulo" className="mt-4 text-xl font-semibold text-fg">
          Todavía no está disponible
        </h2>
        <p className="mt-2 max-w-(--layout-prose-max) text-fg-muted">{description}</p>
      </section>
    </div>
  );
}
