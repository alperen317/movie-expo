import { createClient } from 'npm:@supabase/supabase-js@2';

const brevoApiKey = Deno.env.get('BREVO_API_KEY') ?? '';
const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? '';
const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

interface InviteRow {
  invited_by: string;
  list: { name: string } | null;
  invitee: { email: string } | null;
  inviter: { email: string; display_name: string | null } | null;
}

function jsonError(httpCode: number, message: string): Response {
  return new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
    status: httpCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildListInviteEmailContent(listName: string, inviterLabel: string) {
  return {
    subject: `Previously — ${inviterLabel} seni "${listName}" listesine davet etti`,
    html: `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:0;background:#131313;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:420px;margin:0 auto;padding:32px 16px;">
      <div style="background:#1c1c1c;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
        <p style="margin:0 0 16px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#F5C451;">Previously</p>
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#f4f4f4;">Bir listeye davet edildin</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">
          ${inviterLabel}, seni "${listName}" adlı paylaşımlı listeye davet etti. Kabul etmek için Previously'de Listeler sekmesini aç.
        </p>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
          Bu daveti sen istemediysen bu e-postayı yok sayabilirsin.
        </p>
      </div>
    </div>
  </body>
</html>`,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonError(400, 'Method not allowed');
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  let membershipId: string | undefined;
  try {
    ({ membershipId } = await req.json());
  } catch {
    return jsonError(400, 'Invalid JSON body.');
  }
  if (!membershipId) {
    return jsonError(400, 'membershipId is required.');
  }

  // Query under the CALLER's JWT (not the service role), so the same RLS
  // policies that govern the app apply here too: `list_members` SELECT
  // requires the caller to be an accepted member of that list. The
  // `invited_by = user.id` check below is the piece RLS doesn't cover on
  // its own -- it stops an authenticated member from triggering an email
  // for an invite someone ELSE on the list sent, using a guessed/leaked id.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError(401, 'Unauthorized.');
  }

  const { data, error } = await supabase
    .from('list_members')
    .select(
      'invited_by, status, list:lists(name), invitee:profiles!list_members_user_id_fkey(email), inviter:profiles!list_members_invited_by_fkey(email, display_name)',
    )
    .eq('id', membershipId)
    .eq('status', 'pending')
    .single();

  const row = data as unknown as InviteRow | null;
  if (error || !row || row.invited_by !== user.id || !row.invitee || !row.list) {
    return jsonError(404, 'Invite not found.');
  }

  const inviterLabel = row.inviter?.display_name || row.inviter?.email || 'Bir arkadaşın';
  const content = buildListInviteEmailContent(row.list.name, inviterLabel);

  const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: row.invitee.email }],
      subject: content.subject,
      htmlContent: content.html,
    }),
  });

  if (!brevoRes.ok) {
    const detail = await brevoRes.text();
    console.error('Brevo send failed', brevoRes.status, detail);
    return jsonError(500, 'Failed to send email.');
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
