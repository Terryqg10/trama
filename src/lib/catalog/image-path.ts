import { z } from 'zod';

/**
 * Ruta de una imagen de producto. Mismo patrón que el CHECK de `product_images.path`:
 * `/products/` (SVG heredados) o `/images/products/` (fotos optimizadas, ADR-009). Cualquier otra
 * (URL externa, `..`, otra extensión) se rechaza.
 */
export const IMAGE_PATH_PATTERN = /^\/(products|images\/products)\/[a-z0-9]+(-[a-z0-9]+)*\.(svg|webp|avif|jpg|png)$/;

export const productImagePathSchema = z.string().regex(IMAGE_PATH_PATTERN);

/** Las fotos (`/images/products/`) llenan el marco; los SVG heredados (`/products/`) se centran con margen. */
export function isPhotoPath(path: string): boolean {
  return path.startsWith('/images/products/');
}
