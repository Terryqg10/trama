-- T-033: confirmación de pago por webhook (SPEC-001 RF-07, CA-11 y CA-13).
--
-- Una sola transacción: registra el evento de Stripe (idempotencia por event_id), pasa el pedido de
-- 'pendiente' a 'pagado', descuenta el stock de las variantes y marca las reservas como 'consumida'.
-- Es SECURITY DEFINER y solo la ejecuta service_role (el servidor, tras verificar la firma del webhook).
--
-- Devuelve:
--   {"ok": true, "result": "paid"}                       pedido pagado y stock descontado
--   {"ok": true, "result": "duplicate"}                  el evento ya se había procesado
--   {"ok": true, "result": "not_pending", "status": ...} el pedido no estaba pendiente (p. ej. cancelado)
--   {"ok": true, "result": "order_not_found"}            el pedido no existe

create or replace function public.confirm_order_payment(p_order_id uuid, p_event_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
  v_status public.order_status;
begin
  if p_event_id is null or char_length(p_event_id) = 0 then
    raise exception 'event_id obligatorio';
  end if;

  -- Idempotencia: el mismo evento solo se procesa una vez.
  insert into public.stripe_events (event_id) values (p_event_id) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return jsonb_build_object('ok', true, 'result', 'duplicate');
  end if;

  select status into v_status from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', true, 'result', 'order_not_found');
  end if;

  -- Solo un pedido pendiente puede pasar a pagado: dos eventos distintos del mismo pago no duplican nada.
  if v_status <> 'pendiente' then
    return jsonb_build_object('ok', true, 'result', 'not_pending', 'status', v_status);
  end if;

  -- Bloquea las variantes en orden por id antes de descontar (evita interbloqueos).
  perform 1
    from public.product_variants
   where id in (
     select variant_id from public.stock_reservations
      where order_id = p_order_id and status = 'activa'
   )
   order by id
     for update;

  update public.product_variants v
     set stock = greatest(v.stock - r.qty, 0)
    from public.stock_reservations r
   where r.order_id = p_order_id
     and r.status = 'activa'
     and r.variant_id = v.id;

  update public.stock_reservations
     set status = 'consumida'
   where order_id = p_order_id
     and status = 'activa';

  update public.orders set status = 'pagado' where id = p_order_id;

  return jsonb_build_object('ok', true, 'result', 'paid');
end;
$$;

revoke all on function public.confirm_order_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text) to service_role;
