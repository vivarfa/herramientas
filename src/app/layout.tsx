import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Toaster } from "@/components/ui/toaster"
import { BiaChatWidget } from '@/components/BiaChatWidget';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: 'BILUZ Web Tools',
  description: 'Suite de herramientas contables y fiscales para profesionales y estudiantes en Perú.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          ptSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <BiaChatWidget />
          <Toaster />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function hideDevPanels() {
                  const selectors = [
                    '[data-nextjs-toast-errors-parent]',
                    '[data-nextjs-dialog-overlay]',
                    '[data-turbopack-panel]',
                    '.__next-dev-overlay',
                    '.__next-dev-overlay-backdrop',
                    'div[style*="position: fixed"][style*="bottom"][style*="left"]',
                    'div[style*="position: fixed"][style*="z-index: 9999"]',
                    'div[style*="position: fixed"][style*="z-index: 99999"]'
                  ];
                  
                  selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                      el.style.display = 'none';
                      el.style.visibility = 'hidden';
                      el.style.opacity = '0';
                      el.style.pointerEvents = 'none';
                    });
                  });
                  
                  // Also check for elements containing specific text
                  const allDivs = document.querySelectorAll('div[style*="position: fixed"]');
                  allDivs.forEach(div => {
                    const text = div.textContent || '';
                    if (text.includes('Route') || text.includes('Turbopack') || text.includes('Preferences')) {
                      div.style.display = 'none';
                    }
                  });
                }
                
                // Run immediately
                hideDevPanels();
                
                // Run on DOM changes
                const observer = new MutationObserver(hideDevPanels);
                observer.observe(document.body, { childList: true, subtree: true });
                
                // Run periodically as backup
                setInterval(hideDevPanels, 1000);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
