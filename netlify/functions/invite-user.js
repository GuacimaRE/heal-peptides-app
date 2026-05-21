// invite-user.js — Send invite email to a new customer via Resend
// Registration is Open in Netlify Identity — Resend sends a branded invite email
// Security: caller_email must be in ADMIN_EMAILS (verified via JWT)

const ADMIN_EMAILS = ['henry@wercr.net', 'henry@urbancr.net'];
const APP_URL = process.env.URL || 'https://app.healpeptides.net';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  // ── 1. Verify caller is admin ──────────────────────────────────────────────
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const callerToken = auth.replace(/^Bearer\s+/i, '').trim();

  if (!callerToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing auth token' }) };
  }

  let callerEmail = '';
  try {
    const payload = JSON.parse(Buffer.from(callerToken.split('.')[1], 'base64url').toString());
    callerEmail = payload.email || '';
  } catch (e) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  if (!ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden — not an admin account' }) };
  }

  // ── 2. Parse invite email ──────────────────────────────────────────────────
  let inviteEmail, inviteName;
  try {
    const body = JSON.parse(event.body || '{}');
    inviteEmail = (body.email || '').trim().toLowerCase();
    inviteName  = (body.name  || '').trim();
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email address' }) };
  }

  // ── 3. Send invite email via Resend ───────────────────────────────────────
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'RESEND_API_KEY not configured' }) };
  }

  const displayName = inviteName || inviteEmail.split('@')[0];
  const registerUrl = `${APP_URL}`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Inter, -apple-system, sans-serif; background: #0a0a14; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #0f0f1a; border-radius: 16px; padding: 32px; border: 1px solid rgba(255,255,255,0.08);">
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -1px;">HEAL<span style="color: #1a6fc4;">.</span></div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.4); letter-spacing: 2px; margin-top: 4px;">PEPTIDES</div>
    </div>
    <h1 style="color: #fff; font-size: 20px; font-weight: 700; margin: 0 0 12px;">Hola ${displayName} 👋</h1>
    <p style="color: rgba(255,255,255,0.65); font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
      Fuiste invitado/a a acceder a <strong style="color: #fff;">HEAL Peptides</strong>, tu plataforma personal de seguimiento de protocolos de péptidos.
    </p>
    <p style="color: rgba(255,255,255,0.65); font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
      Hacé clic abajo para crear tu cuenta y empezar:
    </p>
    <div style="text-align: center; margin-bottom: 28px;">
      <a href="${registerUrl}" style="display: inline-block; background: #1a6fc4; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px;">
        Crear mi cuenta →
      </a>
    </div>
    <p style="color: rgba(255,255,255,0.35); font-size: 12px; text-align: center; margin: 0;">
      Si no esperabas esta invitación, podés ignorar este email.
    </p>
  </div>
</body>
</html>`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'HEAL Peptides <noreply@healpeptides.net>',
      to: [inviteEmail],
      subject: `Fuiste invitado/a a HEAL Peptides 💊`,
      html: emailHtml
    })
  });

  const result = await resendRes.json().catch(() => ({}));

  if (!resendRes.ok) {
    console.error('Resend error:', resendRes.status, result);
    const msg = result?.message || result?.error || JSON.stringify(result);
    return { statusCode: 500, headers, body: JSON.stringify({ error: msg }) };
  }

  console.log('Invite email sent to:', inviteEmail, '| Resend ID:', result.id);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, email: inviteEmail })
  };
};
