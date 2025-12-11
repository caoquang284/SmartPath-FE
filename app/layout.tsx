import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://smartpath.id.vn'),
  title: {
    default: 'SmartPath - Nền tảng học tập thông minh cho sinh viên',
    template: '%s | SmartPath'
  },
  description: 'SmartPath - Diễn đàn học thuật hiện đại cho sinh viên đại học. Thảo luận, học hỏi, chia sẻ kiến thức và kết nối với bạn bè cùng khóa.',
  keywords: ['SmartPath', 'học tập sinh viên', 'diễn đàn học thuật', 'chia sẻ kiến thức', 'cộng đồng sinh viên', 'học online', 'forum sinh viên'],
  authors: [{ name: 'SmartPath Team' }],
  creator: 'SmartPath',
  publisher: 'SmartPath',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://smartpath.id.vn',
    title: 'SmartPath - Nền tảng học tập thông minh cho sinh viên',
    description: 'Diễn đàn học thuật hiện đại cho sinh viên đại học. Thảo luận, học hỏi và chia sẻ kiến thức.',
    siteName: 'SmartPath',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'SmartPath - Nền tảng học tập thông minh'
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartPath - Nền tảng học tập thông minh cho sinh viên',
    description: 'Diễn đàn học thuật hiện đại cho sinh viên đại học',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
