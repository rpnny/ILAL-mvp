/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

    return config;
  },
};

module.exports = nextConfig;
