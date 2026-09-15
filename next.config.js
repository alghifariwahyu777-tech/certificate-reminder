/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // pdfkit reads its built-in font metrics (Helvetica.afm, etc.) straight off
  // disk at runtime. If webpack bundles it into the route's compiled output,
  // that file lookup breaks. Marking it "external" tells Next.js to require()
  // it directly from node_modules instead, keeping its files intact.
  serverExternalPackages: ["pdfkit"],
};

module.exports = nextConfig;
