import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Trojan Spaces — Make every room count",
  description:
    "Find your space. Bring your people. A smarter way to study at USC.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Trojan Spaces",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  themeColor: "#173f35",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
