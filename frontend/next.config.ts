/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports if needed
  output: 'standalone',
  
  // Image optimization
  images: {
    domains: [
      'localhost',
      '127.0.0.1',
      // Add your Railway backend domain
      'zahnbug-production.up.railway.app',
    ],
    unoptimized: true, // Disable for Railway if needed
  },
  
  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ]
  },
  
  // CORS headers for development
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ]
  },
  
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['@ant-design/icons'],
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig