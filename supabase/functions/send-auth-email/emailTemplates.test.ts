import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { buildOtpEmailHtml, emailContentFor } from './emailTemplates.ts';

Deno.test('buildOtpEmailHtml embeds the code and both custom strings', () => {
  const html = buildOtpEmailHtml({ heading: 'Başlık', bodyText: 'Gövde metni', code: '482913' });
  assert(html.includes('482913'));
  assert(html.includes('Başlık'));
  assert(html.includes('Gövde metni'));
});

Deno.test('emailContentFor returns Turkish signup copy with the code embedded', () => {
  const content = emailContentFor('signup', 'user@example.com', '111222');
  assert(content !== null);
  assertEquals(content?.subject, 'Previously — E-posta doğrulama kodun');
  assert(content?.html.includes('111222'));
  assert(content?.html.includes('user@example.com'));
});

Deno.test('emailContentFor returns Turkish recovery copy with the code embedded', () => {
  const content = emailContentFor('recovery', 'user@example.com', '333444');
  assert(content !== null);
  assertEquals(content?.subject, 'Previously — Şifre sıfırlama kodun');
  assert(content?.html.includes('333444'));
});

Deno.test('emailContentFor returns null for unsupported action types', () => {
  assertEquals(emailContentFor('magiclink', 'user@example.com', '000000'), null);
  assertEquals(emailContentFor('invite', 'user@example.com', '000000'), null);
  assertEquals(emailContentFor('email_change', 'user@example.com', '000000'), null);
});
