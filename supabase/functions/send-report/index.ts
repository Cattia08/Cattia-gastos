// @ts-nocheck
// Supabase Edge Function: send-report
// Sends email expense reports via Resend API
//
// Deploy with:
//   supabase functions deploy send-report --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=re_xxx

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function fmt(n) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateEmailHTML({ userName, periodLabel, totalSpent, transactionCount, topCategories, avgPerDay, biggestExpense, previousPeriodTotal }) {
  const diff = previousPeriodTotal > 0
    ? Math.round(((totalSpent - previousPeriodTotal) / previousPeriodTotal) * 100)
    : 0;
  const diffLabel = diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : 'igual';
  const diffColor = diff > 0 ? '#ef4444' : diff < 0 ? '#22c55e' : '#6b7280';

  const categoryRows = topCategories.slice(0, 5).map(c => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${c.color};margin-right:8px;vertical-align:middle"></span>
        ${c.name}
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${fmt(c.total)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:center;color:#6b7280">${c.count} gastos</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#ec4899 0%,#8b5cf6 50%,#3b82f6 100%);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
    <h1 style="color:white;margin:0 0 8px;font-size:28px">Reporte de Gastos</h1>
    <p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px">${periodLabel}</p>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Hola, ${userName}!</p>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:24px">
    <div style="flex:1;background:white;border-radius:12px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase">Total Gastado</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#1e293b">${fmt(totalSpent)}</p>
      <p style="margin:4px 0 0;font-size:12px;color:${diffColor}">${diffLabel} vs anterior</p>
    </div>
    <div style="flex:1;background:white;border-radius:12px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase">Transacciones</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#1e293b">${transactionCount}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#6b7280">~${fmt(avgPerDay)}/dia</p>
    </div>
  </div>
  <div style="background:white;border-radius:12px;padding:24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b">Top Categorias</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:2px solid #e2e8f0">
        <th style="padding:8px 16px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase">Categoria</th>
        <th style="padding:8px 16px;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase">Total</th>
        <th style="padding:8px 16px;text-align:center;color:#6b7280;font-size:12px;text-transform:uppercase">Cant.</th>
      </tr></thead>
      <tbody>${categoryRows || '<tr><td colspan="3" style="padding:16px;text-align:center;color:#9ca3af">Sin categorias</td></tr>'}</tbody>
    </table>
  </div>
  ${biggestExpense ? `<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
    <p style="margin:0 0 4px;font-size:13px;color:#92400e">Mayor gasto del periodo</p>
    <p style="margin:0;font-size:20px;font-weight:700;color:#78350f">${biggestExpense.name}: ${fmt(biggestExpense.amount)}</p>
  </div>` : ''}
  <div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px">
    <p style="margin:0 0 4px">Enviado por <strong>Cattia Gastos</strong></p>
    <p style="margin:0">Puedes desactivar estos reportes desde Admin > Correos</p>
  </div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single client using user's JWT — RLS handles data scoping
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // RECIPIENT_EMAIL secret overrides user.email (needed for Resend free tier)
    const recipientEmail = Deno.env.get('RECIPIENT_EMAIL') || user.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'No email found for user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine period
    const frequency = settings?.report_frequency || 'weekly';
    const now = new Date();
    let periodStart, previousPeriodStart, previousPeriodEnd, periodLabel;

    if (frequency === 'monthly') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const monthName = now.toLocaleDateString('es', { month: 'long', year: 'numeric' });
      periodLabel = `Reporte Mensual - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    } else {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 7);
      previousPeriodStart = new Date(periodStart);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
      previousPeriodEnd = new Date(periodStart);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
      periodLabel = `Reporte Semanal - ${periodStart.toLocaleDateString('es')} al ${now.toLocaleDateString('es')}`;
    }

    // Fetch transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*, categories(id, name, color)')
      .gte('date', periodStart.toISOString())
      .lte('date', now.toISOString())
      .order('date', { ascending: false });

    if (txError) {
      return new Response(JSON.stringify({ error: 'Error fetching transactions', details: txError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('amount')
      .gte('date', previousPeriodStart.toISOString())
      .lte('date', previousPeriodEnd.toISOString());

    const txs = transactions || [];
    const totalSpent = txs.reduce((s, t) => s + t.amount, 0);
    const previousPeriodTotal = (prevTransactions || []).reduce((s, t) => s + t.amount, 0);
    const daysDiff = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const avgPerDay = totalSpent / daysDiff;

    // Top categories
    const catMap = new Map();
    for (const t of txs) {
      const catName = t.categories?.name || 'Sin categoria';
      const catColor = t.categories?.color || '#9ca3af';
      const existing = catMap.get(catName) || { name: catName, color: catColor, total: 0, count: 0 };
      existing.total += t.amount;
      existing.count += 1;
      catMap.set(catName, existing);
    }
    const topCategories = [...catMap.values()].sort((a, b) => b.total - a.total);

    const biggestExpense = txs.length > 0
      ? txs.reduce((max, t) => t.amount > max.amount ? t : max, txs[0])
      : null;

    const userName = user.email?.split('@')[0] || 'Usuario';

    const html = generateEmailHTML({
      userName, periodLabel, totalSpent, transactionCount: txs.length,
      topCategories, avgPerDay,
      biggestExpense: biggestExpense ? { name: biggestExpense.name, amount: biggestExpense.amount } : null,
      previousPeriodTotal,
    });

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Cattia Gastos <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: periodLabel,
        html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      return new Response(JSON.stringify({ error: 'Failed to send email', details: err }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendData = await resendRes.json();

    return new Response(JSON.stringify({
      success: true,
      message: `Reporte enviado a ${recipientEmail}`,
      id: resendData.id,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
