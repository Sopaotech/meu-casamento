import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meu Casamento | Seu site de casamento",
  description: "Crie um espaço para contar a história e compartilhar os detalhes do seu casamento.",
  openGraph: {
    title: "Meu Casamento | Seu site de casamento",
    description: "Crie um espaço para contar a história e compartilhar os detalhes do seu casamento.",
    siteName: "Meu Casamento",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
