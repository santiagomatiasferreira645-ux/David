/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf.js pide el paquete "canvas" solo cuando corre en Node; en la app se usa en el navegador.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
