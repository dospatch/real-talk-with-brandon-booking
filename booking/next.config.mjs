/** @type {import('next').NextConfig} */
const portal = 'https://real-talk-with-brandon-guest-portal.vercel.app';

const nextConfig = {
  async rewrites() {
    return [
      { source: '/apply', destination: portal + '/' },
      { source: '/apply/:path*', destination: portal + '/:path*' },
      { source: '/staff', destination: portal + '/staff' },
      { source: '/staff/:path*', destination: portal + '/staff/:path*' },
      { source: '/api/:path*', destination: portal + '/api/:path*' },
      { source: '/_next/:path*', destination: portal + '/_next/:path*' },
    ];
  },
};

export default nextConfig;
