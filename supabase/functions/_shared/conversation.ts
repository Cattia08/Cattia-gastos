// @ts-nocheck
// Channel-agnostic conversation core for the Cattia chatbot.
// Used by chat-assistant (web) today; will be reused by Telegram/WhatsApp later.
// Stateless: caller provides the conversation history, we return a reply.

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// ─────────────────────────────────────────────────────────────────────────
// Prompts & constants
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el asistente de gastos de esta app. Trabajas siempre en soles peruanos (PEN).

Tienes dos herramientas:
1. propose_expense → cuando el usuario te dice un gasto que quiere registrar.
2. query_expenses  → cuando el usuario pregunta cuánto gastó, totales, desgloses, top categorías, etc.

REGISTRAR GASTO (propose_expense):
- Objetivo: nombre + monto + categoría → llama propose_expense en el menor número de turnos.
- NOMBRE: sustantivo limpio, minúsculas, sin artículos ni adjetivos.
- CATEGORÍA: infiere agresivamente. Si alguna encaja razonablemente, úsala. Solo pregunta cuando sea genuinamente imposible categorizar.
- MONTO: siempre soles. Acepta lo que diga el usuario. Solo cuestiona si parece un typo absurdo. Compras grandes (motos, electrónicos, renta) → acepta directo. Si menciona dólares u otra moneda → responde que solo registramos soles y pide monto en S/.
- MÉTODO DE PAGO: solo si el contexto incluye una lista de métodos. Si no hay lista, no menciones método de pago.
- FECHA: hoy por defecto. "ayer", "anteayer", "lunes pasado" → conviértelos a YYYY-MM-DD relativo a la fecha de hoy del contexto.

CONSULTAR GASTOS (query_expenses):
- Llama esta herramienta para cualquier pregunta sobre gastos pasados: totales, desgloses, históricos, top categorías/días/meses, gastos por método de pago, búsqueda por nombre, rangos custom, etc.

PERÍODO:
- Si el usuario menciona un rango "natural" → usa "period": today, yesterday, this_week, last_week, this_month, last_month, this_year, last_year.
- Si el usuario pregunta sobre "todos los años", "histórico", "en qué año gasté más", "siempre" → period="all_time" (consulta TODO sin filtro de fecha).
- Si el usuario menciona un mes+año específico (ej: "marzo 2026") → usa start_date="2026-03-01" end_date="2026-03-31".
- Si el usuario menciona un rango custom (ej: "del 5 al 15 de marzo", "entre el 1 y 10") → start_date + end_date en YYYY-MM-DD.
- Cuando uses start_date/end_date, NO pongas period (o ponlo igualmente: start/end ganan).

FILTROS:
- category_name: una categoría. Match parcial. (ej: "cuánto en comida" → "Comida")
- category_names: array de categorías para combinar/comparar (ej: ["Comida","Transporte"]). Si lo usas, ignora category_name.
- payment_method_name: método de pago (ej: "BCP crédito" matchea solo crédito; "BCP" matchea débito + crédito).
- name_contains: palabra en el nombre del gasto (ej: "almuerzo" matchea "almuerzo chifa", "almuerzo trabajo").
- min_amount / max_amount: filtra por rango de monto S/ (ej: "gastos sobre 100" → min_amount=100; "entre 20 y 50" → min=20 max=50).

AGREGADOS (siempre vienen en el resultado):
- total = suma; count = cantidad; average = promedio por gasto; min = gasto más barato (con nombre+fecha); max = gasto más caro.
- Si user pregunta "promedio" → usa average. "más caro" → max. "más barato" → min. NO necesitas un parámetro extra; siempre están.

AGRUPACIÓN (group_by):
- 'category' / 'payment_method' / 'day' / 'month' / 'quarter' / 'year' / 'none'.
- top_n: 1 = "el mayor"; 3-5 = ranking; 12 = "todos los meses del año".
- Cada grupo trae total, count y average — úsalos según corresponda.

COMPARACIÓN / MULTI-STEP:
- Para comparar 2 categorías directas: pasa category_names=["A","B"] + group_by="category". UN solo tool call.
- Para comparar dos períodos (ej: "este mes vs el pasado"): haz DOS llamadas seguidas a query_expenses (period=this_month, luego period=last_month). Después responde con la diferencia.
- Tienes hasta 3 tool calls antes de tener que responder. Úsalas solo si la pregunta lo requiere; consultas simples van con UNO.

EJEMPLOS:
- "en qué año gasto más" → { period: "all_time", group_by: "year", top_n: 1 }
- "promedio diario este mes" → { period: "this_month" } → usa average del resultado.
- "gasto más caro este año" → { period: "this_year" } → usa max.
- "gastos sobre 100 soles" → { period: "this_month", min_amount: 100 }
- "comida vs transporte este mes" → { period: "this_month", category_names: ["Comida","Transporte"], group_by: "category" }
- "este mes vs el pasado" → 2 calls: { period: "this_month" } y { period: "last_month" }, luego comparas.

RESPUESTA:
- Recibido el resultado, resume en lenguaje natural y conciso. Una o dos frases. Si hay desglose, lista en orden decreciente con S/ y la dimensión correspondiente.
- Para días: "DD de mes" (ej: "12 de marzo"). Para meses: "marzo 2026".
- Nunca inventes números. Si el resultado viene vacío o el filtro no matcheó (error: "*_not_found"), dilo amablemente y sugiere alternativa.

TONO: natural, español peruano, respuestas cortas. Una reacción genuina si vale la pena, nunca forzada.`;

const PAYMENT_KEYWORDS = [
  'tarjeta', 'efectivo', 'cash', 'yape', 'plin',
  'bcp', 'interbank', 'ibk', 'scotiabank', 'scotia', 'bbva', 'continental', 'banbif', 'pichincha',
  'débito', 'debito', 'crédito', 'credito',
  'visa', 'mastercard', 'amex', 'cmr', 'oh!', 'ripley',
  'pagué con', 'pague con', 'pagado con', 'pagué en', 'pague en',
  'transferencia', 'transferi', 'transferí',
  'cuenta',
];

const HISTORY_WINDOW = 10;             // last N messages sent to OpenAI
const CATEGORIES_TTL_MS = 5 * 60_000;  // 5 min in-memory cache
const MAX_TOOL_HOPS = 4;               // up to 3 tool calls before forcing text reply

// ─────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────

const TOOL_PROPOSE = {
  type: 'function',
  function: {
    name: 'propose_expense',
    description: 'Propone un gasto al usuario para que confirme antes de registrarlo. Llama a esta función cuando tengas al menos nombre y monto.',
    parameters: {
      type: 'object',
      required: ['name', 'amount', 'date'],
      properties: {
        name: { type: 'string', description: 'Descripción corta del gasto' },
        amount: { type: 'number', description: 'Monto en soles peruanos (PEN)' },
        category_id: { type: 'number', description: 'ID de la categoría' },
        category_name: { type: 'string', description: 'Nombre legible de la categoría' },
        payment_method_id: { type: 'number', description: 'ID del método de pago' },
        payment_method_name: { type: 'string', description: 'Nombre legible del método de pago' },
        date: { type: 'string', description: 'Fecha YYYY-MM-DD' },
      },
    },
  },
};

const TOOL_QUERY = {
  type: 'function',
  function: {
    name: 'query_expenses',
    description: 'Consulta los gastos registrados. Úsala para totales, desgloses, históricos, búsquedas por nombre/método/categoría, y rangos custom.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_year', 'last_year', 'all_time'],
          description: 'Rango temporal predefinido. Usa "all_time" para consultar TODO el historial sin filtro de fecha (preguntas como "en qué año gasté más", "histórico total"). Default this_month.',
        },
        start_date: {
          type: 'string',
          description: 'Fecha inicio YYYY-MM-DD. Si se da junto a end_date, sobrescribe period. Úsala para meses específicos o rangos custom.',
        },
        end_date: {
          type: 'string',
          description: 'Fecha fin YYYY-MM-DD inclusive.',
        },
        category_name: {
          type: 'string',
          description: 'Filtra por una categoría. Match parcial case-insensitive.',
        },
        category_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filtra por varias categorías a la vez (OR). Útil para comparar (ej: ["Comida","Transporte"]). Si pasas esto, ignora category_name.',
        },
        payment_method_name: {
          type: 'string',
          description: 'Filtra por método de pago. Match parcial case-insensitive (ej: "BCP" matchea "BCP Crédito" y "BCP Débito").',
        },
        name_contains: {
          type: 'string',
          description: 'Busca por palabra en el nombre del gasto (ej: "almuerzo" matchea "almuerzo chifa").',
        },
        min_amount: {
          type: 'number',
          description: 'Filtra gastos con monto >= a este valor (S/).',
        },
        max_amount: {
          type: 'number',
          description: 'Filtra gastos con monto <= a este valor (S/).',
        },
        group_by: {
          type: 'string',
          enum: ['none', 'category', 'payment_method', 'day', 'month', 'quarter', 'year'],
          description: 'Agrupa el resultado. quarter → trimestre; year → año (combinar con period=all_time). Default: none.',
        },
        top_n: {
          type: 'number',
          description: 'Si se agrupa, top N resultados. Default 5, máx 100.',
        },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Caches & helpers
// ─────────────────────────────────────────────────────────────────────────

type NamedRow = { id: number; name: string };

let categoriesCache: { at: number; data: NamedRow[] } | null = null;
let paymentMethodsCache: { at: number; data: NamedRow[] } | null = null;

async function fetchCategoriesCached(supabase): Promise<NamedRow[]> {
  const now = Date.now();
  if (categoriesCache && now - categoriesCache.at < CATEGORIES_TTL_MS) return categoriesCache.data;
  const { data } = await supabase.from('categories').select('id, name');
  const fresh = (data ?? []) as NamedRow[];
  categoriesCache = { at: now, data: fresh };
  return fresh;
}

async function fetchPaymentMethodsCached(supabase): Promise<NamedRow[]> {
  const now = Date.now();
  if (paymentMethodsCache && now - paymentMethodsCache.at < CATEGORIES_TTL_MS) return paymentMethodsCache.data;
  const { data } = await supabase.from('payment_methods').select('id, name');
  const fresh = (data ?? []) as NamedRow[];
  paymentMethodsCache = { at: now, data: fresh };
  return fresh;
}

/**
 * Match a free-text query against a list of named rows.
 * Strategy: exact case-insensitive first, then contains-fallback.
 * Returns ids of all matches (caller decides eq vs in).
 */
function matchByName(items: NamedRow[], query: string): { ids: number[]; matched: NamedRow[] } {
  const q = query.toLowerCase().trim();
  if (!q) return { ids: [], matched: [] };
  const exact = items.filter(i => i.name.toLowerCase() === q);
  if (exact.length > 0) return { ids: exact.map(i => i.id), matched: exact };
  const contains = items.filter(i => i.name.toLowerCase().includes(q));
  return { ids: contains.map(i => i.id), matched: contains };
}

function userMentionsPayment(messages: { role: string; content: string }[]): boolean {
  const text = messages.map(m => (m.content ?? '').toLowerCase()).join(' ');
  return PAYMENT_KEYWORDS.some(k => text.includes(k));
}

function isValidDate(s: string): boolean {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Edge fns run in UTC. Anchor every "today" to America/Lima so periods like
// "today" or "this_month" don't shift after 7pm Peru time.
const LIMA_TZ = 'America/Lima';

function todayLimaISO(): string {
  // en-CA → YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: LIMA_TZ }).format(new Date());
}

function todayLimaDate(): Date {
  const [y, m, d] = todayLimaISO().split('-').map(Number);
  return new Date(y, m - 1, d);
}

interface PeriodRange { start: string; end: string; label: string; }

function resolvePeriod(period: string, today: Date): PeriodRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  switch (period) {
    case 'today':
      return { start: isoDate(today), end: isoDate(today), label: 'hoy' };
    case 'yesterday': {
      const x = new Date(y, m, d - 1);
      return { start: isoDate(x), end: isoDate(x), label: 'ayer' };
    }
    case 'this_week': {
      const dow = today.getDay() === 0 ? 7 : today.getDay(); // mon=1..sun=7
      const start = new Date(y, m, d - (dow - 1));
      return { start: isoDate(start), end: isoDate(today), label: 'esta semana' };
    }
    case 'last_week': {
      const dow = today.getDay() === 0 ? 7 : today.getDay();
      const startThis = new Date(y, m, d - (dow - 1));
      const startLast = new Date(y, m, startThis.getDate() - 7);
      const endLast = new Date(y, m, startThis.getDate() - 1);
      return { start: isoDate(startLast), end: isoDate(endLast), label: 'la semana pasada' };
    }
    case 'this_month': {
      const start = new Date(y, m, 1);
      return { start: isoDate(start), end: isoDate(today), label: 'este mes' };
    }
    case 'last_month': {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { start: isoDate(start), end: isoDate(end), label: 'el mes pasado' };
    }
    case 'this_year': {
      const start = new Date(y, 0, 1);
      return { start: isoDate(start), end: isoDate(today), label: 'este año' };
    }
    case 'last_year': {
      const start = new Date(y - 1, 0, 1);
      const end = new Date(y - 1, 11, 31);
      return { start: isoDate(start), end: isoDate(end), label: 'el año pasado' };
    }
    case 'all_time':
      // Sentinel: caller must skip the date filter when label is 'all_time'.
      return { start: '', end: '', label: 'todo el historial' };
    default:
      return { start: isoDate(today), end: isoDate(today), label: 'hoy' };
  }
}

/**
 * Detects whole-month or whole-year custom ranges and gives them a friendly label.
 * Otherwise falls back to "del YYYY-MM-DD al YYYY-MM-DD".
 */
function labelCustomRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  // Whole month: start = day 1, end = last day of same month
  if (sy === ey && sm === em && sd === 1) {
    const lastDay = new Date(ey, em, 0).getDate();
    if (ed === lastDay) {
      const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      return `${months[sm - 1]} ${sy}`;
    }
  }
  // Whole year
  if (sy === ey && sm === 1 && sd === 1 && em === 12 && ed === 31) {
    return `el año ${sy}`;
  }
  return `del ${start} al ${end}`;
}

async function callOpenAI(payload: object, retries = 2): Promise<any> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`OpenAI ${res.status}: ${await res.text()}`);
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    } catch (err) {
      lastErr = err as Error;
      if (attempt === retries) break;
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error('OpenAI request failed');
}

// ─────────────────────────────────────────────────────────────────────────
// Tool executors
// ─────────────────────────────────────────────────────────────────────────

interface QueryArgs {
  period?: string;
  start_date?: string;
  end_date?: string;
  category_name?: string;
  category_names?: string[];
  payment_method_name?: string;
  name_contains?: string;
  min_amount?: number;
  max_amount?: number;
  group_by?: 'none' | 'category' | 'payment_method' | 'day' | 'month' | 'quarter' | 'year';
  top_n?: number;
}

interface QueryResult {
  period_label: string;
  range: { start: string; end: string };
  total: number;
  count: number;
  average: number;
  min?: { amount: number; name: string; date: string } | null;
  max?: { amount: number; name: string; date: string } | null;
  filters?: {
    category?: string | null;
    payment_method?: string | null;
    name_contains?: string | null;
    min_amount?: number | null;
    max_amount?: number | null;
  };
  breakdown?: { name: string; total: number; count: number; average: number }[];
  recent?: { name: string; amount: number; date: string }[];
  error?: string;
}

async function executeQuery(args: QueryArgs, supabase): Promise<QueryResult | { error: string }> {
  const today = todayLimaDate();

  // Resolve range: explicit start_date+end_date wins over period.
  let range: PeriodRange;
  if (isValidDate(args.start_date ?? '') && isValidDate(args.end_date ?? '')) {
    range = {
      start: args.start_date!,
      end: args.end_date!,
      label: labelCustomRange(args.start_date!, args.end_date!),
    };
  } else {
    range = resolvePeriod(args.period ?? 'this_month', today);
  }

  let q = supabase
    .from('transactions')
    .select('id, name, amount, date, categories ( id, name ), payment_methods ( id, name )')
    .order('date', { ascending: false });

  // all_time uses empty start/end as a sentinel to skip date filtering.
  if (range.start && range.end) {
    q = q.gte('date', range.start).lte('date', range.end);
  }

  const filters: NonNullable<QueryResult['filters']> = {};

  // ── category filter (single OR multi) ──
  const requestedCats = args.category_names?.length
    ? args.category_names
    : (args.category_name ? [args.category_name] : []);

  if (requestedCats.length > 0) {
    const cats = await fetchCategoriesCached(supabase);
    const allIds: number[] = [];
    const allMatched: NamedRow[] = [];
    for (const name of requestedCats) {
      const m = matchByName(cats, name);
      allIds.push(...m.ids);
      allMatched.push(...m.matched);
    }
    const uniqueIds = [...new Set(allIds)];
    if (uniqueIds.length === 0) {
      return {
        period_label: range.label,
        range: { start: range.start, end: range.end },
        total: 0, count: 0, average: 0,
        filters: { category: requestedCats.join(' / ') },
        breakdown: [],
        error: `category_not_found:${requestedCats.join(',')}`,
      };
    }
    q = uniqueIds.length === 1 ? q.eq('category_id', uniqueIds[0]) : q.in('category_id', uniqueIds);
    const uniqueMatched = [...new Map(allMatched.map(c => [c.id, c])).values()];
    filters.category = uniqueMatched.map(c => c.name).join(' / ');
  }

  // ── payment_method filter ──
  if (args.payment_method_name) {
    const pms = await fetchPaymentMethodsCached(supabase);
    const m = matchByName(pms, args.payment_method_name);
    if (m.ids.length === 0) {
      return {
        period_label: range.label,
        range: { start: range.start, end: range.end },
        total: 0, count: 0,
        filters: { payment_method: args.payment_method_name },
        breakdown: [],
        error: `payment_method_not_found:${args.payment_method_name}`,
      };
    }
    q = m.ids.length === 1 ? q.eq('payment_method_id', m.ids[0]) : q.in('payment_method_id', m.ids);
    filters.payment_method = m.matched.map(p => p.name).join(' / ');
  }

  // ── name contains filter ──
  if (args.name_contains) {
    const term = args.name_contains.replace(/[%_]/g, ''); // strip LIKE wildcards
    if (term.length > 0) {
      q = q.ilike('name', `%${term}%`);
      filters.name_contains = term;
    }
  }

  // ── amount bounds ──
  if (typeof args.min_amount === 'number' && Number.isFinite(args.min_amount)) {
    q = q.gte('amount', args.min_amount);
    filters.min_amount = args.min_amount;
  }
  if (typeof args.max_amount === 'number' && Number.isFinite(args.max_amount)) {
    q = q.lte('amount', args.max_amount);
    filters.max_amount = args.max_amount;
  }

  const { data, error } = await q;
  if (error) return { error: error.message };

  const rows = (data ?? []) as Array<{
    id: number; name: string; amount: number | string; date: string;
    categories?: { id: number; name: string } | null;
    payment_methods?: { id: number; name: string } | null;
  }>;

  const total = rows.reduce((s, t) => s + Number(t.amount), 0);
  const count = rows.length;
  const average = count > 0 ? Math.round((total / count) * 100) / 100 : 0;

  let minRow: typeof rows[number] | null = null;
  let maxRow: typeof rows[number] | null = null;
  for (const r of rows) {
    const a = Number(r.amount);
    if (!minRow || a < Number(minRow.amount)) minRow = r;
    if (!maxRow || a > Number(maxRow.amount)) maxRow = r;
  }

  const result: QueryResult = {
    period_label: range.label,
    range: { start: range.start, end: range.end },
    total: Math.round(total * 100) / 100,
    count,
    average,
    min: minRow ? { amount: Number(minRow.amount), name: minRow.name, date: minRow.date } : null,
    max: maxRow ? { amount: Number(maxRow.amount), name: maxRow.name, date: maxRow.date } : null,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };

  const groupBy = args.group_by ?? 'none';
  const topN = Math.max(1, Math.min(args.top_n ?? 5, 100));

  const keyOf: Record<string, (r: typeof rows[number]) => string> = {
    category: r => r.categories?.name ?? 'Sin categoría',
    payment_method: r => r.payment_methods?.name ?? 'Sin método',
    day: r => r.date,                // YYYY-MM-DD
    month: r => r.date.slice(0, 7),  // YYYY-MM
    year: r => r.date.slice(0, 4),   // YYYY
    quarter: r => {
      const [yr, mo] = r.date.split('-').map(Number);
      return `${yr}-Q${Math.ceil(mo / 3)}`;
    },
  };

  if (groupBy in keyOf) {
    const getKey = keyOf[groupBy];
    const map = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      const key = getKey(r);
      const cur = map.get(key) ?? { total: 0, count: 0 };
      cur.total += Number(r.amount);
      cur.count += 1;
      map.set(key, cur);
    }
    result.breakdown = [...map.entries()]
      .map(([name, v]) => ({
        name,
        total: Math.round(v.total * 100) / 100,
        count: v.count,
        average: Math.round((v.total / v.count) * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, topN);
  } else {
    // No grouping: include the 5 most recent transactions for context.
    result.recent = rows.slice(0, 5).map(r => ({
      name: r.name,
      amount: Number(r.amount),
      date: r.date,
    }));
  }

  return result;
}

function validatePropose(args: Record<string, unknown>, today: string):
  | { ok: true; expense: PendingExpense }
  | { ok: false; error: string }
{
  const name = typeof args.name === 'string' ? args.name.trim() : '';
  const amount = Number(args.amount);
  const date = isValidDate(args.date as string) ? (args.date as string) : today;

  if (!name) return { ok: false, error: 'Falta el nombre del gasto' };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return { ok: false, error: 'Monto inválido' };
  }

  return {
    ok: true,
    expense: {
      name,
      amount,
      category_id: args.category_id != null ? Number(args.category_id) : null,
      category_name: (args.category_name as string) ?? null,
      payment_method_id: args.payment_method_id != null ? Number(args.payment_method_id) : null,
      payment_method_name: (args.payment_method_name as string) ?? null,
      date,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Public types & API
// ─────────────────────────────────────────────────────────────────────────

export interface ChatMessage { role: 'user' | 'assistant'; content: string; }

export interface PendingExpense {
  name: string;
  amount: number;
  category_id: number | null;
  category_name: string | null;
  payment_method_id: number | null;
  payment_method_name: string | null;
  date: string;
}

export type CoreReply =
  | { type: 'message'; content: string }
  | { type: 'confirm'; expense: PendingExpense }
  | { type: 'error'; content: string };

/**
 * Stateless: given a full conversation history, return the assistant's reply.
 * Handles a tool-calling loop so query_expenses can run and its result feed
 * back into a final natural-language reply.
 */
export async function processMessage(
  messages: ChatMessage[],
  supabase,
): Promise<CoreReply> {
  const today = todayLimaISO();
  const mentionsPayment = userMentionsPayment(messages);

  const [categories, paymentMethodsRaw] = await Promise.all([
    fetchCategoriesCached(supabase),
    mentionsPayment
      ? supabase.from('payment_methods').select('id, name').then(r => r.data ?? [])
      : Promise.resolve(null),
  ]);

  const systemContext = [
    `Fecha de hoy: ${today}`,
    `Categorías disponibles: ${JSON.stringify(categories)}`,
    mentionsPayment ? `Métodos de pago disponibles: ${JSON.stringify(paymentMethodsRaw)}` : null,
  ].filter(Boolean).join('\n');

  const systemMessage = { role: 'system', content: `${SYSTEM_PROMPT}\n\n${systemContext}` };

  // Sliding window: only send last N messages to OpenAI to control cost.
  const window = messages.slice(-HISTORY_WINDOW);

  // Working set we extend as tool calls happen (assistant tool_calls + tool results).
  const working: any[] = [systemMessage, ...window];

  for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
    const isLastHop = hop === MAX_TOOL_HOPS - 1;
    const openaiData = await callOpenAI({
      model: 'gpt-4o-mini',
      messages: working,
      tools: [TOOL_PROPOSE, TOOL_QUERY],
      tool_choice: isLastHop ? 'none' : 'auto',
      temperature: 0.2,
    });

    const choice = openaiData.choices?.[0];
    if (!choice) return { type: 'error', content: 'Respuesta vacía de OpenAI' };

    if (choice.finish_reason !== 'tool_calls') {
      return { type: 'message', content: choice.message.content ?? '' };
    }

    const toolCalls = choice.message.tool_calls ?? [];
    if (toolCalls.length === 0) return { type: 'error', content: 'tool_calls vacío' };

    // propose_expense short-circuits the loop — UI must confirm before insert.
    const proposeCall = toolCalls.find((c: any) => c.function?.name === 'propose_expense');
    if (proposeCall) {
      let args: Record<string, unknown>;
      try { args = JSON.parse(proposeCall.function.arguments); }
      catch { return { type: 'error', content: 'Argumentos del modelo no parseables' }; }

      const v = validatePropose(args, today);
      if (!v.ok) return { type: 'error', content: v.error };
      return { type: 'confirm', expense: v.expense };
    }

    // Otherwise: execute every query_expenses call and feed results back.
    working.push(choice.message); // assistant turn that contained tool_calls
    for (const tc of toolCalls) {
      if (tc.function?.name !== 'query_expenses') {
        working.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: `unknown_tool:${tc.function?.name}` }),
        });
        continue;
      }
      let qArgs: QueryArgs = {};
      try { qArgs = JSON.parse(tc.function.arguments); } catch { /* keep defaults */ }
      const result = await executeQuery(qArgs, supabase);
      working.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
    // Loop continues: model now has the data and should produce a text reply.
  }

  return {
    type: 'error',
    content: 'No pude armar la respuesta (demasiados rebotes con la herramienta).',
  };
}

/**
 * Insert a confirmed expense into transactions.
 */
export async function executeExpense(
  expense: PendingExpense,
  supabase,
): Promise<string> {
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
  return `✅ Listo! Registré ${expense.name} — S/${expense.amount}${catPart}${methodPart}`;
}
