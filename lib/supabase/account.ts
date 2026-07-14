import { supabase } from './client';

// See supabase/migrations/0013_delete_account.sql -- cascades through every
// table the user owns, then the client must sign out locally (the JWT stays
// valid until it expires even though the underlying user row is gone).
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
}
