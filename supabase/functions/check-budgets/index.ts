// @ts-nocheck
// Supabase Edge Function: check-budgets
// Two modes:
//   1. pg_cron daily → checks ALL users with budget_alerts_enabled
//   2. Manual test (body: { force_user_id }) → checks ONE user immediately
//
// Deploy with:
//   supabase functions deploy check-budgets --no-verify-jwt

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

function generateBudgetAlertHTML({ userName, alerts }) {
  const exceededCount = alerts.filter(a => (a.spent / a.limit) >= 1).length;
  const warningCount = alerts.length - exceededCount;

  const alertRows = alerts.map(a => {
    const pct = Math.round((a.spent / a.limit) * 100);
    const isExceeded = pct >= 100;
    const barColor = isExceeded ? '#ef4444' : '#f59e0b';
    const barBg = isExceeded ? '#fef2f2' : '#fffbeb';
    const borderColor = isExceeded ? '#fecaca' : '#fde68a';
    const statusLabel = isExceeded ? '⛔ Excedido' : '⚠️ Atención';
    const statusColor = isExceeded ? '#dc2626' : '#d97706';
    const remaining = Math.max(0, a.limit - a.spent);
    const overBy = a.spent > a.limit ? a.spent - a.limit : 0;

    return `
    <tr><td style="padding:6px 0">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${barBg};border-radius:14px;border:1px solid ${borderColor};overflow:hidden">
        <tr><td style="padding:16px 20px">
          <!-- Category + status row -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td>
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width:12px;height:12px;border-radius:4px;background:${a.color}" width="12"></td>
                <td style="padding-left:10px;font-weight:700;color:#1e1b4b;font-size:14px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${a.category}</td>
              </tr></table>
            </td>
            <td align="right" style="text-align:right">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="background:${isExceeded ? '#fef2f2' : '#fffbeb'};border:1px solid ${isExceeded ? '#fca5a5' : '#fcd34d'};border-radius:20px;padding:3px 10px">
                  <span style="font-size:11px;font-weight:700;color:${statusColor};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${statusLabel} · ${pct}%</span>
                </td>
              </tr></table>
            </td>
          </tr></table>
          <!-- Progress bar -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 10px"><tr>
            <td style="background:#e5e7eb;border-radius:20px;height:8px;overflow:hidden" height="8">
              <div style="background:${barColor};height:8px;width:${Math.min(pct, 100)}%;border-radius:20px"></div>
            </td>
          </tr></table>
          <!-- Spent / Limit row -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-size:12px;color:#64748b;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
              Gastado: <strong style="color:#1e1b4b">${fmt(a.spent)}</strong>
            </td>
            <td style="font-size:12px;color:#64748b;text-align:right;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" align="right">
              Límite: <strong style="color:#1e1b4b">${fmt(a.limit)}</strong>
            </td>
          </tr></table>
          ${isExceeded ? `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px"><tr>
            <td style="background:#fef2f2;border-radius:8px;padding:6px 12px;text-align:center" align="center">
              <span style="font-size:11px;color:#dc2626;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Excediste ${fmt(overBy)} sobre tu límite</span>
            </td>
          </tr></table>` : `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px"><tr>
            <td style="background:#fffbeb;border-radius:8px;padding:6px 12px;text-align:center" align="center">
              <span style="font-size:11px;color:#d97706;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Queda ${fmt(remaining)} de margen</span>
            </td>
          </tr></table>`}
        </td></tr>
      </table>
    </td></tr>`;
  }).join('');

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
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#dc2626 0%,#ef4444 30%,#f59e0b 100%);border-radius:20px;overflow:hidden">
      <tr><td style="padding:40px 36px;text-align:center" align="center">
        <div style="font-size:42px;line-height:1;margin-bottom:10px">⚡</div>
        <h1 style="color:#fff;margin:0 0 8px;font-size:26px;font-weight:800;letter-spacing:-0.5px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.2">Alerta de Presupuesto</h1>
        <p style="color:rgba(255,255,255,0.9);margin:0 0 16px;font-size:14px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${userName}, tienes categorías cerca del límite</p>
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
          ${exceededCount > 0 ? `<td style="padding:0 4px"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(255,255,255,0.22);border-radius:24px;padding:5px 14px"><span style="color:#fff;font-size:12px;font-weight:700;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">🔴 ${exceededCount} excedido${exceededCount > 1 ? 's' : ''}</span></td></tr></table></td>` : ''}
          ${warningCount > 0 ? `<td style="padding:0 4px"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(255,255,255,0.22);border-radius:24px;padding:5px 14px"><span style="color:#fff;font-size:12px;font-weight:700;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">🟡 ${warningCount} en alerta</span></td></tr></table></td>` : ''}
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- ═══ DETAIL SECTION ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
      <tr><td style="padding:22px 20px 14px">
        <h2 style="margin:0;font-size:17px;color:#1e1b4b;font-weight:700;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📊 Detalle por Categoría</h2>
      </td></tr>
      <tr><td style="padding:0 16px 16px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tbody>${alertRows}</tbody>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- ═══ TIP ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-radius:16px;border:1px solid #ddd6fe;overflow:hidden">
      <tr>
        <td width="52" style="padding:18px 0 18px 20px;vertical-align:top" valign="top">
          <div style="font-size:26px;line-height:1">💡</div>
        </td>
        <td style="padding:18px 20px 18px 12px;vertical-align:top" valign="top">
          <div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Consejo</div>
          <div style="font-size:13px;color:#4c1d95;line-height:1.55;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Revisa tus gastos recientes en estas categorías. Ajustar el límite o pausar gastos no esenciales te ayudará a cerrar el mes en control.</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- ═══ CTA ═══ -->
  <tr><td style="text-align:center;padding:0 0 16px" align="center">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
      <td style="background:linear-gradient(135deg,#6d28d9,#7c3aed);border-radius:14px">
        <a href="https://cattia-gastos.vercel.app/" style="display:inline-block;color:#fff;text-decoration:none;padding:14px 40px;font-weight:700;font-size:15px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📱 Ver mis Presupuestos</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- ═══ FOOTER ═══ -->
  <tr><td style="text-align:center;padding:20px 20px 0;border-top:1px solid #ede9fe" align="center">
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#7c3aed;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">💜 Cattia Gastos</p>
    <p style="margin:0;color:#a78bfa;font-size:11px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Alerta automática · Desactívala desde Admin → Preferencias</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function generateAllGoodHTML({ budgetSummaries }) {
  const rows = budgetSummaries.map(b => {
    const pct = Math.round((b.spent / b.limit) * 100);
    const remaining = b.limit - b.spent;
    return `
    <tr><td style="padding:5px 0">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:12px;border:1px solid #dcfce7;overflow:hidden">
        <tr><td style="padding:14px 18px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td>
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width:10px;height:10px;border-radius:4px;background:${b.color}" width="10"></td>
                <td style="padding-left:10px;font-weight:600;color:#1e1b4b;font-size:13px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${b.category}</td>
              </tr></table>
            </td>
            <td align="right" style="text-align:right">
              <span style="font-size:12px;font-weight:700;color:#16a34a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${pct}%</span>
            </td>
          </tr></table>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 6px"><tr>
            <td style="background:#dcfce7;border-radius:20px;height:6px;overflow:hidden" height="6">
              <div style="background:#22c55e;height:6px;width:${Math.min(pct, 100)}%;border-radius:20px"></div>
            </td>
          </tr></table>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-size:11px;color:#64748b;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
              ${fmt(b.spent)} de ${fmt(b.limit)}
            </td>
            <td style="font-size:11px;color:#16a34a;text-align:right;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" align="right">
              ${fmt(remaining)} disponible
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>`;
  }).join('');

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
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%);border-radius:20px;overflow:hidden">
      <tr><td style="padding:40px 36px;text-align:center" align="center">
        <div style="font-size:42px;line-height:1;margin-bottom:10px">✅</div>
        <h1 style="color:#fff;margin:0 0 8px;font-size:26px;font-weight:800;letter-spacing:-0.5px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.2">¡Todo en Orden!</h1>
        <p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Catt, todos tus presupuestos están bajo control 🎉</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- ═══ BUDGET SUMMARIES ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
      <tr><td style="padding:22px 20px 14px">
        <h2 style="margin:0;font-size:17px;color:#1e1b4b;font-weight:700;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📊 Resumen de Presupuestos</h2>
      </td></tr>
      <tr><td style="padding:0 16px 16px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tbody>
            ${rows || '<tr><td style="padding:24px 0;text-align:center;color:#94a3b8;font-style:italic;font-size:13px;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" align="center">No tienes presupuestos configurados aún.</td></tr>'}
          </tbody>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- ═══ CTA ═══ -->
  <tr><td style="text-align:center;padding:0 0 16px" align="center">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
      <td style="background:linear-gradient(135deg,#059669,#10b981);border-radius:14px">
        <a href="https://cattia-gastos.vercel.app/" style="display:inline-block;color:#fff;text-decoration:none;padding:14px 40px;font-weight:700;font-size:15px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📱 Ver Dashboard</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- ═══ FOOTER ═══ -->
  <tr><td style="text-align:center;padding:20px 20px 0;border-top:1px solid #ede9fe" align="center">
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#7c3aed;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">💜 Cattia Gastos</p>
    <p style="margin:0;color:#a78bfa;font-size:11px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Verificación de presupuestos · Automática</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

async function checkBudgetsForUser(supabase, user, recipientEmail, forceMode = false) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  // Get budgets with category info (no user_id filter — column may not exist)
  const { data: budgets } = await supabase
    .from('category_budgets')
    .select('*, categories(id, name, color)');

  if (!budgets || budgets.length === 0) {
    if (!forceMode) return null;
    const email = recipientEmail || user.email;
    const html = generateAllGoodHTML({ budgetSummaries: [] });
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Cattia Gastos <onboarding@resend.dev>',
        to: [email],
        subject: '✅ Sin presupuestos configurados',
        html,
      }),
    });
    return { user: email, alerts: 0, sent: resendRes.ok, allGood: true };
  }

  // Fetch current month transactions (no user_id filter — column doesn't exist)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, category_id')
    .gte('date', toStartOfDay(monthStart))
    .lte('date', toEndOfDay(monthEnd));

  const txs = transactions || [];

  // Check each budget
  const alerts = [];
  const allSummaries = [];
  for (const budget of budgets) {
    const spent = txs
      .filter(t => t.category_id && Number(t.category_id) === budget.category_id)
      .reduce((sum, t) => sum + t.amount, 0);

    const pct = budget.monthly_limit > 0 ? (spent / budget.monthly_limit) * 100 : 0;

    allSummaries.push({
      category: budget.categories?.name || 'Sin nombre',
      color: budget.categories?.color || '#9ca3af',
      spent,
      limit: budget.monthly_limit,
    });

    if (pct >= budget.alert_threshold) {
      alerts.push(allSummaries[allSummaries.length - 1]);
    }
  }

  const email = recipientEmail || user.email;
  const userName = 'Catt';

  // No alerts — in force mode send "all good", in cron mode skip
  if (alerts.length === 0) {
    if (!forceMode) return null;
    const html = generateAllGoodHTML({ budgetSummaries: allSummaries });
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Cattia Gastos <onboarding@resend.dev>',
        to: [email],
        subject: '✅ Presupuestos bajo control — todo en orden',
        html,
      }),
    });
    return { user: email, alerts: 0, sent: resendRes.ok, allGood: true };
  }

  // Has alerts — send alert email
  const html = generateBudgetAlertHTML({ userName, alerts });
  const exceededCount = alerts.filter(a => (a.spent / a.limit) >= 1).length;
  const subject = exceededCount > 0
    ? `🔴 ${exceededCount} presupuesto${exceededCount > 1 ? 's' : ''} excedido${exceededCount > 1 ? 's' : ''}`
    : `🟡 ${alerts.length} presupuesto${alerts.length > 1 ? 's' : ''} en alerta`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Cattia Gastos <onboarding@resend.dev>',
      to: [email],
      subject,
      html,
    }),
  });

  return { user: email, alerts: alerts.length, sent: resendRes.ok };
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

      const result = await checkBudgetsForUser(supabase, user, recipientEmail || user.email, true);

      if (!result) {
        return new Response(JSON.stringify({ success: false, message: 'Error al procesar presupuestos' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: result.sent,
        message: `Alerta enviada a ${result.user} (${result.alerts} categorías)`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── MODE 2: Cron — process all qualifying users ───
    const { data: allSettings } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('budget_alerts_enabled', true);

    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with budget alerts enabled', sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    for (const setting of allSettings) {
      const { data: { user } } = await supabase.auth.admin.getUserById(setting.user_id);
      if (!user) continue;

      const result = await checkBudgetsForUser(supabase, user, recipientEmail || user.email);
      if (result) results.push(result);
    }

    return new Response(JSON.stringify({
      message: `Checked ${allSettings.length} users`,
      alerted: results.length,
      results,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
