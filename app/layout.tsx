import type {Metadata, Viewport} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RiberGO - Mototaxis a un toque',
  description: 'RiberGO es una plataforma moderna de movilidad urbana para solicitar mototaxis en Riberalta de forma rápida y segura.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RiberGO',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#05080B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#05080B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RiberGO" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.deferredPwaPrompt = null;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPwaPrompt = e;
              });
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased bg-background text-white select-none overflow-hidden h-screen h-[100dvh]`} suppressHydrationWarning>
        <div className="mx-auto w-full max-w-[430px] h-full h-[100dvh] relative overflow-hidden bg-background shadow-2xl sm:border-x sm:border-border-custom flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
