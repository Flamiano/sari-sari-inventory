// app/api/admin/delete-owner/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });

        // Delete profile row first (respects FK constraints)
        await supabaseAdmin.from("profiles").delete().eq("id", id);

        // Delete from Supabase Auth (cascade-removes sessions, tokens, etc.)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}