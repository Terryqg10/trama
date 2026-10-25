import { z } from 'zod';

/** El id de producto que llega del navegador: un UUID (I5). */
export const productIdSchema = z.string().uuid();

export const favoriteRowSchema = z.object({
  product_id: z.string().uuid(),
  created_at: z.string(),
});
export type FavoriteRow = z.infer<typeof favoriteRowSchema>;
