import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SQLAgent — Text-to-SQL Analytics',
  description:
    'Ask questions about your data in plain English. QueryPilot writes the SQL, runs it, and visualizes the answer as charts.',
  icons: {
    icon: '/ice-cream-logo.svg',
    apple: '/ice-cream-logo.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f8ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        suppressHydrationWarning={true}
      >
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
