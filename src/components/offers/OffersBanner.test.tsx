import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OffersBanner } from './OffersBanner';

// CA-04 (T-100): el porcentaje sale de los datos; sin ofertas no hay cifra.
describe('OffersBanner', () => {
  it('muestra «Hasta -N%» con el mayor descuento real', () => {
    render(<OffersBanner maxPercent={25} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Hasta -25% en prendas seleccionadas' })).toBeTruthy();
  });

  it('sin ofertas no promete ninguna cifra', () => {
    render(<OffersBanner maxPercent={null} />);
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Ofertas' })).toBeTruthy();
  });
});
