// admin-action.js — B2B account management + list_users
// Actions: change_account_type | list_users
// Security: caller_email must be in ADMIN_EMAILS

const ADMIN_EMAILS = ['henry@wercr.net', 'henry@urbancr.net'];

const SUPABASE_URL = 'https://odtexqyvjxxdgysuxoxb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdGV4cXl2anh4ZGd5c3V4b3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MzMxMTcsImV4cCI6MjA1NzIwOTExN30.wbRNTCJUEYkuyHt_O8TMWRmfqxlS1s-bnl7FZ3DVyo';

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'HEAL Peptides <welcome@healpeptides.net>';

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function sbFetch(path, opts = {}) {
  const url = SUPABASE_URL + '/rest/v1/' + path;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

// ─── Email helpers ────────────────────────────────────────────────────────────

function buildDistributorEmail(name) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080810">
<div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#080810;padding:40px 20px;max-width:480px;margin:0 auto">

  <div style="text-align:center;margin-bottom:32px">
    <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px">
      <span style="color:#1a6fc4">HEAL</span> Peptides
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,.35);letter-spacing:2px;margin-top:4px">
      PRECISION RESEARCH
    </div>
  </div>

  <div style="background:#0f0f1a;border-radius:20px;padding:32px 28px;border:1px solid rgba(245,197,24,.2)">
    <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px">
      👑 ¡Hola ${name}!
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,.6);line-height:1.8;margin-bottom:24px">
      Hemos activado tu cuenta como <strong style="color:#f5c518">Distribuidor HEAL</strong>. A partir de ahora tenés acceso a precios exclusivos en todo el catálogo.
    </div>

    <div style="background:#0a1628;border-radius:14px;padding:18px;margin-bottom:20px;border:0.5px solid rgba(245,197,24,.2)">
      <div style="font-size:12px;font-weight:700;color:#f5c518;margin-bottom:12px;letter-spacing:.8px">BENEFICIOS DE DISTRIBUIDOR</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.7)">💰 25% off en todo el catálogo</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.7)">📦 Mínimo mensual: $4,000</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.7)">🚀 Precios aplicados automáticamente en la app</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.7)">📊 Dashboard de compras del mes en la app</td></tr>
      </table>
    </div>

    <a href="https://app.healpeptides.net"
       style="display:block;background:#f5c518;color:#000;text-decoration:none;text-align:center;padding:15px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:20px">
      Abrir la app → ver mis precios
    </a>

    <div style="background:#0a1628;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:6px">¿Dudas o pedidos grandes?</div>
      <a href="https://wa.me/50688970649" style="color:#25D366;font-size:13px;font-weight:600;text-decoration:none">📱 WhatsApp HEAL</a>
    </div>
  </div>

  <div style="text-align:center;margin-top:24px;font-size:11px;color:rgba(255,255,255,.2);line-height:2">
    HEAL Peptides · healpeptides.net · Costa Rica<br>
    Next day delivery · Research use only
  </div>
</div>
</body>
</html>`;
}

function buildClinicEmail(name) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080810">
<div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#080810;padding:40px 20px;max-width:480px;margin:0 auto">

  <div style="text-align:center;margin-bottom:32px">
    <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px">
      <span style="color:#1a6fc4">HEAL</span> Peptides
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,.35);letter-spacing:2px;margin-top:4px">
      PRECISION RESEARCH
    </div>
  </div>

  <div style="background:#0f0f1a;border-radius:20px;padding:32px 28px;border:1px solid rgba(79,195,247,.2)">
    <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px">
      🏥 ¡Hola ${name}!
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,.6);line-height:1.8;margin-bottom:24px">
      Hemos activado tu acceso como <strong style="color:#4fc3f7">Clínica B2B HEAL</strong>. Tenés precios especiales en todo el catálogo aplicados automáticamente.
    </div>

    <div style="background:#0a1628;border-radius:14px;padding:18px;margin-bottom:20px;border:0.5px solid rgba(79,195,247,.2)">
      <div style="font-size:12px;font-weight:700;color:#4fc3f7;margin-bottom:12px;letter-spacing:.8px">BENEFICIOS CLÍNICA B2B</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.7)">💰 20% off en todo el catálogo</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.7)">✅ Sin mínimo mensual</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.7)">🚀 Precios aplicados automáticamente en la app</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.7)">📦 Entregas al día siguiente · Costa Rica</td></tr>
      </table>
    </div>

    <a href="https://app.healpeptides.net"
       style="display:block;background:#4fc3f7;color:#000;text-decoration:none;text-align:center;padding:15px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:20px">
      Abrir la app → ver mis precios
    </a>

    <div style="background:#0a1628;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:6px">¿Pedidos o consultas?</div>
      <a href="https://wa.me/50688970649" style="color:#25D366;font-size:13px;font-weight:600;text-decoration:none">📱 WhatsApp HEAL</a>
    </div>
  </div>

  <div style="text-align:center;margin-top:24px;font-size:11px;color:rgba(255,255,255,.2);line-height:2">
    HEAL Peptides · healpeptides.net · Costa Rica<br>
    Next day delivery · Research use only
  </div>
</div>
</body>
</html>`;
}

function buildDeactivationEmail(name) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080810">
<div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#080810;padding:40px 20px;max-width:480px;margin:0 auto">

  <div style="text-align:center;margin-bottom:32px">
    <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px">
      <span style="color:#1a6fc4">HEAL</span> Peptides
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,.35);letter-spacing:2px;margin-top:4px">
      PRECISION RESEARCH
    </div>
  </div>

  <div style="background:#0f0f1a;border-radius:20px;padding:32px 28px;border:1px solid rgba(255,255,255,.08)">
    <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px">
      Hola ${name}
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,.6);line-height:1.8;margin-bottom:24px">
      Tu acceso B2B HEAL ha sido actualizado. Tu cuenta ahora tiene precios de venta al público (retail). Los precios especiales ya no estarán activos en la app.
    </div>
    <div style="background:#0a1628;border-radius:12px;padding:14px;margin-bottom:20px">
      <div style="font-size:13px;color:rgba(255,255,255,.5);line-height:1.7">
        Si creés que esto es un error o tenés preguntas sobre tu cuenta, contactanos por WhatsApp.
      </div>
    </div>
    <a href="https://wa.me/50688970649"
       style="display:block;background:#1a6fc4;color:#fff;text-decoration:none;text-align:center;padding:15px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:10px">
      Contactar HEAL por WhatsApp
    </a>
  </div>

  <div style="text-align:center;margin-top:24px;font-size:11px;color:rgba(255,255,255,.2);line-height:2">
    HEAL Peptides · healpeptides.net · Costa Rica
  </div>
</div>
</body>
</html>`;
}

async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) { console.warn('No RESEND_API_KEY — skipping email'); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  });
  const data = await res.json();
  console.log('Email sent:', data);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { action, caller_email } = body;

  // Security check
  if (!caller_email || !ADMIN_EMAILS.includes(caller_email)) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  try {
    // ── list_users ────────────────────────────────────────────────────────────
    if (action === 'list_users') {
      const rows = await sbFetch('heal_accounts?select=*&order=created_at.desc');
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, users: rows })
      };
    }

    // ── change_account_type ───────────────────────────────────────────────────
    if (action === 'change_account_type') {
      const { target_email, new_type, reason } = body;
      if (!target_email || !new_type) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing target_email or new_type' }) };
      }
      if (!['retail', 'distributor', 'clinic'].includes(new_type)) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid account type' }) };
      }

      // Get current record
      const rows = await sbFetch('heal_accounts?email=eq.' + encodeURIComponent(target_email) + '&select=*');
      if (!rows || rows.length === 0) {
        return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'User not found in heal_accounts' }) };
      }
      const current = rows[0];
      const from_type = current.account_type || 'retail';
      const name = current.full_name || target_email.split('@')[0];

      // Build update
      const updateData = {
        account_type: new_type,
        updated_at: new Date().toISOString(),
        account_activated_by: caller_email,
        account_notes: reason || current.account_notes || null
      };
      if (new_type !== 'retail' && !current.account_activated_at) {
        updateData.account_activated_at = new Date().toISOString();
      }

      await sbFetch('heal_accounts?email=eq.' + encodeURIComponent(target_email), {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(updateData)
      });

      // Log the change
      await sbFetch('account_type_changes', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          email: target_email,
          changed_by: caller_email,
          from_type,
          to_type: new_type,
          reason: reason || null
        })
      });

      // Send email
      if (new_type === 'distributor') {
        await sendEmail(target_email, '👑 Tu acceso de distribuidor HEAL está activo', buildDistributorEmail(name));
      } else if (new_type === 'clinic') {
        await sendEmail(target_email, '🏥 Tu acceso clínica B2B HEAL está activo', buildClinicEmail(name));
      } else {
        await sendEmail(target_email, 'Tu acceso B2B HEAL ha sido modificado', buildDeactivationEmail(name));
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, from: from_type, to: new_type })
      };
    }

    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    console.error('admin-action error:', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
