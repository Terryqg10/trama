import { describe, expect, it } from 'vitest';
import { isPhotoPath, productImagePathSchema } from './image-path';

// CA-67: la ruta de la imagen admite /products/ (SVG heredados) e /images/products/, y nada más.

describe('productImagePathSchema (CA-67)', () => {
  it.each([
    '/images/products/camisa-oxford-blanca.avif',
    '/images/products/polo-pique-azul-marino.webp',
    '/products/blusas-azul.svg',
    '/products/polos-gris.svg',
  ])('acepta %s', (path) => {
    expect(productImagePathSchema.safeParse(path).success).toBe(true);
  });

  it.each([
    'https://evil.example/x.avif',
    '//evil.example/x.avif',
    '/images/products/../secreto.avif',
    '/products/../secreto.svg',
    '/images/hero/hero-pareja-vertical.avif',
    '/images/products/script.js',
    '/images/products/Camisa.avif',
    '/images/products/camisa blanca.avif',
    '/images/products/sub/camisa.avif',
    '/otra/ruta.svg',
    'camisa.avif',
    '',
  ])('rechaza %s', (path) => {
    expect(productImagePathSchema.safeParse(path).success).toBe(false);
  });
});

describe('isPhotoPath', () => {
  it('distingue las fotos de los SVG heredados', () => {
    expect(isPhotoPath('/images/products/camisa-oxford-blanca.webp')).toBe(true);
    expect(isPhotoPath('/products/blusas-azul.svg')).toBe(false);
  });
});
