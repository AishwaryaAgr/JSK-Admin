import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import layoutStyles from "./layout.module.css";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club Member Directory",
  description: "A premium directory to manage and discover club members seamlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable}`}>
      <body>
        <div className={layoutStyles.layout}>
          <Sidebar />
          <main className={layoutStyles.mainContent}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
