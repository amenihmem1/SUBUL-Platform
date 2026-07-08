import './globals.css'
import { ScrollReveal } from '@/components/scroll-reveal'
import { Toaster } from 'sonner'
import { defaultLocale } from '@/locales'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang={defaultLocale}>
      <body className="antialiased" suppressHydrationWarning>
        <ScrollReveal />
        <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  )
}
