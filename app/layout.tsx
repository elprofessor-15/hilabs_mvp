import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HiLabs Care Workbench",
  description: "A synthetic-data case management workflow prototype for nurse review.",
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
