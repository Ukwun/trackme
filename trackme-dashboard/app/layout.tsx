import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "../src/components/AppShell";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackMe | Real-Time Operations Dashboard",
  description: "TrackMe provides real-time device tracking, incident response, analytics, and operational intelligence for live teams.",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#06b6d4",
              colorBackground: "#07111f",
              borderRadius: "0.9rem",
            },
            options: {
              socialButtonsVariant: "blockButton",
              socialButtonsPlacement: "top",
            },
          }}
        >
          <AppShell>{children}</AppShell>
        </ClerkProvider>
      </body>
    </html>
  );
}
