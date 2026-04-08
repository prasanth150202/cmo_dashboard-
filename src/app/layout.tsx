import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import TopNav from "@/components/TopNav";

const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CMO Dashboard | Script Bot v5.0",
  description: "Real-time Ad Operations & Autonomous Scaling Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="flex relative">
            <Sidebar />
            <div className="flex flex-col flex-1 pl-64 min-h-screen">
              <TopNav />
              <main className="flex-1 p-8">
                <div className="max-w-[1400px] mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
