interface OtpEmailContent {
  heading: string;
  bodyText: string;
  code: string;
}

export function buildOtpEmailHtml({ heading, bodyText, code }: OtpEmailContent): string {
  return `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:0;background:#131313;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:420px;margin:0 auto;padding:32px 16px;">
      <div style="background:#1c1c1c;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
        <p style="margin:0 0 16px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#F5C451;">Previously</p>
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#f4f4f4;">${heading}</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${bodyText}</p>
        <div style="background:#131313;border-radius:8px;padding:20px;text-align:center;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#F5C451;">${code}</span>
        </div>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
          Bu kodu kimseyle paylaşma. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

export function emailContentFor(
  actionType: string,
  email: string,
  code: string,
): { subject: string; html: string } | null {
  if (actionType === 'signup') {
    return {
      subject: 'Previously — E-posta doğrulama kodun',
      html: buildOtpEmailHtml({
        heading: 'Hesabını doğrula',
        bodyText: `${email} için Previously hesabını doğrulamak üzeresin. Aşağıdaki kodu uygulamaya gir.`,
        code,
      }),
    };
  }

  if (actionType === 'recovery') {
    return {
      subject: 'Previously — Şifre sıfırlama kodun',
      html: buildOtpEmailHtml({
        heading: 'Şifreni sıfırla',
        bodyText: `${email} hesabının şifresini sıfırlamak için aşağıdaki kodu uygulamaya gir.`,
        code,
      }),
    };
  }

  return null;
}
