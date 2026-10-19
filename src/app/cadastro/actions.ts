"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin, consumeAuthAttempt, normalizeEmail, validPassword } from "@/lib/security";

export async function signup(formData: FormData) {
  await assertSameOrigin();
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!email || !validPassword(password) || name.length < 2 || name.length > 100) redirect("/cadastro?erro=dados");
  if (!(await consumeAuthAttempt("signup", email))) redirect("/cadastro?erro=limite");

  const passwordHash = await bcrypt.hash(password, 12);
  let userId: string | null = null;
  try {
    const user = await prisma.user.create({ data: { email, name, passwordHash }, select: { id: true } });
    userId = user.id;
  } catch {
    // Do not expose database details. The result can still reveal a duplicate
    // registration; production needs a verified-email enrollment flow.
  }
  if (!userId) redirect("/cadastro?erro=indisponivel");
  await destroySession();
  await createSession(userId);
  redirect("/painel");
}
