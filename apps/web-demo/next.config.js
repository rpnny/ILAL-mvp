/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 性能优化配置
  swcMinify: true, // 使用 SWC 压缩（更快）
  compress: true, // 启用 gzip 压缩
  
  // 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // 实验性功能
  experimental: {
    // optimizeCss: true, // 需要 critters 依赖，暂时禁用
    optimizePackageImports: [
      '@rainbow-me/rainbowkit',
      'wagmi',
      'viem',
      'ethers',
    ],
  },
  
  // 编译输出
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 页面配置
  poweredByHeader: false, // 移除 X-Powered-By header
  
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      crypto: false,
      stream: false,
      os: false,
      path: false,
      url: false,
      assert: false,
      constants: false,
      '@react-native-async-storage/async-storage': false,
      'react-native-webview': false,
    };
    config.externals.push('pino-pretty', 'encoding');

    if (isServer) {
      // 在服务端不 bundle circomlibjs（它只在客户端 dynamic import 使用）
      config.externals.push('circomlibjs', 'ffjavascript');
    }
    
    // 优化 bundle 大小
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Web3 库单独打包
          web3: {
            name: 'web3',
            test: /[\\/]node_modules[\\/](wagmi|viem|@rainbow-me|ethers)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          // ZK 库单独打包
          zk: {
            name: 'zk',
            test: /[\\/]node_modules[\\/](snarkjs|circomlibjs|ffjavascript)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          // React 库
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          // 其他公共库
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
    };

    return config;
  },
};

module.exports = nextConfig;
