import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";

export async function POST() {
  await assertSameOrigin();
  await destroySession();
  return NextResponse.redirect(new URL("/entrar", process.env.APP_URL ?? "http://127.0.0.1:3000"), 303);
}
