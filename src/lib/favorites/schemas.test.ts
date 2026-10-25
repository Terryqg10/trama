import { describe, expect, it } from 'vitest';
import { favoriteRowSchema, productIdSchema } from './schemas';

// CA-75 (T-041): el id de producto es un UUID; cualquier otra cosa se rechaza antes de llegar a la BD.
describe('productIdSchema', () => {
  it('acepta un UUID', () => {
    expect(productIdSchema.safeParse('3f0e0b0e-2a4b-4c8e-9d2f-1a2b3c4d5e6f').success).toBe(true);
  });

  it.each(['', 'abc', '1', 'x; drop table favorites;--', '3f0e0b0e-2a4b-4c8e-9d2f', ' 3f0e0b0e-2a4b-4c8e-9d2f-1a2b3c4d5e6f'])(
    'rechaza %j',
    (value) => {
      expect(productIdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('favoriteRowSchema', () => {
  it('exige product_id UUID y created_at', () => {
    expect(favoriteRowSchema.safeParse({ product_id: '3f0e0b0e-2a4b-4c8e-9d2f-1a2b3c4d5e6f', created_at: 'x' }).success).toBe(true);
    expect(favoriteRowSchema.safeParse({ product_id: 'no', created_at: 'x' }).success).toBe(false);
  });
});
