import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmiTech — Gestión de Salones de Belleza",
  description: "Plataforma SaaS para salones de belleza en Colombia. Agenda citas automáticamente por WhatsApp, gestiona tu equipo y clientes desde un panel fácil de usar.",
  keywords: ["emitech", "salón de belleza", "agenda online", "whatsapp bot", "gestión salones", "citas online", "colombia"],
  authors: [{ name: "Andrey Arévalo" }],
  creator: "Andrey Arévalo",
  metadataBase: new URL("https://emitech.app"),
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    url: "https://emitech.app",
    title: "EmiTech — Gestión de Salones de Belleza",
    description: "Agenda inteligente y atención automática por WhatsApp para salones de belleza en Colombia.",
    siteName: "EmiTech",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EmiTech — Gestión de Salones de Belleza",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EmiTech — Gestión de Salones de Belleza",
    description: "Agenda inteligente y atención automática por WhatsApp para salones de belleza.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
