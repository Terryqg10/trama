import { describe, expect, it } from 'vitest';
import { fieldErrors } from '@/lib/auth/schemas';
import { eurosToCents, productSchema, slugSchema, slugify, variantSchema, variantUpdateSchema } from './product-schemas';

const validProduct = {
  name: 'Polo piqué básico',
  slug: 'polo-pique-basico',
  description: '',
  gender: 'hombre',
  category: 'polos',
  occasion: 'casual',
  composition: '100% algodón',
  care: '',
  modelHeightCm: '185',
  modelSize: 'M',
};

describe('eurosToCents (RNF-08: sin float)', () => {
  it.each([
    ['29,90', 2990],
    ['29.90', 2990],
    ['30', 3000],
    ['0,5', 50],
    ['0,05', 5],
    ['  12,3 ', 1230],
    ['1999,99', 199999],
  ])('convierte %s en %i céntimos', (input, expected) => {
    expect(eurosToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '12,345', '-5', '1e3', '12,', ',50', '1.000,00', '9999999'])('rechaza %j', (input) => {
    expect(eurosToCents(input)).toBeNull();
  });
});

describe('slugify y slugSchema', () => {
  it('quita tildes, pasa a minúsculas y une con guiones', () => {
    expect(slugify('Polo Piqué Básico')).toBe('polo-pique-basico');
    expect(slugify('  Camisa  oxford — 100% algodón!  ')).toBe('camisa-oxford-100-algodon');
    expect(slugify('Ñandú')).toBe('nandu');
  });

  it('un nombre sin letras ni números da un slug vacío', () => {
    expect(slugify('¡¡¡')).toBe('');
  });

  it('el slug propuesto cumple el patrón de la BD', () => {
    expect(slugSchema.safeParse(slugify('Pantalón chino slim (nuevo)')).success).toBe(true);
  });

  it.each(['Polo', 'polo basico', '-polo', 'polo-', 'polo--basico', 'pólo', ''])('rechaza el slug %j', (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(false);
  });
});

describe('productSchema (CA-16)', () => {
  it('acepta un producto válido y normaliza vacíos a null y números', () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        name: 'Polo piqué básico',
        description: null,
        care: null,
        composition: '100% algodón',
        modelHeightCm: 185,
        isNew: false,
      });
    }
  });

  it('la casilla «nuevo» llega como «on» o no llega', () => {
    const marked = productSchema.safeParse({ ...validProduct, isNew: 'on' });
    expect(marked.success && marked.data.isNew).toBe(true);
    const unmarked = productSchema.safeParse(validProduct);
    expect(unmarked.success && unmarked.data.isNew).toBe(false);
  });

  it('devuelve un error por campo inválido', () => {
    const result = productSchema.safeParse({
      ...validProduct,
      name: '',
      slug: 'Con Espacios',
      gender: 'niño',
      modelHeightCm: '50',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(Object.keys(errors).sort()).toEqual(['gender', 'modelHeightCm', 'name', 'slug']);
      expect(errors['gender']).toBe('Elige un género.');
      expect(errors['modelHeightCm']).toBe('La altura del modelo debe estar entre 100 y 250.');
    }
  });

  it('rechaza una altura que no es un número entero', () => {
    const result = productSchema.safeParse({ ...validProduct, modelHeightCm: '1,85' });
    expect(result.success).toBe(false);
  });

  it('respeta los máximos de la BD', () => {
    expect(productSchema.safeParse({ ...validProduct, description: 'x'.repeat(4001) }).success).toBe(false);
    expect(productSchema.safeParse({ ...validProduct, composition: 'x'.repeat(501) }).success).toBe(false);
    expect(productSchema.safeParse({ ...validProduct, modelSize: 'x'.repeat(11) }).success).toBe(false);
    expect(productSchema.safeParse({ ...validProduct, name: 'x'.repeat(161) }).success).toBe(false);
  });
});

describe('variantSchema', () => {
  it('convierte el precio a céntimos, la talla a mayúsculas y el color a minúsculas', () => {
    const result = variantSchema.safeParse({ size: ' m ', color: ' Negro ', price: '29,90', stock: '8' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ size: 'M', color: 'negro', price: 2990, stock: 8 });
  });

  it('un stock de 0 es válido; negativo o decimal no', () => {
    expect(variantSchema.safeParse({ size: 'M', color: 'negro', price: '10', stock: '0' }).success).toBe(true);
    expect(variantSchema.safeParse({ size: 'M', color: 'negro', price: '10', stock: '-1' }).success).toBe(false);
    expect(variantSchema.safeParse({ size: 'M', color: 'negro', price: '10', stock: '1,5' }).success).toBe(false);
  });

  it('el precio debe ser un importe válido y mayor que 0', () => {
    for (const price of ['0', '0,00', 'gratis', '10,999', '-3']) {
      const result = variantSchema.safeParse({ size: 'M', color: 'negro', price, stock: '1' });
      expect(result.success, price).toBe(false);
    }
  });

  it('variantUpdateSchema solo mira precio y stock', () => {
    const result = variantUpdateSchema.safeParse({ price: '19,95', stock: '3', size: 'ignorado' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ price: 1995, stock: 3 });
  });
});

describe('productSchema: las nueve categorías (CA-79)', () => {
  it.each(['polos', 'camisas', 'blusas', 'pantalones', 'camisetas', 'sudaderas', 'chaquetas', 'faldas', 'tops'])(
    'acepta un producto de la categoría %s',
    (category) => {
      expect(productSchema.safeParse({ ...validProduct, category }).success).toBe(true);
    },
  );

  it('rechaza una categoría desconocida', () => {
    expect(productSchema.safeParse({ ...validProduct, category: 'abrigos' }).success).toBe(false);
  });
});
