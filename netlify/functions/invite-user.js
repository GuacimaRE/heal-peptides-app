// invite-user.js — Send Netlify Identity invite to a new customer
// Uses GoTrue admin API at /.netlify/identity/admin/invite
// The caller's JWT is forwarded — the caller must have is_admin:true in Netlify Identity
// ADMIN_EMAILS is a secondary gate (email allowlist)

const ADMIN_EMAILS = ['henry@wercr.net', 'henry@urbancr.net'];
const SITE_URL = process.env.URL || 'https://app.healpeptides.net';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  // ── 1. Verify caller is admin (email allowlist) ───────────────────────────
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

  // ── 3. Send invite via GoTrue admin endpoint ──────────────────────────────
  // Requires the caller to have is_admin:true in Netlify Identity
  const goTrueUrl = `${SITE_URL}/.netlify/identity/admin/invite`;

  const inviteRes = await fetch(goTrueUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${callerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: inviteEmail,
      data: { full_name: inviteName || inviteEmail.split('@')[0] }
    })
  });

  const result = await inviteRes.json().catch(() => ({}));

  if (!inviteRes.ok) {
    console.error('GoTrue invite error:', inviteRes.status, result);
    // Mensaje amigable si el usuario no tiene is_admin
    if (inviteRes.status === 403 || result?.msg?.includes('admin')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Tu cuenta no tiene permisos de admin en Netlify Identity. Contactá a soporte.' })
      };
    }
    const msg = result?.msg || result?.message || result?.error || JSON.stringify(result);
    return { statusCode: 500, headers, body: JSON.stringify({ error: msg }) };
  }

  console.log('Invite sent to:', inviteEmail);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, email: inviteEmail })
  };
};
