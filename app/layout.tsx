import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Locality Ideas — AI-Powered Local Innovation Assistant',
  description:
    'Discover software and hardware project ideas tailored to your city\'s real problems and local resources. Get AI-generated build plans, hardware BOMs, and step-by-step guidance.',
  keywords: ['maker', 'hardware projects', 'software ideas', 'local innovation', 'AI assistant', 'build plans'],
  openGraph: {
    title: 'Locality Ideas — AI-Powered Local Innovation Assistant',
    description: 'Find local project ideas and get AI-powered build plans tailored to your location.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  )
}
