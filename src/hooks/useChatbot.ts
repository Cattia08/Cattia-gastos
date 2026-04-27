import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PendingExpense {
  name: string;
  amount: number;
  category_id: number | null;
  category_name: string | null;
  payment_method_id: number | null;
  payment_method_name: string | null;
  date: string;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;

const INITIAL_MESSAGES: ChatMessage[] = [
  { role: 'assistant', content: '¡Hola! Dime qué gastaste y lo registro. Ej: "gasté 45 soles en almuerzo con tarjeta"' },
];

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [pending, setPending] = useState<PendingExpense | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const messagesRef = useRef<ChatMessage[]>(INITIAL_MESSAGES);

  const addAssistantMessage = (content: string) => {
    setMessages(prev => {
      const next = [...prev, { role: 'assistant' as const, content }];
      messagesRef.current = next;
      return next;
    });
  };

  const call = useCallback(async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (loading) return;
    if (pending) setPending(null);

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messagesRef.current, userMsg];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setLoading(true);

    try {
      const data = await call({ messages: nextMessages });

      if (data.type === 'error') {
        addAssistantMessage(`⚠️ Error: ${data.content}`);
      } else if (data.type === 'confirm') {
        // The widget renders a pending card from this state — no inline bubble needed.
        setPending(data.expense as PendingExpense);
      } else if (data.type === 'message') {
        addAssistantMessage(data.content);
      } else {
        addAssistantMessage(`⚠️ Respuesta inesperada: ${JSON.stringify(data)}`);
      }
    } catch {
      addAssistantMessage('Error de conexión. Revisa tu internet.');
    } finally {
      setLoading(false);
    }
  }, [loading, pending, call]);

  const confirmExpense = useCallback(async () => {
    if (!pending || loading) return;
    const exp = pending;
    setPending(null);
    setLoading(true);

    try {
      const data = await call({ action: 'execute', expense: exp });
      if (data.type === 'message') {
        addAssistantMessage(data.content);
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      } else {
        addAssistantMessage('Error al guardar. Intenta de nuevo.');
      }
    } catch {
      addAssistantMessage('Error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [pending, loading, call, queryClient]);

  const rejectExpense = useCallback(() => {
    setPending(null);
    addAssistantMessage('Ok, cancelado. ¿Algo más?');
  }, []);

  /**
   * Clear pending silently and return a natural-language draft so the widget
   * can pre-fill the input for the user to tweak.
   */
  const editPending = useCallback((): string => {
    if (!pending) return '';
    const parts: string[] = [pending.name, `${pending.amount} soles`];
    if (pending.payment_method_name) parts.push(`con ${pending.payment_method_name}`);
    if (pending.category_name) parts.push(pending.category_name);
    setPending(null);
    return parts.join(' ');
  }, [pending]);

  const clearChat = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
    messagesRef.current = INITIAL_MESSAGES;
    setPending(null);
  }, []);

  return { messages, pending, loading, sendMessage, confirmExpense, rejectExpense, editPending, clearChat };
}
