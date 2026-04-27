import { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react';
import { Send, X, Eraser, Pencil, Check } from 'lucide-react';
import { useChatbot, PendingExpense } from '@/hooks/useChatbot';
import { useCategories } from '@/hooks/useCategories';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';

// ─────────────────────────────────────────────────────────────────────────
// Tokens (kept inline since widget owns its visual identity)
// ─────────────────────────────────────────────────────────────────────────
const COLOR = {
  pinkDeep: 'hsl(338,55%,52%)',
  pinkText: 'hsl(338,40%,38%)',
  pinkSoftBg: 'hsl(338,45%,95%)',
  pinkBorder: 'hsl(338,35%,90%)',
  pinkChipBg: 'hsl(310,30%,96%)',
  pinkChipText: 'hsl(338,30%,42%)',
  greenGrad: 'linear-gradient(135deg, hsl(152,45%,48%), hsl(152,45%,42%))',
  ink: 'hsl(0,0%,18%)',
  inkSoft: 'hsl(0,0%,42%)',
  ghostBg: 'hsl(0,0%,96%)',
};

const QUICK_REPLIES_INITIAL = [
  { label: 'Almuerzo S/15', send: 'gasté 15 en almuerzo', emoji: '🍔' },
  { label: 'Café S/8',      send: 'café 8 soles',         emoji: '☕' },
  { label: 'Taxi',          send: 'pagué taxi 12',        emoji: '🚕' },
  { label: 'Súper',         send: 'súper 60 soles',       emoji: '🛒' },
];

const PLACEHOLDERS = [
  'gasté 30 en almuerzo...',
  '20 soles uber',
  'café 8 con yape',
  'almorcé chifa 25',
];

// ─────────────────────────────────────────────────────────────────────────
// Visual atoms
// ─────────────────────────────────────────────────────────────────────────
function CatFace({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size + 4} viewBox="0 0 40 44" fill="none" aria-hidden>
      <polygon points="5,23 11,5 17,23" fill="white" opacity="0.92" />
      <polygon points="23,23 29,5 35,23" fill="white" opacity="0.92" />
      <polygon points="8,22 11,11 14,22" fill="#fda4c0" opacity="0.75" />
      <polygon points="26,22 29,11 32,22" fill="#fda4c0" opacity="0.75" />
      <circle cx="20" cy="28" r="15" fill="white" opacity="0.96" />
      <ellipse cx="14" cy="26" rx="2.4" ry="2.9" fill="#2d1535" />
      <ellipse cx="26" cy="26" rx="2.4" ry="2.9" fill="#2d1535" />
      <circle cx="15" cy="25" r="0.85" fill="white" />
      <circle cx="27" cy="25" r="0.85" fill="white" />
      <ellipse cx="20" cy="30" rx="1.3" ry="1" fill="#fda4c0" />
      <path d="M17.5 31.8 Q20 33.6 22.5 31.8" stroke="#c07090" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <line x1="4"  y1="29"   x2="13" y2="29.5" stroke="#e8b0c8" strokeWidth="0.85" opacity="0.55" />
      <line x1="4"  y1="31.5" x2="13" y2="31"   stroke="#e8b0c8" strokeWidth="0.85" opacity="0.55" />
      <line x1="27" y1="29.5" x2="36" y2="29"   stroke="#e8b0c8" strokeWidth="0.85" opacity="0.55" />
      <line x1="27" y1="31"   x2="36" y2="31.5" stroke="#e8b0c8" strokeWidth="0.85" opacity="0.55" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-end gap-1.5">
      <span className="text-base leading-none select-none">🐱</span>
      <div
        className="flex items-center gap-1 px-3.5 py-2.5 rounded-2xl rounded-bl-[5px]"
        style={{ background: 'white', boxShadow: '0 1px 6px rgba(180,100,140,0.10)' }}
      >
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className="block w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ background: 'hsl(338,55%,72%)', animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  emoji,
  label,
  onClick,
  disabled,
}: {
  emoji?: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 active:scale-[0.97] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400"
      style={{
        background: 'white',
        color: COLOR.pinkText,
        border: `1.5px solid ${COLOR.pinkBorder}`,
        boxShadow: '0 1px 3px rgba(180,80,130,0.06)',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      {emoji && <span aria-hidden>{emoji}</span>}
      <span>{label}</span>
    </button>
  );
}

// Horizontal-scroll row of selectable pills. Used to swap category / payment method
// inside the pending card without going through the model.
function SwapRow({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: { id: number; name: string }[];
  selectedId: number | null;
  onSelect: (opt: { id: number; name: string }) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="px-3 pb-2">
      <div
        className="text-[9.5px] font-bold uppercase tracking-[0.08em] mb-1"
        style={{ color: COLOR.pinkText, opacity: 0.75 }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => {
          const active = opt.id === selectedId;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt)}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pink-400"
              style={
                active
                  ? {
                      background: COLOR.pinkDeep,
                      color: 'white',
                      boxShadow: '0 1px 4px rgba(200,80,130,0.35)',
                    }
                  : {
                      background: 'white',
                      color: COLOR.pinkText,
                      border: `1px solid ${COLOR.pinkBorder}`,
                    }
              }
            >
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Pending expense card — replaces the old "¿Registro este gasto? 📋..." text bubble.
// Lives outside the message stream so it has clear visual priority.
function PendingCard({
  expense,
  categories,
  paymentMethods,
  onConfirm,
  onEdit,
  onReject,
  onUpdate,
  loading,
}: {
  expense: PendingExpense;
  categories: { id: number; name: string }[];
  paymentMethods: { id: number; name: string }[];
  onConfirm: () => void;
  onEdit: () => void;
  onReject: () => void;
  onUpdate: (patch: Partial<PendingExpense>) => void;
  loading: boolean;
}) {
  return (
    <div
      className="shrink-0 mx-3 mb-2 rounded-2xl overflow-hidden animate-fade-in-up"
      style={{
        background: 'white',
        border: `1px solid ${COLOR.pinkBorder}`,
        boxShadow: '0 6px 22px -8px rgba(232,121,168,0.30), 0 1px 3px rgba(180,80,130,0.08)',
      }}
    >
      <div className="px-4 pt-3 pb-2">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{ color: COLOR.pinkDeep, fontFamily: 'Nunito, sans-serif' }}
        >
          Por registrar
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <div
            className="font-bold text-[15px] capitalize truncate leading-tight"
            style={{ color: COLOR.ink, fontFamily: 'Nunito, sans-serif' }}
            title={expense.name}
          >
            {expense.name}
          </div>
          <div
            className="font-extrabold text-[20px] shrink-0 leading-none"
            style={{ color: COLOR.pinkDeep, fontFamily: 'Nunito, sans-serif' }}
          >
            S/{expense.amount}
          </div>
        </div>
        <div className="mt-1.5 text-[10.5px]" style={{ color: COLOR.pinkChipText }}>
          📅 {expense.date}
        </div>
      </div>

      {/* Quick-swap rows */}
      <SwapRow
        label="Categoría"
        options={categories}
        selectedId={expense.category_id}
        onSelect={opt => onUpdate({ category_id: opt.id, category_name: opt.name })}
      />
      <SwapRow
        label="Método de pago"
        options={paymentMethods}
        selectedId={expense.payment_method_id}
        onSelect={opt => onUpdate({ payment_method_id: opt.id, payment_method_name: opt.name })}
      />

      {/* Actions */}
      <div className="grid grid-cols-3 gap-1.5 px-2.5 pb-2.5 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="min-h-[42px] inline-flex items-center justify-center gap-1 text-[13px] font-bold rounded-xl text-white transition-opacity active:opacity-80 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          style={{ background: COLOR.greenGrad, boxShadow: '0 2px 8px rgba(60,160,110,0.25)' }}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} /> Sí
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={loading}
          className="min-h-[42px] inline-flex items-center justify-center gap-1 text-[13px] font-semibold rounded-xl transition-colors active:opacity-80 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400"
          style={{ background: COLOR.pinkSoftBg, color: COLOR.pinkText }}
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} /> Editar
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={loading}
          className="min-h-[42px] inline-flex items-center justify-center text-[13px] font-semibold rounded-xl transition-colors active:opacity-80 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          style={{ background: COLOR.ghostBg, color: COLOR.inkSoft }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main widget
// ─────────────────────────────────────────────────────────────────────────
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [phIdx, setPhIdx] = useState(0);
  const {
    messages,
    pending,
    loading,
    sendMessage,
    confirmExpense,
    rejectExpense,
    editPending,
    updatePending,
    clearChat,
  } = useChatbot();
  const { categories } = useCategories();
  const { paymentMethods } = usePaymentMethods();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLoading = useRef(false);

  // Scroll to bottom on new content.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pending]);

  // Focus input + scroll to bottom + rotate placeholder example on open.
  // The panel is unmounted while closed, so the scroll effect on [messages]
  // doesn't fire when reopening — we have to scroll explicitly here.
  useEffect(() => {
    if (open) {
      setPhIdx(i => (i + 1) % PLACEHOLDERS.length);
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      });
      setTimeout(() => inputRef.current?.focus(), 180);
    }
  }, [open]);

  // Refocus input whenever a response arrives.
  useEffect(() => {
    if (prevLoading.current && !loading && !pending) {
      inputRef.current?.focus();
    }
    prevLoading.current = loading;
  }, [loading, pending]);

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setInput('');
    sendMessage(value);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEdit = () => {
    const draft = editPending();
    if (!draft) return;
    setInput(draft);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(draft.length, draft.length);
    }, 30);
  };

  const handleQuickReply = (send: string) => {
    if (loading || pending) return;
    handleSend(send);
  };

  // Derive UI hints from the message stream so we don't keep extra state in sync.
  const lastMsg = messages[messages.length - 1];
  const isInitial = messages.length === 1 && messages[0].role === 'assistant';
  const justRegistered = !pending && !loading && lastMsg?.role === 'assistant' && lastMsg.content.startsWith('✅');

  // Random subtle position for chips entry — reduces feeling of static row.
  const placeholder = useMemo(() => PLACEHOLDERS[phIdx], [phIdx]);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente Cattia'}
        className="fixed bottom-20 right-4 lg:bottom-28 lg:right-8 z-[70] w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400"
        style={{
          background: 'linear-gradient(140deg, hsl(338,65%,68%) 0%, hsl(280,52%,65%) 100%)',
          boxShadow: '0 4px 20px rgba(200,80,130,0.38), 0 1px 4px rgba(0,0,0,0.10)',
          animation: open ? 'none' : 'cattia-cat-idle 3s ease-in-out infinite',
        }}
      >
        <CatFace size={30} />
      </button>

      {open && (
        <div
          className="fixed right-4 lg:right-8 bottom-[9rem] lg:bottom-[11rem] z-[70] flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: 'min(340px, calc(100vw - 2rem))',
            height: 'min(440px, calc(100dvh - 14rem))',
            animation: 'cattia-slide-up 0.22s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: '0 8px 40px rgba(180,80,130,0.18), 0 2px 12px rgba(0,0,0,0.10)',
          }}
        >
          {/* Header */}
          <div
            className="shrink-0 flex items-center gap-3 px-4 py-3"
            style={{ background: 'linear-gradient(135deg, hsl(338,62%,64%) 0%, hsl(275,50%,66%) 100%)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.22)' }}
            >
              <CatFace size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-bold leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Cattia
              </p>
              <p className="text-white/65 text-[11px] leading-tight">asistente de gastos</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-300 mr-1" aria-label="Online" />
              <button
                onClick={clearChat}
                disabled={messages.length <= 1 && !pending}
                aria-label="Limpiar chat"
                title="Limpiar chat"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 active:bg-white/30 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
              >
                <Eraser className="w-3.5 h-3.5 text-white" strokeWidth={2.4} />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar chat"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 active:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
              >
                <X className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
            style={{ background: 'hsl(310,25%,98%)' }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <span className="text-base leading-none select-none shrink-0 mb-0.5">🐱</span>
                )}
                <div
                  className="max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={msg.role === 'user'
                    ? {
                        background: 'linear-gradient(135deg, hsl(338,62%,64%), hsl(338,56%,58%))',
                        color: 'white',
                        borderRadius: '18px 18px 5px 18px',
                        boxShadow: '0 2px 8px rgba(200,80,130,0.22)',
                      }
                    : {
                        background: 'white',
                        color: 'hsl(0,0%,24%)',
                        borderRadius: '18px 18px 18px 5px',
                        boxShadow: '0 1px 5px rgba(150,80,120,0.09)',
                      }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Initial-state quick replies */}
            {isInitial && !loading && !pending && (
              <div className="flex flex-wrap gap-1.5 pl-6 animate-fade-in">
                {QUICK_REPLIES_INITIAL.map(qr => (
                  <Chip
                    key={qr.label}
                    emoji={qr.emoji}
                    label={qr.label}
                    onClick={() => handleQuickReply(qr.send)}
                  />
                ))}
              </div>
            )}

            {/* Post-register chips */}
            {justRegistered && (
              <div className="flex flex-wrap gap-1.5 pl-6 animate-fade-in">
                <Chip emoji="➕" label="Otro gasto" onClick={() => inputRef.current?.focus()} />
                <Chip emoji="🧹" label="Limpiar chat" onClick={clearChat} />
              </div>
            )}

            {loading && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* Pending expense card */}
          {pending && (
            <PendingCard
              expense={pending}
              categories={categories}
              paymentMethods={paymentMethods}
              onConfirm={confirmExpense}
              onEdit={handleEdit}
              onReject={rejectExpense}
              onUpdate={updatePending}
              loading={loading}
            />
          )}

          {/* Input */}
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-2.5"
            style={{ background: 'white', borderTop: `1px solid ${COLOR.pinkBorder}` }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              placeholder={placeholder}
              className="flex-1 text-sm px-4 py-2.5 rounded-full outline-none disabled:opacity-50 transition-[border-color] duration-150"
              style={{
                background: 'hsl(310,20%,97%)',
                border: '1.5px solid hsl(338,30%,87%)',
                color: 'hsl(0,0%,24%)',
                fontFamily: 'Outfit, sans-serif',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'hsl(338,60%,68%)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'hsl(338,30%,87%)')}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 disabled:opacity-35 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400"
              style={{ background: 'linear-gradient(140deg, hsl(338,62%,64%), hsl(280,52%,65%))' }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
