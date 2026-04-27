// @ts-nocheck
// Supabase Edge Function: chat-assistant
// Web channel wrapper around _shared/conversation.ts. Stateless:
// the client owns the conversation history and pending expense.
//
// Modes:
//   POST { messages }                       → process user turn
//   POST { action: 'execute', expense }     → insert confirmed expense
//
// Response:
//   { type: 'confirm', expense }            (model proposed an expense)
//   { type: 'message', content }            (assistant text reply or insert ack)
//   { type: 'error',   content }            (something went wrong)
//
// Deploy: supabase functions deploy chat-assistant
// Secrets needed: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processMessage, executeExpense } from '../_shared/conversation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) return json({ type: 'error', content: 'OPENAI_API_KEY no configurada.' }, 500);
    if (!SUPABASE_SERVICE_ROLE_KEY) return json({ type: 'error', content: 'SUPABASE_SERVICE_ROLE_KEY missing.' }, 500);

    const body = await req.json();
    const { messages, action, expense } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === 'execute' && expense) {
      const content = await executeExpense(expense, supabase);
      return json({ type: 'message', content });
    }

    if (!Array.isArray(messages)) return json({ type: 'error', content: 'messages requerido' }, 400);

    const reply = await processMessage(messages, supabase);
    return json(reply);

  } catch (err) {
    console.error('[chat-assistant] error:', err.message, err.stack);
    return json({ type: 'error', content: err.message }, 500);
  }
});
