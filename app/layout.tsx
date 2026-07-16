import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampCrawler",
  description:
    "Find your next campsite — search by dates, camping style, rig size, hookups, amenities, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
