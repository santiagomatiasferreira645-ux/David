# Buscador de repuestos

App web para buscar repuestos navales por PN y marca. Devuelve los proveedores que ya cotizaron ese PN, los que fueron consultados y los que manejan la marca, con links directos de WhatsApp, llamada y mail (el mensaje de consulta sale armado en español, inglés o portugués según el proveedor). Cada búsqueda, contacto y precio queda en el historial.

Funciona en PC y celular (se puede agregar a la pantalla de inicio). Está hecha con Next.js y Supabase.

## Qué hace

- **Buscar**: PN + marca + cantidad. Ordena primero quien ya cotizó ese PN (con el último precio y la fecha), después a quien ya se le consultó y por último quien maneja la marca. Muestra la hora local del proveedor y si está en horario comercial.
- **Búsqueda con IA**: si el PN no está registrado en la base, la IA busca en la web proveedores alternativos (con el PN exacto, distribuidores de la marca, usados o reacondicionados) y muestra sus contactos. Con un botón se agregan a la base. Si el PN ya está registrado, la búsqueda con IA queda disponible con un botón. Los resultados se guardan 30 días para no repetir la consulta.
- **Marcas equivalentes**: CAT y Caterpillar, GE y General Electric, Wärtsilä y Wartsila, etc. se tratan como la misma marca (lista en `src/lib/marcas.ts`).
- **Fotos de referencia del PN**: en los resultados se agregan fotos del repuesto (desde el celular se puede sacar la foto en el momento). Quedan guardadas por PN y aparecen cada vez que se lo busca.
- **Catálogos de fábrica**: se cargan desde la app subiendo el PDF del manual; la IA lee cada página y arma la lista de PN con su descripción y página. El primero es el EMD 645: los 6.781 PN del catálogo de repuestos 302 (motores de 8, 12, 16 y 20 cilindros) con su descripción, lista (P.L.) y página. Se busca por PN o por descripción en inglés, y cada resultado abre la página del manual. Al buscar un PN también aparece si figura en el catálogo. Las descripciones salen de un escaneo con reconocimiento de texto y pueden tener errores de tipeo.
- **Descargar Excel**: una fila por proveedor, con links de WhatsApp, llamada y mail, y una columna de estado para seguir la consulta.
- **Historial**: todas las búsquedas con su estado (abierta, cotizada, comprada, perdida).
- **Proveedores**: ficha con contactos y todos los precios registrados.
- **Cargar precio**: registra una cotización recibida; si viene de una búsqueda, la marca como cotizada.

## Puesta en marcha

1. **Supabase**: crear el proyecto, abrir SQL Editor y ejecutar `supabase/migrations/0001_inicial.sql`.
2. **Datos de la fase 0**: ejecutar en el SQL Editor el archivo generado con
   `npm run importar -- fase0_proveedores.xlsx > importar.sql`.
   Se corre una sola vez. Ese archivo tiene datos de contactos: no lo subas al repositorio.
3. **Usuarios**: en Supabase, Authentication > Users > Invite user, uno por cada persona. La primera vez se entra con un link por mail, que lleva a Mi cuenta para crear la contraseña; después se entra con mail y contraseña.
   En Authentication > URL Configuration, poner la dirección de la app como Site URL.
4. **Vercel**: importar este repositorio y cargar en Environment Variables
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase > Project Settings > API).
5. **Búsqueda con IA**: ejecutar `supabase/migrations/0002_sugerencias_ia.sql` en el SQL Editor, crear una clave en console.anthropic.com
   y cargarla en Vercel como `ANTHROPIC_API_KEY` (sin `NEXT_PUBLIC_`: queda solo en el servidor). Después, Redeploy.
6. **Fotos de referencia**: ejecutar `supabase/migrations/0003_imagenes_pn.sql` en el SQL Editor (crea el espacio privado `imagenes-pn` en Storage).
7. **Catálogo EMD 645**: ejecutar `supabase/migrations/0004_catalogo.sql` y después los archivos con los PN del catálogo (se generan aparte con el PDF, no están en el repositorio). Subir el PDF en Storage > `catalogos` con el nombre `emd-645-catalogo-302.pdf`.
8. **Cargar más catálogos desde la app**: ejecutar `supabase/migrations/0005_catalogos.sql`. Después, en Catálogos > Cargar catálogo se elige el PDF; la app lo guarda, lee cada página con IA (usa la misma `ANTHROPIC_API_KEY`) y agrega sus PN.

## Desarrollo

```bash
cp .env.example .env.local   # completar con los datos de Supabase
npm install
npm run dev                  # http://localhost:3000
npm test                     # pruebas
```
