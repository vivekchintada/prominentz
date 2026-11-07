import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/privacy', '/terms', '/owners', '/managers', '/servers', '/kitchen'],
        // App screens and APIs are private and shouldn't be indexed.
        disallow: ['/api/', '/dashboard', '/pos', '/kds', '/server', '/m', '/kiosk', '/onboarding', '/invite', '/order/track/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
