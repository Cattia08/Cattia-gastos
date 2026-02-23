// @ts-nocheck
// Supabase Edge Function: daily-digest
// Called by pg_cron nightly — sends "Hoy gastaste S/ X" summary
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

function generateDigestHTML({ userName, todayTotal, todayCount, transactions, weekTotal, weekCount, topCategory }) {
  const txRows = transactions.slice(0, 8).map(t => {
    const catName = t.categories?.name || '';
    const catColor = t.categories?.color || '#9ca3af';
    return `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f0fb">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:4px;background:${catColor}"></span>
          <span style="font-weight:500;color:#1e1b4b;font-size:13px">${t.name}</span>
        </div>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f0fb;text-align:right;font-weight:700;color:#1e1b4b;font-size:14px;white-space:nowrap">${fmt(t.amount)}</td>
    </tr>`;
  }).join('');

  const greeting = todayCount === 0
    ? '¡Día sin gastos! 🎉 Tu billetera te lo agradece.'
    : `Hoy tuviste ${todayCount} compra${todayCount > 1 ? 's' : ''}.`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Segoe UI',Tahoma,Geneva,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a78bfa 100%);border-radius:20px;padding:36px 32px;text-align:center;margin-bottom:20px">
    <div style="font-size:36px;margin-bottom:6px">🌙</div>
    <h1 style="color:white;margin:0 0 6px;font-size:24px;font-weight:800">Resumen del Día</h1>
    <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px">${greeting}</p>
  </div>

  <!-- Today's total — hero card -->
  <div style="background:white;border-radius:16px;padding:28px;text-align:center;margin-bottom:16px;border:1px solid #ede9fe">
    <p style="margin:0 0 4px;color:#7c3aed;font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Hoy gastaste</p>
    <p style="margin:0;font-size:36px;font-weight:800;color:#1e1b4b">${fmt(todayTotal)}</p>
    <p style="margin:8px 0 0;font-size:13px;color:#a78bfa">en ${todayCount} transacción${todayCount !== 1 ? 'es' : ''}</p>
  </div>

  <!-- Week context -->
  <div style="display:flex;gap:10px;margin-bottom:20px">
    <div style="flex:1;background:white;border-radius:14px;padding:16px 12px;text-align:center;border:1px solid #ede9fe">
      <p style="margin:0 0 2px;color:#7c3aed;font-size:10px;text-transform:uppercase;font-weight:700">Esta semana</p>
      <p style="margin:0;font-size:18px;font-weight:800;color:#1e1b4b">${fmt(weekTotal)}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#a78bfa">${weekCount} compras</p>
    </div>
    ${topCategory ? `<div style="flex:1;background:white;border-radius:14px;padding:16px 12px;text-align:center;border:1px solid #ede9fe">
      <p style="margin:0 0 2px;color:#7c3aed;font-size:10px;text-transform:uppercase;font-weight:700">Top categoría hoy</p>
      <p style="margin:0;font-size:18px;font-weight:800;color:#1e1b4b">${topCategory.name}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#a78bfa">${fmt(topCategory.total)}</p>
    </div>` : ''}
  </div>

  ${txRows ? `
  <div style="background:white;border-radius:16px;padding:20px;margin-bottom:20px;border:1px solid #ede9fe">
    <h2 style="margin:0 0 12px;font-size:16px;color:#1e1b4b;font-weight:700">🧾 Detalle</h2>
    <table style="width:100%;border-collapse:collapse"><tbody>${txRows}</tbody></table>
  </div>` : ''}

  <div style="text-align:center;margin-bottom:20px">
    <a href="https://cattia-gastos.vercel.app/" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:white;text-decoration:none;padding:12px 36px;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(124,58,237,0.35)">📱 Ver Dashboard</a>
  </div>

  <div style="text-align:center;padding:16px;border-top:1px solid #ede9fe">
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed">💜 Cattia Gastos</p>
    <p style="margin:0;color:#a78bfa;font-size:11px">Resumen diario • Desactívalo desde Admin → Preferencias</p>
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

    // Get users with daily digest enabled
    const { data: allSettings } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('daily_digest_enabled', true);

    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with daily digest enabled', sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recipientEmail = Deno.env.get('RECIPIENT_EMAIL');
    const results = [];

    for (const setting of allSettings) {
      const userId = setting.user_id;

      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      if (!user) continue;

      // Today's date range (UTC-5 Peru)
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      // This week
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);

      // Fetch today's transactions
      const { data: todayTx } = await supabase
        .from('transactions')
        .select('*, categories(id, name, color)')
        .eq('user_id', userId)
        .gte('date', todayStart.toISOString())
        .lte('date', now.toISOString())
        .order('date', { ascending: false });

      // Fetch week's transactions
      const { data: weekTx } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', weekStart.toISOString())
        .lte('date', now.toISOString());

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
      const userName = user.email?.split('@')[0] || 'Usuario';

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

      results.push({ user: email, todayTotal, todayCount, sent: resendRes.ok });
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
