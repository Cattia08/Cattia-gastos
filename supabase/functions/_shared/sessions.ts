// @ts-nocheck
// Persistent conversation sessions for stateless channels (Telegram, WhatsApp).
// Web channel does NOT use this — it keeps state in the client.
//
// Backed by the `chat_sessions` table (PRIMARY KEY: channel + external_user_id).

import type { ChatMessage, PendingExpense } from './conversation.ts';

export type Channel = 'telegram' | 'whatsapp';

export interface ChatSession {
  channel: Channel;
  external_user_id: string;
  messages: ChatMessage[];
  pending_expense: PendingExpense | null;
  last_inserted_id: number | null;
}

const TABLE = 'chat_sessions';

/**
 * Load (or initialize empty) the session for a channel/external_user pair.
 * Never throws on "not found" — returns an empty session so the caller
 * can append the first user message and save.
 */
export async function loadSession(
  supabase,
  channel: Channel,
  externalUserId: string,
): Promise<ChatSession> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('messages, pending_expense, last_inserted_id')
    .eq('channel', channel)
    .eq('external_user_id', externalUserId)
    .maybeSingle();

  if (error) throw new Error(`session load: ${error.message}`);

  return {
    channel,
    external_user_id: externalUserId,
    messages: (data?.messages ?? []) as ChatMessage[],
    pending_expense: (data?.pending_expense ?? null) as PendingExpense | null,
    last_inserted_id: (data?.last_inserted_id ?? null) as number | null,
  };
}

/**
 * Upsert the session. Use this after every conversational turn.
 */
export async function saveSession(supabase, session: ChatSession): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(
    {
      channel: session.channel,
      external_user_id: session.external_user_id,
      messages: session.messages,
      pending_expense: session.pending_expense,
      last_inserted_id: session.last_inserted_id,
    },
    { onConflict: 'channel,external_user_id' },
  );
  if (error) throw new Error(`session save: ${error.message}`);
}

/**
 * Wipe conversation + pending for a session, keeping the row.
 */
export async function resetSession(
  supabase,
  channel: Channel,
  externalUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        channel,
        external_user_id: externalUserId,
        messages: [],
        pending_expense: null,
      },
      { onConflict: 'channel,external_user_id' },
    );
  if (error) throw new Error(`session reset: ${error.message}`);
}
