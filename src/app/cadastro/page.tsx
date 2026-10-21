import Link from "next/link";
import { signup } from "./actions";
import { redirect } from "next/navigation";
import { homologationDeclared } from "@/lib/homologation";

export const dynamic = "force-dynamic";

export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (homologationDeclared()) redirect("/entrar");
  const { erro } = await searchParams;
  const errorMessage = erro === "limite" ? "Muitas tentativas. Aguarde 15 minutos e tente novamente." : erro === "dados" ? "Confira seus dados. A senha deve ter entre 12 e 72 bytes." : "Não foi possível criar a conta. Confira os dados ou entre na sua conta.";
  return (
    <main className="narrow" style={{ paddingBlock: "3rem" }}>
      <div className="card stack">
        <Link href="/" className="brand">Meu Casamento</Link>
        <h1>Criar conta</h1>
        <p>Comece a organizar o site do seu casamento.</p>
        {erro && <p role="alert" className="error">{errorMessage}</p>}
        <form action={signup} className="form-grid">
          <div className="field"><label htmlFor="name">Seu nome</label>
          <input id="name" name="name" autoComplete="name" minLength={2} maxLength={100} required /></div>
          <div className="field"><label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
          <div className="field"><label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required aria-describedby="password-help" />
          <small id="password-help">Use pelo menos 12 caracteres; o limite é de 72 bytes.</small></div>
          <button type="submit" className="button">Criar conta</button>
        </form>
        <p>Já tem conta? <Link href="/entrar">Entrar</Link></p>
      </div>
    </main>
  );
}
