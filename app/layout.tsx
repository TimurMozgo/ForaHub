import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForaHub — много миров, один хаб",
  description: "Твоя игровая вселенная. Находи любимые игры, открывай новые миры и создавай свой стиль.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
