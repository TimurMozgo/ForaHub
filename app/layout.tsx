import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TinellGame — много миров, один хаб",
  description: "Твоя игровая вселенная. Находи любимые игры, открывай новые миры и создавай свой стиль.",
  icons: {
    icon: "/tinellgame-mark.png",
    shortcut: "/tinellgame-mark.png",
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
