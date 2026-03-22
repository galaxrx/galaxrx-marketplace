/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.uploadthing.com', pathname: '/**' },
      { protocol: 'https', hostname: 'utfs.io', pathname: '/**' },
      // UploadThing v7+ file URLs (appId.ufs.sh)
      { protocol: 'https', hostname: '*.ufs.sh', pathname: '/**' },
      { protocol: 'https', hostname: 'ufs.sh', pathname: '/**' },
      { protocol: 'https', hostname: 'images.barcodelookup.com', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
    ],
  },
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
};

export default nextConfig;
