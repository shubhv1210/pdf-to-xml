import Header from "@/components/Header";
import NextAuthProvider from "@/components/NextAuthProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PDF to XML Converter",
  description: "Convert your PDFs to XML while preserving document structure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${inter.variable}`}>
      <body className={inter.className}>
        <NextAuthProvider>
          <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-gray-950 to-[#333333]">
            <div className="absolute inset-0 z-0 opacity-20">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-[#C0C0C0] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-[#A9A9A9] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-[#808080] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
            </div>
            <div className="relative z-10">
              <Header />
              <main className="container mx-auto py-8 px-4 min-h-[calc(100vh-5rem)] pt-24">
                {children}
              </main>
            </div>
          </div>
        </NextAuthProvider>
      </body>
    </html>
  );
}
