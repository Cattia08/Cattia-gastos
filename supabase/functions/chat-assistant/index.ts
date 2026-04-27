// @ts-nocheck
// Supabase Edge Function: chat-assistant
// Handles conversational expense registration via OpenAI function calling.
// Two modes:
//   POST { messages } → sends to OpenAI, returns { type: 'confirm', expense } or { type: 'message', content }
//   POST { action: 'execute', expense } → inserts directly after user confirmation
//
// Deploy: supabase functions deploy chat-assistant
// Secret needed: OPENAI_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Eres el asistente de gastos de esta app. Registras gastos con propose_expense en el menor número de turnos posible.

OBJETIVO: nombre + monto + categoría → llama a propose_expense. Sin rodeos.

NOMBRE: sustantivo limpio, minúsculas, sin artículos ni adjetivos.

CATEGORÍA: infiere agresivamente. Si existe alguna categoría que encaje razonablemente, úsala y propón. Solo pregunta cuando el gasto sea genuinamente imposible de categorizar (ni con el contexto de la conversación).

MONTO: acepta lo que el usuario dice. Solo cuestiona si parece un typo absurdo (ej: millones para algo cotidiano). Compras grandes como motos, electrónicos, renta → acepta directamente.

MÉTODO DE PAGO: si el contexto incluye una lista de métodos, es porque el usuario ya lo mencionó — úsala para hacer match. Si no hay lista, no hay método de pago y no lo menciones.

FECHA: hoy por defecto. YYYY-MM-DD.

TONO: natural, español peruano, respuestas cortas. Una reacción genuina si vale la pena, nunca forzada.`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    console.log('[chat-assistant] request received', req.method);

    if (!OPENAI_API_KEY) {
      console.error('[chat-assistant] OPENAI_API_KEY missing');
      return json({ type: 'error', content: 'OPENAI_API_KEY no configurada en Supabase secrets.' }, 500);
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[chat-assistant] SUPABASE_SERVICE_ROLE_KEY missing');
      return json({ type: 'error', content: 'SUPABASE_SERVICE_ROLE_KEY missing.' }, 500);
    }

    const body = await req.json();
    const { messages, action, expense } = body;
    console.log('[chat-assistant] mode:', action ?? 'chat', '| messages count:', messages?.length ?? 0);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── MODE: direct insert after user confirmation ──
    if (action === 'execute' && expense) {
      const { error } = await supabase.from('transactions').insert([{
        name: expense.name,
        amount: Number(expense.amount),
        category_id: expense.category_id ?? null,
        payment_method_id: expense.payment_method_id ?? null,
        date: expense.date,
      }]);

      if (error) throw new Error(error.message);

      const methodPart = expense.payment_method_name ? ` · ${expense.payment_method_name}` : '';
      const catPart = expense.category_name ? ` · ${expense.category_name}` : '';
      return json({
        type: 'message',
        content: `✅ Listo! Registré **${expense.name}** — S/${expense.amount}${catPart}${methodPart}`,
      });
    }

    // ── MODE: OpenAI conversation ──
    if (!messages || !Array.isArray(messages)) return json({ type: 'error', content: 'messages requerido' }, 400);

    const today = new Date().toISOString().split('T')[0];

    // Detect if the user mentioned a payment method — only then fetch and include them.
    // This prevents the model from being tempted to ask about payment when it sees the list.
    const PAYMENT_KEYWORDS = ['tarjeta', 'efectivo', 'yape', 'plin', 'bcp', 'interbank', 'scotiabank', 'bbva', 'débito', 'debito', 'crédito', 'credito', 'visa', 'mastercard', 'pagué con', 'pague con'];
    const userText = messages.map((m: { role: string; content: string }) => m.content?.toLowerCase() ?? '').join(' ');
    const mentionsPayment = PAYMENT_KEYWORDS.some(k => userText.includes(k));

    const queries: Promise<{ data: unknown[] | null }>[] = [
      supabase.from('categories').select('id, name'),
      ...(mentionsPayment ? [supabase.from('payment_methods').select('id, name')] : []),
    ];
    const [{ data: categories }, paymentResult] = await Promise.all(queries);
    const paymentMethods = mentionsPayment ? (paymentResult as { data: unknown[] | null })?.data : null;

    const systemContext = [
      `Fecha de hoy: ${today}`,
      `Categorías disponibles: ${JSON.stringify(categories ?? [])}`,
      mentionsPayment ? `Métodos de pago disponibles: ${JSON.stringify(paymentMethods ?? [])}` : null,
    ].filter(Boolean).join('\n');

    const systemMessage = {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n${systemContext}`,
    };

    const tools = [{
      type: 'function',
      function: {
        name: 'propose_expense',
        description: 'Propone un gasto al usuario para que confirme antes de registrarlo. Llama a esta función cuando tengas al menos nombre y monto.',
        parameters: {
          type: 'object',
          required: ['name', 'amount', 'date'],
          properties: {
            name: { type: 'string', description: 'Descripción corta del gasto' },
            amount: { type: 'number', description: 'Monto en soles' },
            category_id: { type: 'number', description: 'ID de la categoría' },
            category_name: { type: 'string', description: 'Nombre legible de la categoría' },
            payment_method_id: { type: 'number', description: 'ID del método de pago' },
            payment_method_name: { type: 'string', description: 'Nombre legible del método de pago' },
            date: { type: 'string', description: 'Fecha YYYY-MM-DD' },
          },
        },
      },
    }];

    console.log('[chat-assistant] calling OpenAI, categories:', categories?.length, 'methods:', paymentMethods?.length);
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [systemMessage, ...messages],
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error('[chat-assistant] OpenAI error status:', openaiRes.status, err);
      throw new Error(`OpenAI ${openaiRes.status}: ${err}`);
    }

    const openaiData = await openaiRes.json();
    const choice = openaiData.choices?.[0];
    if (!choice) throw new Error('Respuesta vacía de OpenAI');

    // OpenAI decided to propose an expense
    if (choice.finish_reason === 'tool_calls') {
      const toolCall = choice.message.tool_calls?.[0];
      if (!toolCall) throw new Error('tool_calls vacío');

      const args = JSON.parse(toolCall.function.arguments);
      return json({
        type: 'confirm',
        expense: {
          name: args.name,
          amount: args.amount,
          category_id: args.category_id ?? null,
          category_name: args.category_name ?? null,
          payment_method_id: args.payment_method_id ?? null,
          payment_method_name: args.payment_method_name ?? null,
          date: args.date ?? today,
        },
      });
    }

    // Regular assistant message
    return json({ type: 'message', content: choice.message.content });

  } catch (err) {
    console.error('[chat-assistant] unhandled error:', err.message, err.stack);
    return json({ type: 'error', content: err.message }, 500);
  }
});
