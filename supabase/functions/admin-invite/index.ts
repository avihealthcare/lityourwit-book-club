import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const origins = ['https://lityourwit-book-club.netlify.app', 'http://localhost:5173', 'http://127.0.0.1:5173'];
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0], 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST' });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const authorization = req.headers.get('authorization') || '';
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: identity, error: authError } = await caller.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    if (authError || !identity.user) return reply(401, { error: 'Please sign in again' });
    const { data: allowed, error: roleError } = await caller.rpc('is_admin');
    if (roleError || !allowed) return reply(403, { error: 'Administrator access required' });
    const { email, display_name } = await req.json();
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof display_name !== 'string' || !display_name.trim() || display_name.length > 80) return reply(400, { error: 'Enter a valid email and display name' });
    const backend = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { error } = await backend.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), { data: { display_name: display_name.trim() }, redirectTo: 'https://lityourwit-book-club.netlify.app/auth' });
    if (error) return reply(400, { error: error.message });
    await caller.rpc('admin_manage', { p_action: 'member_invite', p_data: { email: email.trim().toLowerCase() } });
    return reply(200, { message: 'Invitation sent. The member can use their email link to choose a password.' });
  } catch {
    return reply(400, { error: 'Could not send the invitation. Please try again.' });
  }
});
