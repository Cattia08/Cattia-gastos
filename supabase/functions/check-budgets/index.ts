// @ts-nocheck
// Supabase Edge Function: check-budgets
// Called by pg_cron daily — sends budget alert emails
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

function generateBudgetAlertHTML({ userName, alerts }) {
  const alertRows = alerts.map(a => {
    const pct = Math.round((a.spent / a.limit) * 100);
    const isExceeded = pct >= 100;
    const barColor = isExceeded ? '#ef4444' : '#f59e0b';
    const barBg = isExceeded ? '#fef2f2' : '#fffbeb';
    const statusText = isExceeded ? '¡Excedido!' : '¡Atención!';
    const statusEmoji = isExceeded ? '🔴' : '🟡';

    return `
    <div style="background:${barBg};border-radius:14px;padding:16px 20px;margin-bottom:12px;border:1px solid ${barColor}20">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:12px;height:12px;border-radius:4px;background:${a.color}"></span>
          <span style="font-weight:600;color:#1e1b4b;font-size:14px">${a.category}</span>
        </div>
        <span style="font-size:12px;font-weight:700;color:${barColor}">${statusEmoji} ${statusText} ${pct}%</span>
      </div>
      <div style="background:#e5e7eb;border-radius:99px;height:8px;overflow:hidden;margin-bottom:8px">
        <div style="background:${barColor};height:100%;width:${Math.min(pct, 100)}%;border-radius:99px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280">
        <span>Gastado: <strong style="color:#1e1b4b">${fmt(a.spent)}</strong></span>
        <span>Límite: <strong style="color:#1e1b4b">${fmt(a.limit)}</strong></span>
      </div>
    </div>`;
  }).join('');

  const exceededCount = alerts.filter(a => (a.spent / a.limit) >= 1).length;
  const warningCount = alerts.length - exceededCount;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Segoe UI',Tahoma,Geneva,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);border-radius:20px;padding:40px 32px;text-align:center;margin-bottom:20px">
    <div style="font-size:40px;margin-bottom:8px">⚡</div>
    <h1 style="color:white;margin:0 0 6px;font-size:26px;font-weight:800">Alerta de Presupuesto</h1>
    <p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px">¡Hola, ${userName}! Tienes categorías cerca del límite</p>
    <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
      ${exceededCount > 0 ? `<div style="background:rgba(255,255,255,0.2);border-radius:99px;padding:4px 14px">
        <span style="color:white;font-size:13px;font-weight:600">🔴 ${exceededCount} excedido${exceededCount > 1 ? 's' : ''}</span>
      </div>` : ''}
      ${warningCount > 0 ? `<div style="background:rgba(255,255,255,0.2);border-radius:99px;padding:4px 14px">
        <span style="color:white;font-size:13px;font-weight:600">🟡 ${warningCount} en alerta</span>
      </div>` : ''}
    </div>
  </div>

  <div style="background:white;border-radius:16px;padding:24px;margin-bottom:20px;border:1px solid #ede9fe">
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e1b4b;font-weight:700">📊 Detalle por Categoría</h2>
    ${alertRows}
  </div>

  <div style="background:linear-gradient(135deg,#ede9fe,#f5f3ff);border-radius:14px;padding:18px 20px;margin-bottom:20px;border:1px solid #ddd6fe">
    <div style="display:flex;align-items:start;gap:12px">
      <div style="font-size:24px">💡</div>
      <div>
        <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase">Tip</p>
        <p style="margin:0;font-size:13px;color:#4c1d95;line-height:1.5">Revisa tus gastos recientes en estas categorías. Ajustar el límite o reorganizar categorías puede darte más control.</p>
      </div>
    </div>
  </div>

  <div style="text-align:center;margin-bottom:20px">
    <a href="https://cattia-gastos.vercel.app/" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(124,58,237,0.35)">📱 Ver mis Presupuestos</a>
  </div>

  <div style="text-align:center;padding:20px 16px;border-top:1px solid #ede9fe">
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed">💜 Cattia Gastos</p>
    <p style="margin:0;color:#a78bfa;font-size:11px">Alerta automática • Desactívala desde Admin → Preferencias</p>
  </div>

</div></body></html>`;
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

    // Get users with budget alerts enabled
    const { data: allSettings } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('budget_alerts_enabled', true);

    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with budget alerts enabled', sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recipientEmail = Deno.env.get('RECIPIENT_EMAIL');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const results = [];

    for (const setting of allSettings) {
      const userId = setting.user_id;

      // Get user
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      if (!user) continue;

      // Get budgets with category info
      const { data: budgets } = await supabase
        .from('category_budgets')
        .select('*, categories(id, name, color)')
        .eq('user_id', userId);

      if (!budgets || budgets.length === 0) continue;

      // Get this month's transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('user_id', userId)
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString());

      const txs = transactions || [];

      // Check each budget
      const alerts = [];
      for (const budget of budgets) {
        const spent = txs
          .filter(t => t.category_id && Number(t.category_id) === budget.category_id)
          .reduce((sum, t) => sum + t.amount, 0);

        const pct = budget.monthly_limit > 0 ? (spent / budget.monthly_limit) * 100 : 0;

        // Alert if at or above threshold
        if (pct >= budget.alert_threshold) {
          alerts.push({
            category: budget.categories?.name || 'Sin nombre',
            color: budget.categories?.color || '#9ca3af',
            spent,
            limit: budget.monthly_limit,
          });
        }
      }

      if (alerts.length === 0) continue;

      const email = recipientEmail || user.email;
      const userName = user.email?.split('@')[0] || 'Usuario';
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

      results.push({ user: email, alerts: alerts.length, sent: resendRes.ok });
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
