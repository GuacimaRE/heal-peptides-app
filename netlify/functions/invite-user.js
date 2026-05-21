// invite-user.js — Send Netlify Identity invite to a new customer
// Security: caller_email must be in ADMIN_EMAILS
// Requires env vars: NETLIFY_TOKEN (PAT), NETLIFY_SITE_ID

const ADMIN_EMAILS = ['henry@wercr.net', 'henry@urbancr.net'];
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || 'f9ec04d0-5dc3-4f82-87dc-e1f4ddab7e4c';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  // ── 1. Verify caller is admin ──────────────────────────────────────────────
  try {
    const auth = event.headers.authorization || event.headers.Authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing auth token' }) };

    // Decode JWT payload (no signature verification — Netlify Identity already validated it)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const callerEmail = payload.email || '';

    if (!ADMIN_EMAILS.includes(callerEmail)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden — not an admin account' }) };
    }
  } catch (e) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
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

  // ── 3. Send invite via Netlify Identity API ────────────────────────────────
  const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN;
  if (!NETLIFY_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'NETLIFY_TOKEN env var not configured' }) };
  }

  const inviteRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/identity/users/invite`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invites: [{ email: inviteEmail, data: { full_name: inviteName || inviteEmail.split('@')[0] } }]
      })
    }
  );

  const result = await inviteRes.json().catch(() => ({}));

  if (!inviteRes.ok) {
    console.error('Netlify invite error:', result);
    const msg = result?.message || result?.error || JSON.stringify(result);
    return { statusCode: 500, headers, body: JSON.stringify({ error: msg }) };
  }

  console.log('Invite sent to:', inviteEmail);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, email: inviteEmail })
  };
};
