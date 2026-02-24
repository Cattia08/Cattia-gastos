// @ts-nocheck
// Supabase Edge Function: daily-digest
// Two modes:
//   1. pg_cron nightly → sends digest to ALL users with daily_digest_enabled
//   2. Manual test (body: { force_user_id }) → sends digest to ONE user immediately
//
// Deploy with:
//   supabase functions deploy daily-digest --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function fmt(n) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Convert Date → YYYY-MM-DD string for Supabase date column queries */
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

/** Start-of-day timestamp for inclusive lower bound queries */
function toStartOfDay(d) {
  return toDateStr(d) + 'T00:00:00';
}

/** End-of-day timestamp for inclusive upper bound queries */
function toEndOfDay(d) {
  return toDateStr(d) + 'T23:59:59';
}

function generateDigestHTML({ userName, todayTotal, todayCount, transactions, weekTotal, weekCount, topCategory }) {
  const txRows = transactions.slice(0, 8).map(t => {
    const catColor = t.categories?.color || '#9ca3af';
    const catName = t.categories?.name || '';
    return `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid #f1f5f9">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:10px;height:10px;border-radius:50%;background:${catColor}" width="10"></td>
          <td style="padding-left:10px">
            <div style="font-weight:600;color:#1e1b4b;font-size:13px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${t.name}</div>
            ${catName ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${catName}</div>` : ''}
          </td>
        </tr></table>
      </td>
      <td style="padding:12px 20px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e1b4b;font-size:14px;white-space:nowrap;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" align="right">${fmt(t.amount)}</td>
    </tr>`;
  }).join('');

  const greeting = todayCount === 0
    ? '¡Día sin gastos! 🎉 Tu billetera te lo agradece.'
    : `Hoy tuviste ${todayCount} compra${todayCount > 1 ? 's' : ''}.`;

  const headerGradient = todayCount === 0
    ? 'linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%)'
    : 'linear-gradient(135deg,#312e81 0%,#4f46e5 35%,#7c3aed 70%,#a78bfa 100%)';

  const headerEmoji = todayCount === 0 ? '🌟' : '🌙';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  td { font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
</style></head>
<body style="margin:0;padding:0;background:#f8f7ff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f7ff">
<tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

  <!-- ═══ HEADER ═══ -->
  <tr><td style="padding:0 0 20px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${headerGradient};border-radius:20px;overflow:hidden">
      <tr><td style="padding:40px 36px;text-align:center" align="center">
        <div style="font-size:40px;line-height:1;margin-bottom:10px">${headerEmoji}</div>
        <h1 style="color:#fff;margin:0 0 8px;font-size:26px;font-weight:800;letter-spacing:-0.5px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.2">Resumen del Día</h1>
        <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${greeting}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- ═══ TODAY'S TOTAL — HERO CARD ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
      <tr><td style="height:3px;background:linear-gradient(90deg,#4f46e5,#7c3aed,#a78bfa)" height="3"></td></tr>
      <tr><td style="padding:28px 24px;text-align:center" align="center">
        <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#7c3aed;margin-bottom:8px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Hoy gastaste</div>
        <div style="font-size:38px;font-weight:800;color:#1e1b4b;line-height:1.1;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${fmt(todayTotal)}</div>
        <div style="margin-top:8px;font-size:13px;color:#94a3b8;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">en ${todayCount} transacción${todayCount !== 1 ? 'es' : ''}</div>
      </td></tr>
    </table>
  </td></tr>

  <!-- ═══ WEEK CONTEXT ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="${topCategory ? '50%' : '100%'}" style="padding:0 ${topCategory ? '4px' : '0'} 0 0" valign="top">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:14px;border:1px solid #ede9fe;overflow:hidden">
          <tr><td style="padding:18px 16px;text-align:center" align="center">
            <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;color:#7c3aed;margin-bottom:4px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Esta semana</div>
            <div style="font-size:20px;font-weight:800;color:#1e1b4b;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${fmt(weekTotal)}</div>
            <div style="margin-top:4px;font-size:11px;color:#94a3b8;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${weekCount} compras</div>
          </td></tr>
        </table>
      </td>
      ${topCategory ? `
      <td width="50%" style="padding:0 0 0 4px" valign="top">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:14px;border:1px solid #ede9fe;overflow:hidden">
          <tr><td style="padding:18px 16px;text-align:center" align="center">
            <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;color:#7c3aed;margin-bottom:4px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Top categoría hoy</div>
            <div style="font-size:20px;font-weight:800;color:#1e1b4b;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${topCategory.name}</div>
            <div style="margin-top:4px;font-size:11px;color:#94a3b8;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${fmt(topCategory.total)}</div>
          </td></tr>
        </table>
      </td>` : ''}
    </tr></table>
  </td></tr>

  ${txRows ? `
  <!-- ═══ TRANSACTION DETAIL ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
      <tr><td style="padding:22px 20px 14px">
        <h2 style="margin:0;font-size:17px;color:#1e1b4b;font-weight:700;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">🧾 Detalle</h2>
      </td></tr>
      <tr><td style="padding:0">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tbody>${txRows}</tbody>
        </table>
      </td></tr>
    </table>
  </td></tr>` : ''}

  <!-- ═══ CTA BUTTON ═══ -->
  <tr><td style="text-align:center;padding:0 0 16px" align="center">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
      <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:14px">
        <a href="https://cattia-gastos.vercel.app/" style="display:inline-block;color:#fff;text-decoration:none;padding:14px 40px;font-weight:700;font-size:15px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📱 Ver Dashboard</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- ═══ FOOTER ═══ -->
  <tr><td style="text-align:center;padding:20px 20px 0;border-top:1px solid #ede9fe" align="center">
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#7c3aed;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">💜 Cattia Gastos</p>
    <p style="margin:0;color:#a78bfa;font-size:11px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Resumen diario · Desactívalo desde Admin → Preferencias</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

async function buildDigestForUser(supabase, user, recipientEmail) {
  const now = new Date();

  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - 7);

  // Fetch today's transactions — no user_id filter (column doesn't exist)
  const { data: todayTx } = await supabase
    .from('transactions')
    .select('*, categories(id, name, color)')
    .gte('date', toStartOfDay(now))
    .lte('date', toEndOfDay(now))
    .order('date', { ascending: false });

  // Fetch week's transactions
  const { data: weekTx } = await supabase
    .from('transactions')
    .select('amount')
    .gte('date', toStartOfDay(weekStart))
    .lte('date', toEndOfDay(now));

  const txs = todayTx || [];
  const todayTotal = txs.reduce((s, t) => s + t.amount, 0);
  const todayCount = txs.length;
  const weekTotal = (weekTx || []).reduce((s, t) => s + t.amount, 0);
  const weekCount = (weekTx || []).length;

  // Top category for today
  const catMap = new Map();
  for (const t of txs) {
    const catName = t.categories?.name || 'Sin categoría';
    const existing = catMap.get(catName) || { name: catName, total: 0 };
    existing.total += t.amount;
    catMap.set(catName, existing);
  }
  const topCategory = catMap.size > 0
    ? [...catMap.values()].sort((a, b) => b.total - a.total)[0]
    : null;

  const email = recipientEmail || user.email;
  const userName = 'Catt';

  const html = generateDigestHTML({
    userName, todayTotal, todayCount,
    transactions: txs,
    weekTotal, weekCount, topCategory,
  });

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Cattia Gastos <onboarding@resend.dev>',
      to: [email],
      subject: todayCount > 0
        ? `🌙 Hoy gastaste ${fmt(todayTotal)} en ${todayCount} compra${todayCount > 1 ? 's' : ''}`
        : '🌙 ¡Día sin gastos! 🎉',
      html,
    }),
  });

  return { user: email, todayTotal, todayCount, sent: resendRes.ok };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if this is a manual test
    let forceUserId = null;
    try {
      const body = await req.json();
      forceUserId = body?.force_user_id || null;
    } catch {
      // No body — cron mode
    }

    const recipientEmail = Deno.env.get('RECIPIENT_EMAIL');

    // ─── MODE 1: Manual test for a single user ───
    if (forceUserId) {
      const { data: { user } } = await supabase.auth.admin.getUserById(forceUserId);
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await buildDigestForUser(supabase, user, recipientEmail || user.email);

      return new Response(JSON.stringify({
        success: result.sent,
        message: `Resumen enviado a ${result.user}`,
        todayTotal: result.todayTotal,
        todayCount: result.todayCount,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── MODE 2: Cron — process all qualifying users ───
    const { data: allSettings } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('daily_digest_enabled', true);

    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with daily digest enabled', sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    for (const setting of allSettings) {
      const { data: { user } } = await supabase.auth.admin.getUserById(setting.user_id);
      if (!user) continue;

      const result = await buildDigestForUser(supabase, user, recipientEmail || user.email);
      results.push(result);
    }

    return new Response(JSON.stringify({
      message: `Processed ${allSettings.length} users`,
      sent: results.filter(r => r.sent).length,
      results,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
