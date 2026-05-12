// Netlify Identity event — fires automatically on every new signup
exports.handler = async (event) => {
  try {
    const { user } = JSON.parse(event.body);
    const email = user?.email;
    const name = user?.user_metadata?.full_name || email?.split('@')[0] || 'there';

    if (!email) return { statusCode: 200, body: 'No email' };

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return { statusCode: 200, body: 'No Resend key configured' };

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080810">
<div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#080810;padding:40px 20px;max-width:480px;margin:0 auto">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px">
    <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px">
      <span style="color:#1a6fc4">HEAL</span> Peptides
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,.35);letter-spacing:2px;margin-top:4px">
      PRECISION RESEARCH
    </div>
  </div>

  <!-- Card -->
  <div style="background:#0f0f1a;border-radius:20px;padding:32px 28px;border:1px solid rgba(255,255,255,.08)">
    <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px">
      Welcome, ${name} 🧬
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,.6);line-height:1.8;margin-bottom:28px">
      Your HEAL Peptides account is now active. You have access to your personalized peptide tracker, protocol library, and AI-powered blood test analyzer.
    </div>

    <!-- CTA Button -->
    <a href="https://app.healpeptides.net" 
       style="display:block;background:#1a6fc4;color:#fff;text-decoration:none;text-align:center;padding:15px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:28px">
      Open my HEAL App →
    </a>

    <!-- Features -->
    <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:20px;margin-bottom:20px">
      <div style="font-size:11px;color:rgba(255,255,255,.3);margin-bottom:14px;letter-spacing:.8px;text-transform:uppercase">What's waiting for you</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.65)">🧪 Protocol tracker & dose calculator</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.65)">🔬 AI blood test analyzer & comparison</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.65)">📦 Full peptide catalog — 29 compounds</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,.65)">💬 Free personalized protocol consultation</td>
        </tr>
      </table>
    </div>

    <!-- Install instructions -->
    <div style="background:#0a1628;border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,.5);margin-bottom:10px;letter-spacing:.8px;text-transform:uppercase">Install as app on your phone</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:5px 0;font-size:12px;color:rgba(255,255,255,.6)">
            🐇 <strong style="color:rgba(255,255,255,.8)">iPhone:</strong> Open in Safari → tap Share → “Add to Home Screen”
          </td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:12px;color:rgba(255,255,255,.6)">
            🤖 <strong style="color:rgba(255,255,255,.8)">Android:</strong> Open in Chrome → tap menu (⋮) → “Add to Home Screen”
          </td>
        </tr>
      </table>
    </div>

    <!-- WhatsApp CTA -->
    <div style="background:#0a1628;border-radius:12px;padding:16px;text-align:center">
      <div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:8px">Questions? We’re here for you</div>
      <a href="https://wa.me/50688970649" style="color:#25D366;font-size:13px;font-weight:600;text-decoration:none">
        📱 WhatsApp us anytime
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align:center;margin-top:24px;font-size:11px;color:rgba(255,255,255,.2);line-height:2">
    HEAL Peptides · healpeptides.net · Costa Rica<br>
    Next day delivery · Research use only<br>
    <span style="color:rgba(255,255,255,.1)">You're receiving this because you created an account.</span>
  </div>

</div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'HEAL Peptides <welcome@healpeptides.net>',
        to: [email],
        subject: 'Welcome to HEAL Peptides 🧬',
        html
      })
    });

    const data = await res.json();
    console.log('Welcome email sent:', data);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('identity-signup error:', err);
    return { statusCode: 200, body: 'Error: ' + err.message }; // Always 200 so signup doesn't fail
  }
};
