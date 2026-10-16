'use client';

import { CatalogError } from '@/components/catalog/CatalogError';

export default function Error({ reset }: { readonly error: Error; readonly reset: () => void }) {
  return <CatalogError reset={reset} />;
}
