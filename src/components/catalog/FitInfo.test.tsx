import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FitInfo } from './FitInfo';

// SPEC-001 CA-33 (test componente `fit-info`): con altura y talla del modelo, la ficha los muestra
// junto a la composición y los cuidados.

const full = {
  modelHeightCm: 185,
  modelSize: 'M',
  composition: '100% algodón',
  care: 'Lavar a 30 °C. Secar tendido.',
};

describe('FitInfo (CA-33)', () => {
  it('muestra la altura y la talla del modelo junto a la composición y los cuidados', () => {
    render(<FitInfo product={full} />);
    const region = screen.getByRole('region', { name: 'Ajuste y cuidados' });
    expect(within(region).getByText('Mide 1,85 m y lleva la talla M')).toBeInTheDocument();
    expect(within(region).getByText('100% algodón')).toBeInTheDocument();
    expect(within(region).getByText('Lavar a 30 °C. Secar tendido.')).toBeInTheDocument();
  });

  it('es una lista de definición: cada dato es un término con su descripción', () => {
    render(<FitInfo product={full} />);
    const terms = screen.getAllByRole('term').map((term) => term.textContent);
    expect(terms).toEqual(['Modelo', 'Composición', 'Cuidados']);
    expect(screen.getAllByRole('definition')).toHaveLength(3);
  });

  it('un producto con solo algunos datos muestra solo esos', () => {
    render(<FitInfo product={{ ...full, modelHeightCm: null, modelSize: null, care: null }} />);
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['Composición']);
    expect(screen.queryByText('Modelo')).not.toBeInTheDocument();
    expect(screen.queryByText('Cuidados')).not.toBeInTheDocument();
  });

  it('solo con la altura del modelo, la frase no inventa la talla', () => {
    render(<FitInfo product={{ ...full, modelSize: null, composition: null, care: null }} />);
    expect(screen.getByText('Mide 1,85 m')).toBeInTheDocument();
  });

  it('sin ningún dato no pinta nada: ni título vacío ni «null»', () => {
    const { container } = render(
      <FitInfo product={{ modelHeightCm: null, modelSize: null, composition: null, care: null }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('no escribe «null» ni «undefined» en ningún caso', () => {
    const { container } = render(<FitInfo product={{ ...full, care: null }} />);
    expect(container.textContent).not.toMatch(/null|undefined/);
  });
});
