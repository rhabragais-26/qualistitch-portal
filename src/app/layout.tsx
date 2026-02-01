import type {Metadata} from 'next';
import {Toaster} from '@/components/ui/toaster';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { RealtimeConfetti } from '@/components/realtime-confetti';
import { RealtimeBanner } from '@/components/realtime-banner';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Qualistitch Inc.',
  icons: {
    icon: "/qs_icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Poppins:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-background h-full">
        <FirebaseClientProvider>
          <RealtimeConfetti />
          <RealtimeBanner />
          <AppShell>
            <div className="flex-1 flex flex-col">
              {children}
            </div>
          </AppShell>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
