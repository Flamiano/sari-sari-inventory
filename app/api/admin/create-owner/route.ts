// ─────────────────────────────────────────────────────────────
// app/api/admin/create-owner/route.ts
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { email, password, full_name, store_name, address } =
      await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Create auth user — email_confirm: true skips verification
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // ← bypasses email verification
        user_metadata: { full_name, store_name },
      });

    if (authError) throw authError;
    const userId = authData.user.id;

    // Upsert into profiles (trigger may handle this, but we do it explicitly for reliability)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email,
        full_name: full_name || null,
        store_name: store_name || null,
        address: address || null,
        role: "owner",
      });

    if (profileError) {
      // Rollback: delete auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    return NextResponse.json({ id: userId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// app/api/admin/update-owner/route.ts
// ─────────────────────────────────────────────────────────────
// (create this as a separate file: app/api/admin/update-owner/route.ts)

// export async function POST(req: Request) {
//     const supabaseAdmin = createClient(
//         process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         process.env.SUPABASE_SERVICE_ROLE_KEY!,
//         { auth: { autoRefreshToken: false, persistSession: false } }
//     );
//     try {
//         const { id, password } = await req.json();
//         const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
//         if (error) throw error;
//         return NextResponse.json({ ok: true });
//     } catch (error: any) {
//         return NextResponse.json({ error: error.message }, { status: 500 });
//     }
// }

// ─────────────────────────────────────────────────────────────
// app/api/admin/delete-owner/route.ts
// ─────────────────────────────────────────────────────────────
// (create this as a separate file: app/api/admin/delete-owner/route.ts)

// export async function POST(req: Request) {
//     const supabaseAdmin = createClient(
//         process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         process.env.SUPABASE_SERVICE_ROLE_KEY!,
//         { auth: { autoRefreshToken: false, persistSession: false } }
//     );
//     try {
//         const { id } = await req.json();
//         // Delete profile first (FK constraint)
//         await supabaseAdmin.from("profiles").delete().eq("id", id);
//         // Then delete from auth
//         const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
//         if (error) throw error;
//         return NextResponse.json({ ok: true });
//     } catch (error: any) {
//         return NextResponse.json({ error: error.message }, { status: 500 });
//     }
// }
