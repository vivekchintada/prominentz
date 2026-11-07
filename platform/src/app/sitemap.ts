import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly' }[] = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/owners', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/managers', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/servers', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/kitchen', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/signup', priority: 0.8, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
  ]
  return pages.map((p) => ({
    url: `${siteUrl}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
