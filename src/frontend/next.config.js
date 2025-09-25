/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_FILECOIN_NETWORK: process.env.NEXT_PUBLIC_FILECOIN_NETWORK,
    NEXT_PUBLIC_SYNAPSE_API_URL: process.env.NEXT_PUBLIC_SYNAPSE_API_URL,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Handle node modules that need to be polyfilled
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
      };
      
      // Increase chunk loading timeout to prevent timeout errors
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      };
      
      // Increase the timeout for loading chunks
      config.output.chunkLoadTimeout = 60000; // 60 seconds
    }
    
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://verify.walletconnect.com https://verify.walletconnect.org https://explorer-api.walletconnect.com https://relay.walletconnect.com https://pulse.walletconnect.org https://api.web3modal.org; object-src 'none'; base-uri 'self'; connect-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org https://explorer-api.walletconnect.com https://relay.walletconnect.com https://pulse.walletconnect.org https://api.web3modal.org https://api.node.glif.io https://api.calibration.node.glif.io https://eth-mainnet.g.alchemy.com https://eth-sepolia.g.alchemy.com https://polygon-mainnet.g.alchemy.com https://polygon-mumbai.g.alchemy.com wss://relay.walletconnect.com wss://relay.walletconnect.org;"
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;