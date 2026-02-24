// @ts-nocheck
// Supabase Edge Function: scheduled-reports
// Unified report sender — works in two modes:
//   1. pg_cron (no body)  → sends reports to ALL qualifying users
//   2. Manual test (body: { force_user_id }) → sends report to ONE user immediately
//
// Deploy with:
//   supabase functions deploy scheduled-reports --no-verify-jwt

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

function generateReportHTML({ userName, periodLabel, totalSpent, transactionCount, topCategories, avgPerDay, avgPerTransaction, biggestExpense, previousPeriodTotal, recentTransactions, categoriesCount }) {
  const diff = previousPeriodTotal > 0
    ? Math.round(((totalSpent - previousPeriodTotal) / previousPeriodTotal) * 100)
    : 0;
  const diffLabel = diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : '0%';
  const diffColor = diff > 0 ? '#dc2626' : diff < 0 ? '#16a34a' : '#64748b';
  const diffArrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';

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
    tipText = `Tu gasto promedio es ${fmt(avgPerTransaction)} por compra. Las compras frecuentes pequeñas pueden sumar más que una grande.`;
  }

  const maxCatTotal = topCategories.length > 0 ? topCategories[0].total : 1;
  const catColors = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];
  const categoryRows = topCategories.slice(0, 5).map((c, i) => {
    const pct = Math.round((c.total / totalSpent) * 100);
    const barWidth = Math.max(12, Math.round((c.total / maxCatTotal) * 100));
    const barColor = catColors[i] || '#a78bfa';
    return `
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:12px;height:12px;border-radius:4px;background:${c.color || barColor}" width="12"></td>
          <td style="padding-left:10px;font-weight:600;color:#1e1b4b;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${c.name}</td>
        </tr></table>
      </td>
      <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;text-align:right" align="right">
        <div style="font-weight:700;color:#1e1b4b;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin-bottom:6px">${fmt(c.total)}</div>
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="background:#f1f5f9;border-radius:20px;height:6px;overflow:hidden" height="6">
            <div style="background:${c.color || barColor};height:6px;width:${barWidth}%;border-radius:20px"></div>
          </td>
        </tr></table>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;text-align:center" align="center" width="60">
        <span style="background:#f5f3ff;color:#7c3aed;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${pct}%</span>
      </td>
    </tr>`;
  }).join('');

  const recentRows = (recentTransactions || []).slice(0, 5).map(t => {
    const d = new Date(t.date);
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const catName = t.categories?.name || '';
    const catColor = t.categories?.color || '#94a3b8';
    return `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid #f1f5f9">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:8px;height:8px;border-radius:50%;background:${catColor}" width="8"></td>
          <td style="padding-left:10px">
            <div style="font-weight:600;color:#1e1b4b;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${t.name}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${dateStr}${catName ? ' · ' + catName : ''}</div>
          </td>
        </tr></table>
      </td>
      <td style="padding:12px 20px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e1b4b;font-size:14px;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" align="right">
        ${fmt(t.amount)}
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if mso]><style>table{border-collapse:collapse}td{font-family:Arial,sans-serif}</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  td { font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
</style></head>
<body style="margin:0;padding:0;background:#f8f7ff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f7ff">
<tr><td align="center" style="padding:32px 16px">

<!-- Main container -->
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

  <!-- ═══ HEADER ═══ -->
  <tr><td style="padding:0 0 20px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#6d28d9 0%,#7c3aed 35%,#8b5cf6 70%,#a78bfa 100%);border-radius:20px;overflow:hidden">
      <tr><td style="padding:44px 36px;text-align:center" align="center">
        <div style="font-size:44px;line-height:1;margin-bottom:12px">📊</div>
        <h1 style="color:#ffffff;margin:0 0 6px;font-size:28px;font-weight:800;letter-spacing:-0.5px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.2">Reporte de Gastos</h1>
        <table cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 0"><tr>
          <td style="background:rgba(255,255,255,0.18);border-radius:24px;padding:6px 18px">
            <span style="color:rgba(255,255,255,0.95);font-size:13px;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📅 ${periodLabel}</span>
          </td>
        </tr></table>
        <p style="color:rgba(255,255,255,0.8);margin:14px 0 0;font-size:14px;font-weight:400;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Hola ${userName}, aquí tienes tu resumen 👋</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- ═══ STATS ROW ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <!-- Total -->
      <td width="33%" style="padding:0 4px 0 0" valign="top">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
          <tr><td style="height:3px;background:linear-gradient(90deg,#7c3aed,#a78bfa)" height="3"></td></tr>
          <tr><td style="padding:20px 12px;text-align:center" align="center">
            <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#7c3aed;margin-bottom:6px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Total</div>
            <div style="font-size:22px;font-weight:800;color:#1e1b4b;line-height:1.2;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${fmt(totalSpent)}</div>
            <table cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 0"><tr>
              <td style="background:${diff > 0 ? '#fef2f2' : diff < 0 ? '#f0fdf4' : '#f8fafc'};border-radius:20px;padding:3px 10px">
                <span style="font-size:11px;font-weight:700;color:${diffColor};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${diffArrow} ${diffLabel}</span>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td>
      <!-- Compras -->
      <td width="33%" style="padding:0 2px" valign="top">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
          <tr><td style="height:3px;background:linear-gradient(90deg,#8b5cf6,#c4b5fd)" height="3"></td></tr>
          <tr><td style="padding:20px 12px;text-align:center" align="center">
            <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#7c3aed;margin-bottom:6px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Compras</div>
            <div style="font-size:22px;font-weight:800;color:#1e1b4b;line-height:1.2;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${transactionCount}</div>
            <table cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 0"><tr>
              <td style="background:#f5f3ff;border-radius:20px;padding:3px 10px">
                <span style="font-size:11px;font-weight:600;color:#7c3aed;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">~${fmt(avgPerDay)}/día</span>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td>
      <!-- Promedio -->
      <td width="33%" style="padding:0 0 0 4px" valign="top">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
          <tr><td style="height:3px;background:linear-gradient(90deg,#a78bfa,#ddd6fe)" height="3"></td></tr>
          <tr><td style="padding:20px 12px;text-align:center" align="center">
            <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#7c3aed;margin-bottom:6px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Promedio</div>
            <div style="font-size:22px;font-weight:800;color:#1e1b4b;line-height:1.2;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${fmt(avgPerTransaction)}</div>
            <table cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 0"><tr>
              <td style="background:#f5f3ff;border-radius:20px;padding:3px 10px">
                <span style="font-size:11px;font-weight:600;color:#7c3aed;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">por compra</span>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td>
    </tr></table>
  </td></tr>

  <!-- ═══ INSIGHT TIP ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);border-radius:16px;border:1px solid #ddd6fe;overflow:hidden">
      <tr>
        <td width="52" style="padding:18px 0 18px 20px;vertical-align:top" valign="top">
          <div style="font-size:26px;line-height:1">${tipEmoji}</div>
        </td>
        <td style="padding:18px 20px 18px 12px;vertical-align:top" valign="top">
          <div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Insight</div>
          <div style="font-size:13px;color:#4c1d95;line-height:1.55;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${tipText}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- ═══ TOP CATEGORIES ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
      <tr><td style="padding:22px 20px 14px">
        <h2 style="margin:0;font-size:17px;color:#1e1b4b;font-weight:700;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📂 Top Categorías</h2>
      </td></tr>
      <tr><td style="padding:0">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <thead><tr style="border-bottom:2px solid #ede9fe">
            <th style="padding:8px 20px;text-align:left;color:#7c3aed;font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" align="left">Categoría</th>
            <th style="padding:8px 20px;text-align:right;color:#7c3aed;font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" align="right">Total</th>
            <th style="padding:8px 16px;text-align:center;color:#7c3aed;font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" align="center" width="60">%</th>
          </tr></thead>
          <tbody>${categoryRows || '<tr><td colspan="3" style="padding:28px 20px;text-align:center;color:#a78bfa;font-style:italic;font-size:13px;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">Sin categorías este periodo</td></tr>'}</tbody>
        </table>
      </td></tr>
    </table>
  </td></tr>

  ${biggestExpense ? `
  <!-- ═══ BIGGEST EXPENSE ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#fef9c3 0%,#fde68a 50%,#fcd34d 100%);border-radius:16px;border:1px solid #fbbf24;overflow:hidden">
      <tr><td style="padding:26px 24px;text-align:center" align="center">
        <div style="font-size:30px;line-height:1;margin-bottom:8px">🔥</div>
        <div style="font-size:11px;color:#92400e;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Mayor gasto del periodo</div>
        <div style="font-size:18px;font-weight:800;color:#78350f;margin-bottom:4px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${biggestExpense.name}</div>
        <div style="font-size:24px;font-weight:800;color:#92400e;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${fmt(biggestExpense.amount)}</div>
      </td></tr>
    </table>
  </td></tr>` : ''}

  ${recentRows ? `
  <!-- ═══ RECENT TRANSACTIONS ═══ -->
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
      <tr><td style="padding:22px 20px 14px">
        <h2 style="margin:0;font-size:17px;color:#1e1b4b;font-weight:700;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">🧾 Últimos Gastos</h2>
      </td></tr>
      <tr><td style="padding:0">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tbody>${recentRows}</tbody>
        </table>
      </td></tr>
    </table>
  </td></tr>` : ''}

  <!-- ═══ CTA BUTTON ═══ -->
  <tr><td style="padding:0 0 16px;text-align:center" align="center">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
      <td style="background:linear-gradient(135deg,#6d28d9,#7c3aed,#8b5cf6);border-radius:14px;padding:0;text-align:center" align="center">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://cattia-gastos.vercel.app/" style="height:50px;v-text-anchor:middle;width:220px" arcsize="28%" fillcolor="#7c3aed" stroke="f"><w:anchorlock/><center style="color:#ffffff;font-family:Arial;font-size:15px;font-weight:bold">📱 Ver mi Dashboard</center></v:roundrect><![endif]-->
        <!--[if !mso]><!-->
        <a href="https://cattia-gastos.vercel.app/" style="display:inline-block;color:#ffffff;text-decoration:none;padding:15px 40px;font-weight:700;font-size:15px;letter-spacing:0.3px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📱 Ver mi Dashboard</a>
        <!--<![endif]-->
      </td>
    </tr></table>
    <p style="margin:10px 0 0;font-size:12px;color:#a78bfa;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Revisa tus gastos detallados en la app</p>
  </td></tr>

  <!-- ═══ FOOTER ═══ -->
  <tr><td style="padding:20px 20px 0;text-align:center;border-top:1px solid #ede9fe" align="center">
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#7c3aed;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">💜 Cattia Gastos</p>
    <p style="margin:0;color:#a78bfa;font-size:11px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Reporte automático · Desactívalo desde Admin → Reportes</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function generateNoDataHTML({ userName, periodLabel }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  td { font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
</style></head>
<body style="margin:0;padding:0;background:#f8f7ff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f7ff">
<tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#6d28d9,#7c3aed,#8b5cf6);border-radius:20px;overflow:hidden">
      <tr><td style="padding:44px 36px;text-align:center" align="center">
        <div style="font-size:44px;line-height:1;margin-bottom:12px">📭</div>
        <h1 style="color:#fff;margin:0 0 8px;font-size:26px;font-weight:800;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Sin Movimientos</h1>
        <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Hola ${userName}, no hay transacciones en este periodo</p>
        <table cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 0"><tr>
          <td style="background:rgba(255,255,255,0.18);border-radius:24px;padding:6px 18px">
            <span style="color:rgba(255,255,255,0.95);font-size:13px;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📅 ${periodLabel}</span>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 0">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:16px;border:1px solid #ede9fe;overflow:hidden">
      <tr><td style="padding:28px 24px;text-align:center" align="center">
        <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">No se registraron gastos en este periodo.<br>¡Empieza a registrar para ver tu próximo reporte! 🚀</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="text-align:center;padding:0 0 20px" align="center">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
      <td style="background:linear-gradient(135deg,#6d28d9,#7c3aed);border-radius:14px">
        <a href="https://cattia-gastos.vercel.app/" style="display:inline-block;color:#fff;text-decoration:none;padding:14px 36px;font-weight:700;font-size:14px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">📱 Ver Dashboard</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="text-align:center;padding:16px 0 0;border-top:1px solid #ede9fe" align="center">
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#7c3aed;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">💜 Cattia Gastos</p>
    <p style="margin:0;color:#a78bfa;font-size:11px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Reporte de prueba</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function buildAndSendReport(supabase, user, recipientEmail, frequency, forceMode = false) {
  const now = new Date();

  // In cron mode, check if it's the right day for this frequency
  if (!forceMode) {
    const dayOfWeek = now.getUTCDay();
    const dayOfMonth = now.getUTCDate();
    if (frequency === 'weekly' && dayOfWeek !== 1) return null;  // Only Mondays
    if (frequency === 'monthly' && dayOfMonth !== 1) return null; // Only 1st
  }

  let periodStart, previousPeriodStart, previousPeriodEnd, periodLabel;

  if (frequency === 'monthly') {
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), forceMode ? now.getUTCMonth() : now.getUTCMonth() - 1, 1));
    previousPeriodStart = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() - 1, 1));
    previousPeriodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 0));
    const monthName = periodStart.toLocaleDateString('es', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    periodLabel = `Reporte Mensual — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
  } else {
    periodStart = new Date(now);
    periodStart.setUTCDate(now.getUTCDate() - 7);
    previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setUTCDate(previousPeriodStart.getUTCDate() - 7);
    previousPeriodEnd = new Date(periodStart);
    previousPeriodEnd.setUTCDate(previousPeriodEnd.getUTCDate() - 1);
    periodLabel = `Reporte Semanal — ${toDateStr(periodStart)} al ${toDateStr(now)}`;
  }

  // ── FIX: use full ISO timestamps for inclusive date range queries ──
  const periodStartISO = toStartOfDay(periodStart);
  const nowISO = toEndOfDay(now);

  // ── DEBUG: fetch sample transactions without date filter to verify data exists ──
  const { data: allUserTx, error: allUserTxErr } = await supabase
    .from('transactions')
    .select('id, date, amount, name')
    .order('date', { ascending: false })
    .limit(10);

  const debugInfo = {
    frequency,
    periodStartISO,
    nowISO,
    previousPeriodStart: toStartOfDay(previousPeriodStart),
    previousPeriodEnd: toEndOfDay(previousPeriodEnd),
    allTxCount: allUserTx?.length ?? 0,
    allTxError: allUserTxErr?.message || null,
    sampleDates: (allUserTx || []).slice(0, 5).map(t => ({ id: t.id, date: t.date, name: t.name })),
  };
  console.log('[DEBUG scheduled-reports]', JSON.stringify(debugInfo));

  // Fetch current period transactions (no user_id filter — table has no user_id column)
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*, categories(id, name, color)')
    .gte('date', periodStartISO)
    .lte('date', nowISO)
    .order('date', { ascending: false });

  // Fetch previous period transactions
  const { data: prevTransactions } = await supabase
    .from('transactions')
    .select('amount')
    .gte('date', toStartOfDay(previousPeriodStart))
    .lte('date', toEndOfDay(previousPeriodEnd));

  const txs = transactions || [];
  if (txs.length === 0) {
    if (!forceMode) return null;
    // In force mode, return debug info so we can diagnose the issue
    const email = recipientEmail;
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Cattia Gastos <onboarding@resend.dev>',
        to: [email],
        subject: `📊 ${periodLabel} — sin movimientos`,
        html: generateNoDataHTML({ userName: 'Catt', periodLabel }),
      }),
    });
    return { ok: resendRes.ok, email, subject: periodLabel + ' — sin movimientos', debug: debugInfo, txError: txError?.message || null };
  }

  const totalSpent = txs.reduce((s, t) => s + t.amount, 0);
  const previousPeriodTotal = (prevTransactions || []).reduce((s, t) => s + t.amount, 0);
  const daysDiff = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const avgPerDay = totalSpent / daysDiff;
  const avgPerTransaction = txs.length > 0 ? totalSpent / txs.length : 0;

  // Top categories
  const catMap = new Map();
  for (const t of txs) {
    const catName = t.categories?.name || 'Sin categoría';
    const catColor = t.categories?.color || '#9ca3af';
    const existing = catMap.get(catName) || { name: catName, color: catColor, total: 0, count: 0 };
    existing.total += t.amount;
    existing.count += 1;
    catMap.set(catName, existing);
  }
  const topCategories = [...catMap.values()].sort((a, b) => b.total - a.total);

  const biggestExpense = txs.reduce((max, t) => t.amount > max.amount ? t : max, txs[0]);
  const userName = 'Catt';

  const html = generateReportHTML({
    userName, periodLabel, totalSpent, transactionCount: txs.length,
    topCategories, avgPerDay, avgPerTransaction,
    biggestExpense: { name: biggestExpense.name, amount: biggestExpense.amount },
    previousPeriodTotal,
    recentTransactions: txs.slice(0, 5),
    categoriesCount: catMap.size,
  });

  // Send via Resend
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Cattia Gastos <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `📊 ${periodLabel}`,
      html,
    }),
  });

  return { ok: resendRes.ok, email: recipientEmail, subject: periodLabel, txCount: txs.length, debug: debugInfo };
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

    // Check if this is a manual test (force_user_id in body)
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

      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', forceUserId)
        .maybeSingle();

      const frequency = settings?.report_frequency || 'weekly';
      const email = recipientEmail || user.email;
      const result = await buildAndSendReport(supabase, user, email, frequency, true);

      if (!result) {
        return new Response(JSON.stringify({ success: true, message: 'Sin transacciones en este periodo' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: result.ok,
        message: `Reporte enviado a ${result.email}`,
        subject: result.subject,
        debug: result.debug || null,
        txCount: result.txCount ?? null,
        txError: result.txError || null,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── MODE 2: Cron — process all qualifying users ───
    const { data: allSettings } = await supabase
      .from('user_settings')
      .select('user_id, report_frequency')
      .eq('email_reports_enabled', true);

    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with reports enabled', sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    for (const setting of allSettings) {
      const { data: { user } } = await supabase.auth.admin.getUserById(setting.user_id);
      if (!user) continue;

      const email = recipientEmail || user.email;
      const frequency = setting.report_frequency || 'weekly';
      const result = await buildAndSendReport(supabase, user, email, frequency, false);
      if (result) results.push(result);
    }

    return new Response(JSON.stringify({
      message: `Processed ${allSettings.length} users`,
      sent: results.filter(r => r.ok).length,
      results,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
