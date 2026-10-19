"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin, consumeAuthAttempt, normalizeEmail, validPassword } from "@/lib/security";

// A valid fixed bcrypt hash keeps the missing-account path computationally similar.
const DUMMY_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxDA3sHBeTwSu31j/nbxWJg.m2O";

export async function login(formData: FormData) {
  await assertSameOrigin();
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");
  if (!email || !validPassword(password)) redirect("/entrar?erro=credenciais");
  if (!(await consumeAuthAttempt("login", email))) redirect("/entrar?erro=limite");

  const user = await prisma.user.findUnique({ where: { email } });
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !matches) redirect("/entrar?erro=credenciais");

  // Rotate an existing session rather than reusing an attacker-supplied token.
  await destroySession();
  await createSession(user.id);
  redirect("/painel");
}
