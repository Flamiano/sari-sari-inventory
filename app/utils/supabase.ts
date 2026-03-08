import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This client will automatically look for the cookies set by your callback route
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
