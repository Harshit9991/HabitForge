import { createClient } from "@supabase/supabase-js";
import { createSupabaseAuthClient } from "./auth";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
export const authClient = supabase ? createSupabaseAuthClient(supabase) : null;
