import { Webhook } from 'npm:standardwebhooks@^1';

import { emailContentFor } from './emailTemplates.ts';

const hookSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').replace('v1,whsec_', '');
const brevoApiKey = Deno.env.get('BREVO_API_KEY') ?? '';
const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? '';
const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? '';

interface SendEmailHookPayload {
  user: { email: string };
  email_data: {
    token: string;
    email_action_type: string;
  };
}

function jsonError(httpCode: number, message: string): Response {
  return new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
    status: httpCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonError(400, 'Method not allowed');
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let verified: SendEmailHookPayload;
  try {
    const wh = new Webhook(hookSecret);
    verified = wh.verify(payload, headers) as SendEmailHookPayload;
  } catch (err) {
    return jsonError(401, err instanceof Error ? err.message : 'Invalid webhook signature.');
  }

  const { user, email_data: emailData } = verified;
  const content = emailContentFor(emailData.email_action_type, user.email, emailData.token);

  if (!content) {
    return jsonError(400, `Unsupported email_action_type: ${emailData.email_action_type}`);
  }

  const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: user.email }],
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
