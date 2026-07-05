import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { FinanceProvider } from '@/contexts/FinanceContext'

export const metadata: Metadata = {
  title: 'FinShield - Financial Portfolio Simulator',
  description: 'portfolio management and simulation platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.1.0/uicons-regular-rounded/css/uicons-regular-rounded.css" />
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.1.0/uicons-solid-rounded/css/uicons-solid-rounded.css" />
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.1.0/uicons-bold-rounded/css/uicons-bold-rounded.css" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined') {
              window.addEventListener('wheel', function(e) {
                if (e.target && e.target.type === 'number') {
                  e.target.blur();
                }
              }, { passive: false });

              window.addEventListener('keydown', function(e) {
                if (e.target && e.target.type === 'number') {
                  if (e.key === '-' || e.key === 'e') {
                    e.preventDefault();
                  }
                }
              });
            }
          `
        }} />
        <AuthProvider>
          <FinanceProvider>
            {children}
          </FinanceProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
