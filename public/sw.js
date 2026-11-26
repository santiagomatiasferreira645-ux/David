// Service worker mínimo: Chrome en Android lo necesita para instalar la app
// como aplicación propia (con su ícono) y no como un acceso directo del navegador.
// No guarda nada en caché: todo se pide siempre a internet, así nunca queda
// una versión vieja de la app.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
