import { capitalize } from '@/lib/catalog/facets';
import type { Category } from '@/lib/catalog/filters';
import type { SizeGuide } from '@/lib/catalog/size-guide';

/**
 * Tabla de la guía de tallas de una categoría (RF-18). Tabla semántica con cabeceras de columna
 * y de fila. En pantallas estrechas se desplaza dentro de su contenedor (con teclado también),
 * sin ensanchar la página.
 */
export function SizeGuideTable({
  category,
  guide,
}: {
  readonly category: Category;
  readonly guide: SizeGuide;
}) {
  return (
    <div>
      <div
        role="region"
        aria-label={`Tabla de tallas de ${category}`}
        // Con foco para poder desplazar la tabla con el teclado si no cabe.
        tabIndex={0}
        className="overflow-x-auto rounded-container border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">Guía de tallas: {capitalize(category)}</caption>
          <thead className="bg-surface-muted">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-fg">
                Talla
              </th>
              {guide.columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-3 text-left font-semibold text-fg">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row) => (
              <tr key={row.size} className="border-t border-border">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-fg">
                  {row.size}
                </th>
                {row.values.map((value, index) => (
                  <td key={guide.columns[index]} className="px-4 py-3 text-fg">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {guide.note ? <p className="mt-3 text-sm text-fg-muted">{guide.note}</p> : null}
    </div>
  );
}
