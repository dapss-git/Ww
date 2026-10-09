import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Werewolf Online', template: '%s | Werewolf Online' },
  description: 'Game Werewolf multiplayer realtime. Buat room, ajak teman, dan temukan serigala sebelum fajar.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#08090D',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh bg-night text-ink">{children}</body>
    </html>
  );
}
