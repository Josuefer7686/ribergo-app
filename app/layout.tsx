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
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-192.png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#05080B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json?v=2.1" />
        <meta name="theme-color" content="#05080B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RiberGO" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2.1" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=2.1" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png?v=2.1" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2.1" />
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
