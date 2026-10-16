import { fitInfoOf } from '@/lib/catalog/fit-info';
import type { ProductDetail } from '@/lib/catalog/product';

/**
 * Datos de ajuste de la ficha (RF-20, CA-33): el modelo (altura y talla), la composición y los
 * cuidados, en una lista de definición. Se omite lo que no tiene dato y, si no hay ninguno, no se
 * pinta nada (ni un título vacío).
 */
export function FitInfo({
  product,
}: {
  readonly product: Pick<ProductDetail, 'modelHeightCm' | 'modelSize' | 'composition' | 'care'>;
}) {
  const info = fitInfoOf(product);
  if (!info) return null;

  const rows: ReadonlyArray<readonly [string, string | null]> = [
    ['Modelo', info.model],
    ['Composición', info.composition],
    ['Cuidados', info.care],
  ];

  return (
    <section aria-labelledby="ficha-ajuste" className="border-t border-border pt-6">
      <h2 id="ficha-ajuste" className="text-base font-semibold text-fg">
        Ajuste y cuidados
      </h2>
      <dl className="mt-3 space-y-3 text-sm">
        {rows.map(([term, value]) =>
          value ? (
            <div key={term} className="space-y-1 sm:flex sm:gap-4 sm:space-y-0">
              <dt className="font-semibold text-fg sm:w-32 sm:shrink-0">{term}</dt>
              <dd className="text-fg">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}
