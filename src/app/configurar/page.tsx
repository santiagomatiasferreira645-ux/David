export default function Configurar() {
  return (
    <div className="tarjeta space-y-3">
      <h1 className="titulo">Falta conectar la base de datos</h1>
      <p>
        La app necesita las variables <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> del proyecto de
        Supabase. En Vercel se cargan en Settings, Environment Variables; en una PC, en el archivo <code>.env.local</code>.
      </p>
    </div>
  );
}
