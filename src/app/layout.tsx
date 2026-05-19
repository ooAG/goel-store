import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Goel Store",
  description: "Your trustable grocery khata manager",
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#059669" />
        <link rel="apple-touch-icon" href="https://png.pngtree.com/png-vector/20230407/ourmid/pngtree-trolley-line-icon-vector-png-image_6692905.png" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
