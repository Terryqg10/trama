import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES } from './orders';
import { adminNextStatuses, canTransition, isFinalStatus } from './transitions';

describe('order-transitions (CA-17)', () => {
  it('un pedido entregado no puede pasar a pagado (ni por el admin ni por el sistema)', () => {
    expect(canTransition('entregado', 'pagado', 'admin')).toBe(false);
    expect(canTransition('entregado', 'pagado', 'sistema')).toBe(false);
  });

  it('el admin avanza el pedido paso a paso: pagado, preparado, enviado, entregado', () => {
    expect(canTransition('pagado', 'preparado', 'admin')).toBe(true);
    expect(canTransition('preparado', 'enviado', 'admin')).toBe(true);
    expect(canTransition('enviado', 'entregado', 'admin')).toBe(true);
  });

  it('el admin no puede saltarse estados ni retroceder', () => {
    expect(canTransition('pagado', 'enviado', 'admin')).toBe(false);
    expect(canTransition('pagado', 'entregado', 'admin')).toBe(false);
    expect(canTransition('enviado', 'preparado', 'admin')).toBe(false);
    expect(canTransition('preparado', 'pagado', 'admin')).toBe(false);
  });

  it('solo el sistema confirma el pago o cancela un pedido pendiente', () => {
    expect(canTransition('pendiente', 'pagado', 'sistema')).toBe(true);
    expect(canTransition('pendiente', 'pagado', 'admin')).toBe(false);
    expect(canTransition('pendiente', 'cancelado', 'sistema')).toBe(true);
    expect(canTransition('pendiente', 'cancelado', 'admin')).toBe(false);
  });

  it('el admin puede cancelar un pedido pagado, pero no uno ya preparado', () => {
    expect(canTransition('pagado', 'cancelado', 'admin')).toBe(true);
    expect(canTransition('preparado', 'cancelado', 'admin')).toBe(false);
    expect(canTransition('enviado', 'cancelado', 'admin')).toBe(false);
  });

  it('entregado y cancelado son finales: no salen de ahí a ningún estado', () => {
    for (const final of ['entregado', 'cancelado'] as const) {
      expect(isFinalStatus(final)).toBe(true);
      for (const to of ORDER_STATUSES) {
        expect(canTransition(final, to, 'admin')).toBe(false);
        expect(canTransition(final, to, 'sistema')).toBe(false);
      }
    }
  });

  it('un estado no pasa a sí mismo', () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status, 'admin')).toBe(false);
    }
  });

  it('adminNextStatuses lista solo los destinos permitidos al admin', () => {
    expect(adminNextStatuses('pendiente')).toEqual([]);
    expect(adminNextStatuses('pagado')).toEqual(['preparado', 'cancelado']);
    expect(adminNextStatuses('preparado')).toEqual(['enviado']);
    expect(adminNextStatuses('enviado')).toEqual(['entregado']);
    expect(adminNextStatuses('entregado')).toEqual([]);
    expect(adminNextStatuses('cancelado')).toEqual([]);
  });
});
