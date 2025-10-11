import type { Metadata } from "next";
import { Poppins, Roboto } from "next/font/google";
import "./globals.css";
import PageTransition from "@/components/other/PageTransition";

// Fonts
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Metadata
export const metadata: Metadata = {
  title: "QueryNest – AI Knowledge Hub",
  description: "Instantly search, understand, and connect all your knowledge, powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${roboto.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <div className="flex min-h-screen flex-col">

          {/* Main Content */}
          <main className="flex-1 w-full">
            <PageTransition>{children}</PageTransition>
          </main>

        </div>
      </body>
    </html>
  );
}
