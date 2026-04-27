// @ts-nocheck
// Supabase Edge Function: telegram-webhook
// Telegram → Bot transport. Reuses _shared/conversation.ts for the actual brain.
//
// Security:
//   - Validates Telegram's secret token header (set when registering the webhook).
//   - Whitelists chat_ids via TELEGRAM_OWNER_CHAT_ID (comma-separated for multiple).
//
// Modes:
//   - message: text from user → conversation core → reply (with inline keyboard if pending).
//   - callback_query: button click on a pending expense → confirm / edit / reject.
//   - /start, /reset → wipe session + greet. /help → usage tips.
//
// Always returns 200 OK to Telegram (even on internal errors) to prevent
// Telegram from retrying the same update repeatedly.
//
// Deploy:
//   supabase functions deploy telegram-webhook --no-verify-jwt
// Secrets:
//   OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_OWNER_CHAT_ID

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  processMessage, executeExpense,
  fetchCategoriesCached, fetchPaymentMethodsCached,
} from '../_shared/conversation.ts';
import { loadSession, saveSession, resetSession } from '../_shared/sessions.ts';
import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  sendChatAction,
  pendingExpenseKeyboard,
} from '../_shared/telegram-api.ts';

// ─── env ────────────────────────────────────────────────────────────────
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const TG_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TG_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
const TG_OWNER_RAW = Deno.env.get('TELEGRAM_OWNER_CHAT_ID') ?? '';

// Comma-separated whitelist. Strings to match Telegram chat_ids portably.
const TG_OWNERS = TG_OWNER_RAW.split(',').map(s => s.trim()).filter(Boolean);

// ─── helpers ────────────────────────────────────────────────────────────
const CHANNEL = 'telegram' as const;

const GREETING = '¡Hola! Soy Cattia 🐱 — tu asistente de gastos. Dime qué gastaste y lo registro. Ej: "gasté 30 en almuerzo con yape". También puedo decirte cuánto llevas ("cuánto gasté este mes").';

const HELP = `Cómo usarme:
• Registrar: "gasté 30 en almuerzo con yape"
• Consultar: "cuánto gasté este mes", "qué día gasté más", "promedio diario"
• Comparar: "comida vs transporte", "este mes vs el pasado"
Comandos:
/start  — reiniciar conversación
/reset  — limpiar historial
/help   — ver esta ayuda`;

function isAuthorized(chatId: number | string): boolean {
  if (TG_OWNERS.length === 0) return false; // fail closed if not configured
  return TG_OWNERS.includes(String(chatId));
}

function pendingSummaryText(p): string {
  const lines = [
    `📋 ${p.name}`,
    `💰 S/${p.amount}`,
    p.category_name ? `🏷️ ${p.category_name}` : null,
    p.payment_method_name ? `💳 ${p.payment_method_name}` : null,
    `📅 ${p.date}`,
  ].filter(Boolean).join('\n');
  return `¿Registro este gasto?\n\n${lines}`;
}

function pendingToDraft(p): string {
  const parts: string[] = [p.name, `${p.amount} soles`];
  if (p.payment_method_name) parts.push(`con ${p.payment_method_name}`);
  if (p.category_name) parts.push(p.category_name);
  return parts.join(' ');
}

// ─── handlers ───────────────────────────────────────────────────────────

async function handleMessage(supabase, msg): Promise<void> {
  const chatId = msg.chat.id;
  if (!isAuthorized(chatId)) return; // silent drop

  const text: string = msg.text ?? '';
  if (!text) return;

  // Commands.
  if (text === '/start' || text === '/reset') {
    await resetSession(supabase, CHANNEL, String(chatId));
    await sendMessage(TG_TOKEN, chatId, text === '/start' ? GREETING : 'Listo, conversación limpia. ¿Algo más?');
    return;
  }
  if (text === '/help') {
    await sendMessage(TG_TOKEN, chatId, HELP);
    return;
  }

  // Typing indicator while we work.
  sendChatAction(TG_TOKEN, chatId, 'typing').catch(() => { /* non-fatal */ });

  // Load session, drop any prior pending (typing implicitly cancels it).
  const session = await loadSession(supabase, CHANNEL, String(chatId));
  session.pending_expense = null;
  session.messages = [...session.messages, { role: 'user', content: text }];

  const reply = await processMessage(session.messages, supabase);

  if (reply.type === 'error') {
    await sendMessage(TG_TOKEN, chatId, `⚠️ ${reply.content}`);
    await saveSession(supabase, session);
    return;
  }

  if (reply.type === 'confirm') {
    session.pending_expense = reply.expense;
    await saveSession(supabase, session);
    const [cats, pms] = await Promise.all([
      fetchCategoriesCached(supabase),
      fetchPaymentMethodsCached(supabase),
    ]);
    await sendMessage(TG_TOKEN, chatId, pendingSummaryText(reply.expense), {
      reply_markup: pendingExpenseKeyboard(
        'default',
        reply.expense.category_id,
        reply.expense.payment_method_id,
        cats,
        pms,
      ),
    });
    return;
  }

  // type === 'message'
  session.messages = [...session.messages, { role: 'assistant', content: reply.content }];
  await saveSession(supabase, session);
  await sendMessage(TG_TOKEN, chatId, reply.content);
}

async function handleCallbackQuery(supabase, cq): Promise<void> {
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  if (!chatId || !messageId) return;
  if (!isAuthorized(chatId)) {
    await answerCallbackQuery(TG_TOKEN, cq.id);
    return;
  }

  const action: string = cq.data ?? ''; // 'confirm' | 'edit' | 'reject' | 'cat:<id>' | 'pm:<id>'
  const session = await loadSession(supabase, CHANNEL, String(chatId));
  const pending = session.pending_expense;

  // No live pending → button is stale.
  if (!pending) {
    await answerCallbackQuery(TG_TOKEN, cq.id, 'Acción ya expirada');
    await editMessageText(TG_TOKEN, chatId, messageId, '(acción expirada)');
    return;
  }

  // View switch: open category picker, payment picker, or back to default.
  if (action.startsWith('view:')) {
    const targetView = action.slice('view:'.length) as 'default' | 'cats' | 'pms';
    if (targetView !== 'default' && targetView !== 'cats' && targetView !== 'pms') {
      await answerCallbackQuery(TG_TOKEN, cq.id);
      return;
    }
    const [cats, pms] = await Promise.all([
      fetchCategoriesCached(supabase),
      fetchPaymentMethodsCached(supabase),
    ]);
    await answerCallbackQuery(TG_TOKEN, cq.id);
    try {
      await editMessageText(TG_TOKEN, chatId, messageId, pendingSummaryText(pending), {
        reply_markup: pendingExpenseKeyboard(
          targetView,
          pending.category_id,
          pending.payment_method_id,
          cats,
          pms,
        ),
      });
    } catch (err) {
      if (!String(err?.message ?? '').includes('not modified')) throw err;
    }
    return;
  }

  // Quick-swap: category or payment method. After picking, return to default view.
  if (action.startsWith('cat:') || action.startsWith('pm:')) {
    const [kind, idStr] = action.split(':');
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      await answerCallbackQuery(TG_TOKEN, cq.id);
      return;
    }
    const [cats, pms] = await Promise.all([
      fetchCategoriesCached(supabase),
      fetchPaymentMethodsCached(supabase),
    ]);

    let changed = false;
    if (kind === 'cat') {
      const cat = cats.find(c => c.id === id);
      if (cat && cat.id !== pending.category_id) {
        pending.category_id = cat.id;
        pending.category_name = cat.name;
        changed = true;
      }
    } else {
      const pm = pms.find(p => p.id === id);
      if (pm && pm.id !== pending.payment_method_id) {
        pending.payment_method_id = pm.id;
        pending.payment_method_name = pm.name;
        changed = true;
      }
    }

    if (changed) {
      session.pending_expense = pending;
      await saveSession(supabase, session);
    }
    await answerCallbackQuery(TG_TOKEN, cq.id);

    // Always return to default view (user picked, cleaner UX than staying in picker).
    try {
      await editMessageText(TG_TOKEN, chatId, messageId, pendingSummaryText(pending), {
        reply_markup: pendingExpenseKeyboard(
          'default',
          pending.category_id,
          pending.payment_method_id,
          cats,
          pms,
        ),
      });
    } catch (err) {
      if (!String(err?.message ?? '').includes('not modified')) throw err;
    }
    return;
  }

  if (action === 'confirm') {
    try {
      const ack = await executeExpense(pending, supabase);
      session.pending_expense = null;
      session.messages = [...session.messages, { role: 'assistant', content: ack }];
      await saveSession(supabase, session);
      await answerCallbackQuery(TG_TOKEN, cq.id, '✅ Registrado');
      await editMessageText(TG_TOKEN, chatId, messageId, ack);
    } catch (err) {
      await answerCallbackQuery(TG_TOKEN, cq.id, 'Error al guardar');
      await editMessageText(TG_TOKEN, chatId, messageId, `⚠️ Error al guardar: ${err.message}`);
    }
    return;
  }

  if (action === 'edit') {
    const draft = pendingToDraft(pending);
    session.pending_expense = null;
    await saveSession(supabase, session);
    await answerCallbackQuery(TG_TOKEN, cq.id, 'Reescríbelo');
    await editMessageText(
      TG_TOKEN,
      chatId,
      messageId,
      `${pendingSummaryText(pending)}\n\n✎ Reenvíame el gasto corregido. Por ejemplo:\n${draft}`,
    );
    return;
  }

  if (action === 'reject') {
    session.pending_expense = null;
    session.messages = [...session.messages, { role: 'assistant', content: 'Ok, cancelado.' }];
    await saveSession(supabase, session);
    await answerCallbackQuery(TG_TOKEN, cq.id, 'Cancelado');
    await editMessageText(TG_TOKEN, chatId, messageId, '✗ Cancelado.');
    return;
  }

  await answerCallbackQuery(TG_TOKEN, cq.id);
}

// ─── server ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Telegram only POSTs. Anything else is a probe — say hi briefly.
  if (req.method !== 'POST') {
    return new Response('telegram-webhook ok', { status: 200 });
  }

  // Validate secret. Reject silently with 200 so probes don't get info.
  const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!TG_SECRET || headerSecret !== TG_SECRET) {
    return new Response('ok', { status: 200 });
  }

  // Required env.
  if (!OPENAI_API_KEY || !SUPABASE_SERVICE_ROLE_KEY || !TG_TOKEN) {
    console.error('[telegram-webhook] missing env (OPENAI_API_KEY / SUPABASE_SERVICE_ROLE_KEY / TELEGRAM_BOT_TOKEN)');
    return new Response('ok', { status: 200 });
  }

  let update;
  try {
    update = await req.json();
  } catch {
    return new Response('ok', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (update.message) {
      await handleMessage(supabase, update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(supabase, update.callback_query);
    }
    // Other update types (edited_message, etc.) → ignored.
  } catch (err) {
    console.error('[telegram-webhook] error:', err.message, err.stack);
    // Best-effort user-facing error if we know the chat.
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    if (chatId && isAuthorized(chatId) && TG_TOKEN) {
      try { await sendMessage(TG_TOKEN, chatId, '⚠️ Algo falló. Intenta de nuevo.'); } catch { /* ignore */ }
    }
  }

  // Always 200 OK so Telegram doesn't retry.
  return new Response('ok', { status: 200 });
});
