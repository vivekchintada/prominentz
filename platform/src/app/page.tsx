import type { Metadata } from 'next'
import SaaSLandingClient from '@/components/landing/SaaSLandingClient'
import { PRICING } from '@/lib/pricing'

export const metadata: Metadata = {
  title: { absolute: 'Prominentz — Restaurant POS & Kitchen Display for $50/month flat' },
  description:
    'Run your restaurant on the iPads and tablets you already own. POS, kitchen display (KDS), QR table ordering, and online ordering for $50/month flat. No contracts, 0% take-rate.',
  alternates: { canonical: '/' },
}

// Structured data so Google can show price and product details in search results.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Prominentz',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Restaurant point of sale',
  operatingSystem: 'Web, iPadOS, Android, Windows, macOS',
  description:
    'Restaurant POS, kitchen display system, QR table ordering, and online ordering that runs on devices you already own.',
  offers: {
    '@type': 'Offer',
    price: String(PRICING.STARTER.monthly),
    priceCurrency: 'USD',
    category: 'subscription',
  },
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SaaSLandingClient />
    </>
  )
}
