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

function generateEmailHTML({ userName, periodLabel, totalSpent, transactionCount, topCategories, avgPerDay, avgPerTransaction, biggestExpense, previousPeriodTotal, recentTransactions, categoriesCount }) {
  const diff = previousPeriodTotal > 0
    ? Math.round(((totalSpent - previousPeriodTotal) / previousPeriodTotal) * 100)
    : 0;
  const diffLabel = diff > 0 ? `↑ ${diff}%` : diff < 0 ? `↓ ${Math.abs(diff)}%` : '→ igual';
  const diffColor = diff > 0 ? '#ef4444' : diff < 0 ? '#22c55e' : '#94a3b8';
  const diffBg = diff > 0 ? '#fef2f2' : diff < 0 ? '#f0fdf4' : '#f8fafc';

  // Smart tip based on spending
  let tipEmoji = '💡';
  let tipText = 'Registrar cada gasto, por pequeño que sea, te da control total sobre tus finanzas.';
  if (diff > 20) {
    tipEmoji = '⚠️';
    tipText = `Tus gastos subieron ${diff}% respecto al periodo anterior. Revisa si hay gastos que puedas reducir.`;
  } else if (diff < -10) {
    tipEmoji = '🎉';
    tipText = `¡Excelente! Redujiste tus gastos ${Math.abs(diff)}% respecto al periodo anterior. ¡Sigue así!`;
  } else if (categoriesCount === 1) {
    tipText = 'Todos tus gastos están en una sola categoría. Categorizar te ayuda a identificar patrones.';
  } else if (avgPerTransaction > 50) {
    tipText = `Tu gasto promedio es ${fmt(avgPerTransaction)} por compra. Compras frecuentes pequeñas pueden sumar más que una grande.`;
  }

  const maxCatTotal = topCategories.length > 0 ? topCategories[0].total : 1;
  const categoryRows = topCategories.slice(0, 5).map(c => {
    const pct = Math.round((c.total / totalSpent) * 100);
    const barWidth = Math.max(8, Math.round((c.total / maxCatTotal) * 100));
    return `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f0fb">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="display:inline-block;width:14px;height:14px;border-radius:6px;background:${c.color};flex-shrink:0"></span>
          <span style="font-weight:500;color:#1e1b4b">${c.name}</span>
        </div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f0fb;text-align:right">
        <div style="font-weight:700;color:#1e1b4b;font-size:14px">${fmt(c.total)}</div>
        <div style="margin-top:6px;background:#ede9fe;border-radius:99px;height:6px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#8b5cf6,#a78bfa);height:100%;width:${barWidth}%;border-radius:99px"></div>
        </div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f0fb;text-align:center">
        <span style="background:#f5f3ff;color:#7c3aed;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600">${pct}%</span>
      </td>
    </tr>`;
  }).join('');

  const recentRows = (recentTransactions || []).slice(0, 5).map(t => {
    const d = new Date(t.date);
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
    const catName = t.categories?.name || '';
    const catColor = t.categories?.color || '#9ca3af';
    return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f0fb">
        <div style="font-weight:500;color:#1e1b4b;font-size:13px">${t.name}</div>
        <div style="font-size:11px;color:#a78bfa;margin-top:2px">${dateStr}${catName ? ' • ' + catName : ''}</div>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f0fb;text-align:right;font-weight:700;color:#1e1b4b;font-size:14px;white-space:nowrap">
        ${fmt(t.amount)}
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Segoe UI',Tahoma,Geneva,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#8b5cf6 40%,#a78bfa 100%);border-radius:20px;padding:40px 32px;text-align:center;margin-bottom:20px;position:relative;overflow:hidden">
    <div style="position:relative;z-index:1">
      <div style="font-size:40px;margin-bottom:8px">💰</div>
      <h1 style="color:white;margin:0 0 6px;font-size:26px;font-weight:800;letter-spacing:-0.5px">Reporte de Gastos</h1>
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:99px;padding:6px 16px;margin-top:8px">
        <span style="color:rgba(255,255,255,0.95);font-size:13px;font-weight:500">📅 ${periodLabel}</span>
      </div>
      <p style="color:rgba(255,255,255,0.85);margin:12px 0 0;font-size:14px">¡Hola, ${userName}! Aquí tienes tu resumen 👋</p>
    </div>
  </div>

  <!-- Stats Grid: 3 cards -->
  <div style="display:flex;gap:10px;margin-bottom:20px">
    <div style="flex:1;background:white;border-radius:16px;padding:20px 12px;text-align:center;box-shadow:0 1px 4px rgba(124,58,237,0.08);border:1px solid #ede9fe">
      <div style="font-size:22px;margin-bottom:4px">🏷️</div>
      <p style="margin:0 0 2px;color:#7c3aed;font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Total</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:#1e1b4b">${fmt(totalSpent)}</p>
      <div style="margin-top:6px;display:inline-block;background:${diffBg};border-radius:99px;padding:2px 10px">
        <span style="font-size:11px;font-weight:600;color:${diffColor}">${diffLabel}</span>
      </div>
    </div>
    <div style="flex:1;background:white;border-radius:16px;padding:20px 12px;text-align:center;box-shadow:0 1px 4px rgba(124,58,237,0.08);border:1px solid #ede9fe">
      <div style="font-size:22px;margin-bottom:4px">📊</div>
      <p style="margin:0 0 2px;color:#7c3aed;font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Compras</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:#1e1b4b">${transactionCount}</p>
      <div style="margin-top:6px;display:inline-block;background:#f5f3ff;border-radius:99px;padding:2px 10px">
        <span style="font-size:11px;font-weight:600;color:#7c3aed">~${fmt(avgPerDay)}/día</span>
      </div>
    </div>
    <div style="flex:1;background:white;border-radius:16px;padding:20px 12px;text-align:center;box-shadow:0 1px 4px rgba(124,58,237,0.08);border:1px solid #ede9fe">
      <div style="font-size:22px;margin-bottom:4px">💳</div>
      <p style="margin:0 0 2px;color:#7c3aed;font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Promedio</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:#1e1b4b">${fmt(avgPerTransaction)}</p>
      <div style="margin-top:6px;display:inline-block;background:#f5f3ff;border-radius:99px;padding:2px 10px">
        <span style="font-size:11px;font-weight:600;color:#7c3aed">por compra</span>
      </div>
    </div>
  </div>

  <!-- Smart Tip -->
  <div style="background:linear-gradient(135deg,#ede9fe,#f5f3ff);border-radius:14px;padding:18px 20px;margin-bottom:20px;border:1px solid #ddd6fe">
    <div style="display:flex;align-items:start;gap:12px">
      <div style="font-size:24px;flex-shrink:0;line-height:1">${tipEmoji}</div>
      <div>
        <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px">Insight</p>
        <p style="margin:0;font-size:13px;color:#4c1d95;line-height:1.5">${tipText}</p>
      </div>
    </div>
  </div>

  <!-- Categories Table -->
  <div style="background:white;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 1px 4px rgba(124,58,237,0.08);border:1px solid #ede9fe">
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e1b4b;font-weight:700">📂 Top Categorías</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:2px solid #ede9fe">
        <th style="padding:8px 16px;text-align:left;color:#7c3aed;font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Categoría</th>
        <th style="padding:8px 16px;text-align:right;color:#7c3aed;font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Total</th>
        <th style="padding:8px 16px;text-align:center;color:#7c3aed;font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px">%</th>
      </tr></thead>
      <tbody>${categoryRows || '<tr><td colspan="3" style="padding:24px;text-align:center;color:#a78bfa;font-style:italic">Sin categorías este periodo</td></tr>'}</tbody>
    </table>
  </div>

  ${biggestExpense ? `
  <!-- Biggest Expense -->
  <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center;border:1px solid #fcd34d">
    <div style="font-size:28px;margin-bottom:6px">🔥</div>
    <p style="margin:0 0 4px;font-size:12px;color:#92400e;text-transform:uppercase;font-weight:700;letter-spacing:0.5px">Mayor gasto del periodo</p>
    <p style="margin:0;font-size:18px;font-weight:800;color:#78350f">${biggestExpense.name}</p>
    <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#92400e">${fmt(biggestExpense.amount)}</p>
  </div>` : ''}

  <!-- Recent Transactions -->
  ${recentRows ? `
  <div style="background:white;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 1px 4px rgba(124,58,237,0.08);border:1px solid #ede9fe">
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e1b4b;font-weight:700">🧾 Últimos Gastos</h2>
    <table style="width:100%;border-collapse:collapse">
      <tbody>${recentRows}</tbody>
    </table>
  </div>` : ''}

  <!-- CTA Button -->
  <div style="text-align:center;margin-bottom:20px">
    <a href="https://cattia-gastos.vercel.app/" 
       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(124,58,237,0.35);letter-spacing:0.3px">
      📱 Ver mi Dashboard
    </a>
    <p style="margin:10px 0 0;font-size:12px;color:#a78bfa">Revisa tus gastos detallados en la app</p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px 16px;border-top:1px solid #ede9fe;margin-top:8px">
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed">💜 Cattia Gastos</p>
    <p style="margin:0;color:#a78bfa;font-size:11px">Puedes desactivar estos reportes desde Admin → Reportes</p>
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
    const avgPerTransaction = txs.length > 0 ? totalSpent / txs.length : 0;

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
      topCategories, avgPerDay, avgPerTransaction,
      biggestExpense: biggestExpense ? { name: biggestExpense.name, amount: biggestExpense.amount } : null,
      previousPeriodTotal,
      recentTransactions: txs.slice(0, 5),
      categoriesCount: catMap.size,
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
