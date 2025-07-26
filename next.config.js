/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 배포를 위한 standalone 출력
  output: 'standalone',
  
  // 이미지 최적화 설정
  images: {
    unoptimized: true
  },

  // 환경 변수 설정
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 실험적 기능
  experimental: {
    // 서버 컴포넌트 최적화
    serverComponentsExternalPackages: []
  }
}

module.exports = nextConfig 