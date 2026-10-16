import Link from 'next/link';
import { LEGAL_NAV } from '@/lib/domain/navigation';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-(--layout-container) px-(--layout-gutter) py-8 text-sm text-fg-muted">
        <nav aria-label="Legal">
          <ul className="-ml-3 flex flex-wrap gap-x-2 gap-y-1">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-control px-3 text-fg-muted underline hover:text-accent-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-3">Trama. Proyecto de portfolio: los pagos son de prueba y no se cobra nada.</p>
        <p className="mt-1">Precios en euros, IVA incluido.</p>
      </div>
    </footer>
  );
}
