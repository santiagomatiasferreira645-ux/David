-- Pasa al módulo Servicios los renglones de servicio de los presupuestos que se leyeron antes de crear la tabla servicios.
-- Correr DESPUÉS de 0007_presupuestos.sql y 0008_servicios.sql: SQL Editor > New query > pegar este archivo > Run.
-- Se puede correr de nuevo sin duplicar: solo copia presupuestos que todavía no tienen servicios pasados.
-- La categoría es la que puso la IA (guardada al principio de las notas del renglón); si no hay, se deduce de la
-- descripción, y lo que no encaja queda en "Otro" para corregir a mano en Servicios.

insert into servicios (prestador, proveedor_id, proveedor_nombre, categoria, descripcion, marca, modelo_motor, cliente, cliente_id,
                       fecha, cantidad, unidad, precio, moneda, plazo_dias, estado, presupuesto_id, origen, notas)
select
  coalesce(p.tipo, 'propio'),
  case when p.tipo = 'proveedor' then p.proveedor_id end,
  case when p.tipo = 'proveedor' then p.proveedor_nombre end,
  case
    when split_part(coalesce(i.notas, ''), ' · ', 1) in ('Overhaul', 'Reparación', 'Mano de obra', 'Rectificado',
         'Inspección / diagnóstico', 'Montaje / instalación', 'Flete / logística') then split_part(i.notas, ' · ', 1)
    when i.descripcion ~* 'overhaul|top ?end|media vida|reparaci[oó]n general|major' then 'Overhaul'
    when i.descripcion ~* 'rectific|encamis|metaliz|bru[nñ]id' then 'Rectificado'
    when i.descripcion ~* 'flete|transporte|env[ií]o|log[ií]stic|courier|despacho' then 'Flete / logística'
    when i.descripcion ~* 'inspecc|diagn[oó]st|revisi[oó]n|boroscop|an[aá]lisis|prueba|ensayo' then 'Inspección / diagnóstico'
    when i.descripcion ~* 'montaje|desmontaje|instalaci|alineaci' then 'Montaje / instalación'
    when i.descripcion ~* 'repar' then 'Reparación'
    when i.descripcion ~* 'mano de obra|hora|t[eé]cnico|labor|vi[aá]tico' then 'Mano de obra'
    else 'Otro'
  end,
  i.descripcion, i.marca, i.modelo_motor, p.cliente, p.cliente_id,
  p.fecha, i.cantidad, i.unidad, i.precio_unitario, i.moneda, i.plazo_dias,
  'presupuestado', p.id, 'Presupuesto histórico', i.notas
from presupuesto_items i
join presupuestos p on p.id = i.presupuesto_id
where i.clase = 'servicio'
  and coalesce(i.descripcion, '') <> ''
  and not exists (select 1 from servicios s where s.presupuesto_id = p.id);

-- Saca el aviso "no se pudieron pasar los servicios" de los presupuestos que ya quedaron bien.
update presupuestos set error = null where estado = 'listo' and error is not null;
