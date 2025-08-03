import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Country Days - Scotland\'s Premier Daytime Country Music Party',
  description: 'Join us for Country Days, Scotland\'s biggest daytime country music parties in Glasgow, Edinburgh, Aberdeen, Dundee, and Paisley. Experience line dancing, mechanical bulls, and more!',
  openGraph: {
    title: 'Country Days - Scotland\'s Premier Daytime Country Music Party',
    description: 'Join us for Country Days, Scotland\'s biggest daytime country music parties in Glasgow, Edinburgh, Aberdeen, Dundee, and Paisley.',
    images: ['/images/hero-bg.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}