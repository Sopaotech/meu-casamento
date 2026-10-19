import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noivara | Seu site de casamento",
  description: "Crie um espaço para contar a história e compartilhar os detalhes do seu casamento.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
