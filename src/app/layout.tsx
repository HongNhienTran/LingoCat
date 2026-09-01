import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'LingoCat 🐾 — Learn English, build your world',
  description: 'LingoCat: Fast-paced interactive vocabulary mini-games with Spaced Repetition and native pronunciation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="bg-[#F3F4F6] text-[#121316] min-h-screen antialiased selection:bg-[#FF4820] selection:text-white">
        {children}
      </body>
    </html>
  );
}
