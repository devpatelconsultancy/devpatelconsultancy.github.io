import { createClient } from '@supabase/supabase-js';

export type StaffProfile = {
  id: string;
  full_name: string;
  role: 'admin' | 'staff';
  created_at: string;
};

export type WorkEntry = {
  id: string;
  user_id: string;
  work_date: string;
  client_name: string;
  task: string;
  hours: number;
  status: 'pending' | 'in_progress' | 'completed';
  remarks: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<StaffProfile, 'full_name'> | null;
};

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // The dashboard renders a setup message, but this keeps the missing config
  // visible during local development too.
  console.warn('Missing Supabase environment variables.');
}

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
);
