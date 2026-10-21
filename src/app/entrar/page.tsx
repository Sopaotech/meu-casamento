import Link from "next/link";
import { login } from "./actions";
import { homologationDeclared } from "@/lib/homologation";

export const dynamic = "force-dynamic";

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="narrow" style={{ paddingBlock: "3rem" }}>
      <div className="card stack">
        <Link href="/" className="brand">Meu Casamento</Link>
        <h1>Entrar</h1>
        <p>Acesse o painel do seu casamento.</p>
        {erro && <p role="alert" className="error">{erro === "limite" ? "Muitas tentativas. Aguarde 15 minutos e tente novamente." : "Não foi possível entrar. Confira seus dados e tente novamente."}</p>}
        <form action={login} className="form-grid">
          <div className="field"><label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
          <div className="field"><label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required /></div>
          <button type="submit" className="button">Entrar</button>
        </form>
        {!homologationDeclared() && <p>Ainda não tem conta? <Link href="/cadastro">Criar conta</Link></p>}
      </div>
    </main>
  );
}
