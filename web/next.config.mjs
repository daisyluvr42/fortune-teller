import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable standalone output for Docker deployment and Vercel optimization
    output: "standalone",
};

export default withNextIntl(nextConfig);
