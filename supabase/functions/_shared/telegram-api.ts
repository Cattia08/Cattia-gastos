// @ts-nocheck
// Thin wrappers over the Telegram Bot HTTP API.
// Pure transport — no business logic. Lets the webhook handler stay readable.
//
// Reference: https://core.telegram.org/bots/api

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export interface InlineButton {
  text: string;
  callback_data: string;
}

export type InlineKeyboard = InlineButton[][];

export interface SendOptions {
  reply_markup?: { inline_keyboard: InlineKeyboard };
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disable_notification?: boolean;
}

async function tgRequest(token: string, method: string, payload: object): Promise<any> {
  const res = await fetch(`${TELEGRAM_API_BASE}${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? 'unknown error'} (code ${data.error_code ?? '?'})`);
  }
  return data.result;
}

export function sendMessage(
  token: string,
  chatId: number | string,
  text: string,
  options: SendOptions = {},
): Promise<any> {
  return tgRequest(token, 'sendMessage', { chat_id: chatId, text, ...options });
}

export function editMessageText(
  token: string,
  chatId: number | string,
  messageId: number,
  text: string,
  options: SendOptions = {},
): Promise<any> {
  return tgRequest(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...options,
  });
}

export function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string,
): Promise<any> {
  return tgRequest(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export function sendChatAction(
  token: string,
  chatId: number | string,
  action: 'typing' | 'upload_photo' = 'typing',
): Promise<any> {
  return tgRequest(token, 'sendChatAction', { chat_id: chatId, action });
}

interface NamedRow { id: number; name: string }

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type PendingKeyboardView = 'default' | 'cats' | 'pms';

/**
 * Keyboard for the pending-expense message. Three views switched by callbacks:
 *
 *   'default' — compact: action row + 2 expand triggers.
 *   'cats'    — category picker: pills + back.
 *   'pms'     — payment-method picker: pills + back.
 *
 * callback_data conventions:
 *   confirm | edit | reject              → action
 *   view:default | view:cats | view:pms  → switch view
 *   cat:<id>                             → pick category (then back to default)
 *   pm:<id>                              → pick payment method (then back to default)
 *
 * Selected option in pickers gets a leading "•".
 */
export function pendingExpenseKeyboard(
  view: PendingKeyboardView,
  selectedCategoryId: number | null,
  selectedPaymentMethodId: number | null,
  categories: NamedRow[],
  paymentMethods: NamedRow[],
  perRow = 3,
): { inline_keyboard: InlineKeyboard } {
  if (view === 'cats') {
    const buttons: InlineButton[] = categories.map(c => ({
      text: c.id === selectedCategoryId ? `• ${c.name}` : c.name,
      callback_data: `cat:${c.id}`,
    }));
    const rows = chunk(buttons, perRow);
    rows.push([{ text: '↩ Volver', callback_data: 'view:default' }]);
    return { inline_keyboard: rows };
  }

  if (view === 'pms') {
    const buttons: InlineButton[] = paymentMethods.map(p => ({
      text: p.id === selectedPaymentMethodId ? `• ${p.name}` : p.name,
      callback_data: `pm:${p.id}`,
    }));
    const rows = chunk(buttons, perRow);
    rows.push([{ text: '↩ Volver', callback_data: 'view:default' }]);
    return { inline_keyboard: rows };
  }

  // default
  const rows: InlineKeyboard = [
    [
      { text: '✅ Sí', callback_data: 'confirm' },
      { text: '✎ Editar', callback_data: 'edit' },
      { text: '✗ Cancelar', callback_data: 'reject' },
    ],
  ];
  if (categories.length > 0) {
    rows.push([{ text: '🏷️ Cambiar categoría', callback_data: 'view:cats' }]);
  }
  if (paymentMethods.length > 0) {
    rows.push([{ text: '💳 Cambiar método', callback_data: 'view:pms' }]);
  }
  return { inline_keyboard: rows };
}
