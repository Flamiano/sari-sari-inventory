// app/api/admin/users/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role key — server only
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    // Paginate through all auth users to get metadata
    const allUsers: {
      id: string;
      created_at: string;
      last_sign_in_at: string | null;
    }[] = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;
      allUsers.push(
        ...data.users.map((u) => ({
          id: u.id,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        }))
      );
      if (data.users.length < perPage) break;
      page++;
    }

    return NextResponse.json(allUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
