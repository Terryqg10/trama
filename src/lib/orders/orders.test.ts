import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES, formatOrderDate, orderNumber, statusHint, statusLabel } from './orders';

describe('estados de pedido', () => {
  it('todos los estados tienen etiqueta y explicación en texto', () => {
    for (const status of ORDER_STATUSES) {
      expect(statusLabel(status).length).toBeGreaterThan(0);
      expect(statusHint(status).length).toBeGreaterThan(0);
    }
  });

  it('nombra los estados como los entiende el cliente', () => {
    expect(statusLabel('pendiente')).toBe('Pendiente de pago');
    expect(statusLabel('preparado')).toBe('En preparación');
    expect(statusLabel('cancelado')).toBe('Cancelado');
  });
});

describe('orderNumber y formatOrderDate', () => {
  it('el número del pedido son los 8 primeros caracteres del id en mayúsculas', () => {
    expect(orderNumber('3f9a25bc-1111-4111-8111-111111111111')).toBe('3F9A25BC');
  });

  it('formatea la fecha en español y tolera valores inválidos', () => {
    expect(formatOrderDate('2026-10-17T12:30:00Z')).toBe('17 de octubre de 2026');
    expect(formatOrderDate('no es una fecha')).toBe('');
  });
});
