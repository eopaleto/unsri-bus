import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const client = await supabaseServer();
  const code = request.nextUrl.searchParams.get("code");
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next") === "/reset-password" || type === "recovery" ? "/reset-password" : "/dashboard";
  const result = code ? await client.auth.exchangeCodeForSession(code) :
    token && ["signup","recovery","email"].includes(type || "") ? await client.auth.verifyOtp({ token_hash: token, type: type as EmailOtpType }) : null;
  return NextResponse.redirect(new URL(result && !result.error ? next : "/login?error=verification", request.url));
}
