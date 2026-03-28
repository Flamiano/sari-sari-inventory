// app/api/admin/update-owner/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { id, password } = await req.json();
    if (!id || !password) {
      return NextResponse.json(
        { error: "Missing id or password." },
        { status: 400 }
      );
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
