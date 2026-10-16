import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SizeGuide } from '@/lib/catalog/size-guide';
import { SizeGuideTable } from './SizeGuideTable';

// CA-31: la guía muestra la tabla de la categoría de la ficha.

const guide: SizeGuide = {
  columns: ['Cuello (cm)', 'Pecho (cm)'],
  rows: [
    { size: 'S', values: ['38', '92–96'] },
    { size: 'M', values: ['40', '100–104'] },
  ],
  note: 'Medidas de ejemplo.',
};

describe('SizeGuideTable', () => {
  it('es una tabla con título accesible de la categoría', () => {
    render(<SizeGuideTable category="camisas" guide={guide} />);
    expect(screen.getByRole('table', { name: 'Guía de tallas: Camisas' })).toBeInTheDocument();
  });

  it('tiene cabeceras de columna (talla y medidas) y de fila (cada talla)', () => {
    render(<SizeGuideTable category="camisas" guide={guide} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Talla',
      'Cuello (cm)',
      'Pecho (cm)',
    ]);
    expect(within(table).getAllByRole('rowheader').map((h) => h.textContent)).toEqual(['S', 'M']);
  });

  it('muestra los valores de cada talla en su fila', () => {
    render(<SizeGuideTable category="camisas" guide={guide} />);
    const row = screen.getByRole('row', { name: /^M / });
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual(['40', '100–104']);
  });

  it('muestra la nota y se puede desplazar con teclado si no cabe', () => {
    render(<SizeGuideTable category="camisas" guide={guide} />);
    expect(screen.getByText('Medidas de ejemplo.')).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Tabla de tallas de camisas' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('sin nota no pinta el párrafo', () => {
    const { container } = render(
      <SizeGuideTable category="camisas" guide={{ columns: guide.columns, rows: guide.rows }} />,
    );
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});
