import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JobHunt AI | Find your next role faster",
  description: "AI-powered job hunting assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <ClerkProvider appearance={{ baseTheme: dark } as any}>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className={`${inter.className} bg-zinc-950 text-zinc-100`} suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}