-- T-019: reserva de stock atómica (SPEC-001 RF-11, CA-18 y CA-19).
--
-- La comprobación y la reserva tienen que ocurrir en una sola transacción con las variantes
-- bloqueadas: hecho desde la aplicación en dos pasos, dos compradores podrían llevarse la última
-- unidad. Estas funciones son SECURITY DEFINER y solo las ejecuta service_role (el servidor).
--
-- Disponibilidad de una variante = stock - reservas 'activa' no vencidas. Consumir una reserva
-- (T-033) descuenta del stock y la marca 'consumida', así que no se cuenta dos veces.

-- ---------------------------------------------------------------------------
-- release_expired_reservations: libera las reservas vencidas y cancela sus pedidos pendientes
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_released integer;
begin
  with expired as (
    update public.stock_reservations
       set status = 'liberada'
     where status = 'activa'
       and expires_at <= now()
    returning id
  )
  select count(*) into v_released from expired;

  -- Un pedido pendiente que se queda sin ninguna reserva viva (activa o consumida) se cancela.
  update public.orders o
     set status = 'cancelado'
   where o.status = 'pendiente'
     and exists (
       select 1 from public.stock_reservations r
        where r.order_id = o.id and r.status = 'liberada'
     )
     and not exists (
       select 1 from public.stock_reservations r
        where r.order_id = o.id and r.status in ('activa', 'consumida')
     );

  return v_released;
end;
$$;

-- ---------------------------------------------------------------------------
-- reserve_stock: reserva todas las líneas o ninguna
--   p_lines: [{"variant_id": "<uuid>", "qty": 1}, ...]
--   Devuelve {"ok": true, "expires_at": "..."} o {"ok": false, "reason": "...", "shortages": [...]}
-- ---------------------------------------------------------------------------
create or replace function public.reserve_stock(
  p_order_id uuid,
  p_lines jsonb,
  p_ttl interval default interval '30 minutes'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line record;
  v_available integer;
  v_shortages jsonb := '[]'::jsonb;
  v_expires timestamptz;
begin
  if p_lines is null
     or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0
     or exists (
       select 1
         from jsonb_array_elements(p_lines) l
        where jsonb_typeof(l) <> 'object'
           or (l ->> 'variant_id') is null
           or (l ->> 'variant_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           or (l ->> 'qty') is null
           or (l ->> 'qty') !~ '^[0-9]{1,2}$'
           or (l ->> 'qty')::integer < 1
     ) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_lines');
  end if;

  -- Libera primero lo vencido: así sus unidades vuelven a estar disponibles.
  perform public.release_expired_reservations();

  if not exists (
    select 1 from public.orders where id = p_order_id and status = 'pendiente'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'order_not_pending');
  end if;

  if exists (
    select 1 from public.stock_reservations
     where order_id = p_order_id and status = 'activa'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_reserved');
  end if;

  -- Bloquea las variantes implicadas en orden por id (evita interbloqueos entre compradores).
  perform 1
    from public.product_variants
   where id in (select (l ->> 'variant_id')::uuid from jsonb_array_elements(p_lines) l)
   order by id
     for update;

  for v_line in
    select (l ->> 'variant_id')::uuid as variant_id,
           sum((l ->> 'qty')::integer)::integer as qty
      from jsonb_array_elements(p_lines) l
     group by 1
     order by 1
  loop
    select v.stock - coalesce((
             select sum(r.qty)
               from public.stock_reservations r
              where r.variant_id = v.id
                and r.status = 'activa'
                and r.expires_at > now()
           ), 0)
      into v_available
      from public.product_variants v
     where v.id = v_line.variant_id;

    if v_available is null or v_available < v_line.qty then
      v_shortages := v_shortages || jsonb_build_array(
        jsonb_build_object(
          'variant_id', v_line.variant_id,
          'requested', v_line.qty,
          'available', greatest(coalesce(v_available, 0), 0)
        )
      );
    end if;
  end loop;

  if jsonb_array_length(v_shortages) > 0 then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_stock', 'shortages', v_shortages);
  end if;

  v_expires := now() + p_ttl;

  insert into public.stock_reservations (order_id, variant_id, qty, expires_at)
  select p_order_id,
         (l ->> 'variant_id')::uuid,
         sum((l ->> 'qty')::integer)::integer,
         v_expires
    from jsonb_array_elements(p_lines) l
   group by 2;

  return jsonb_build_object('ok', true, 'expires_at', v_expires);
end;
$$;

-- ---------------------------------------------------------------------------
-- release_order_reservations: libera las reservas activas de un pedido y lo cancela si sigue pendiente
-- ---------------------------------------------------------------------------
create or replace function public.release_order_reservations(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_released integer;
begin
  with released as (
    update public.stock_reservations
       set status = 'liberada'
     where order_id = p_order_id
       and status = 'activa'
    returning id
  )
  select count(*) into v_released from released;

  update public.orders
     set status = 'cancelado'
   where id = p_order_id
     and status = 'pendiente';

  return v_released;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: solo el servidor (service_role)
-- ---------------------------------------------------------------------------
revoke all on function public.release_expired_reservations() from public, anon, authenticated;
revoke all on function public.reserve_stock(uuid, jsonb, interval) from public, anon, authenticated;
revoke all on function public.release_order_reservations(uuid) from public, anon, authenticated;

grant execute on function public.release_expired_reservations() to service_role;
grant execute on function public.reserve_stock(uuid, jsonb, interval) to service_role;
grant execute on function public.release_order_reservations(uuid) to service_role;
