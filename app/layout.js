import './globals.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata = {
  title: 'Japan Side Quest',
  description: 'Daniels Japan-Quests',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800;900&family=Reggae+One&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('japan-quest-theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
