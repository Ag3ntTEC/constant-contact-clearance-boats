import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clearance Boat Campaign Builder",
  description: "Internal tool for building Constant Contact clearance boat campaigns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
