-- Emitir presupuesto: los presupuestos que armamos en la app con membrete de DAYSA o Técnica Naval.
-- Se guardan en la misma tabla que los históricos (así aparecen en Presupuestos y al buscar un PN) con origen = 'emitido'.
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run. Se puede correr de nuevo sin problema.

-- Los emitidos no tienen archivo subido: el PDF se arma en el momento.
alter table presupuestos alter column archivo drop not null;

alter table presupuestos add column if not exists origen             text not null default 'importado';
alter table presupuestos add column if not exists membrete           text;  -- daysa | tecnica-naval
alter table presupuestos add column if not exists modelo             text;  -- repuestos | repuestos-servicios | servicios
alter table presupuestos add column if not exists atencion           text;  -- "At. Sr. ..." o la embarcación
alter table presupuestos add column if not exists referencia         text;  -- título: "Provisión de repuestos para motor MAK 8M20"
alter table presupuestos add column if not exists referencia_detalle text;  -- "Ref.: SC 10360 · OM17767"
alter table presupuestos add column if not exists entrega_dias       integer;
alter table presupuestos add column if not exists plazo_pago         text;  -- "30 días", "45 días", "60 días" + aclaración
alter table presupuestos add column if not exists oferta_dias        integer;
alter table presupuestos add column if not exists aclaraciones       text;
alter table presupuestos add column if not exists lugar_entrega      text;
alter table presupuestos add column if not exists lugar_emision      text;  -- "Asunción", va antes de la fecha

alter table presupuesto_items add column if not exists orden integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'presupuestos_origen_check') then
    alter table presupuestos add constraint presupuestos_origen_check check (origen in ('importado', 'emitido'));
  end if;
end $$;

create index if not exists presupuestos_emitidos_idx on presupuestos (membrete, id desc) where origen = 'emitido';
