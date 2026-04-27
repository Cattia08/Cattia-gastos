import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, X } from 'lucide-react';
import { useChatbot } from '@/hooks/useChatbot';

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

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, pending, loading, sendMessage, confirmExpense, rejectExpense } = useChatbot();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLoading = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 180);
  }, [open]);

  // Refocus input whenever a response arrives (loading true → false)
  useEffect(() => {
    if (prevLoading.current && !loading && !pending) {
      inputRef.current?.focus();
    }
    prevLoading.current = loading;
  }, [loading, pending]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendMessage(text);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/*
        Mobile:  bottom-20 right-4  (above bottom nav, clear of panel)
        Desktop: lg:bottom-28 lg:right-8  (above the existing + FAB at bottom-8)
        Panel bottom on mobile  = 5rem toggle + 3.5rem height + 0.5rem gap = 9rem   → bottom-[9rem]
        Panel bottom on desktop = 7rem toggle + 3.5rem height + 0.5rem gap = 11rem  → lg:bottom-[11rem]
      */}
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
            width: 'min(320px, calc(100vw - 2rem))',
            height: 'min(400px, calc(100dvh - 14rem))',
            animation: 'cattia-slide-up 0.22s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: '0 8px 40px rgba(180,80,130,0.18), 0 2px 12px rgba(0,0,0,0.10)',
          }}
        >
          {/* ── Header with X ── */}
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
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-green-300" aria-label="Online" />
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar chat"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 active:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
              >
                <X className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
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

            {loading && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* ── Confirmation ── */}
          {pending && (
            <div
              className="shrink-0 flex gap-2 px-3 py-2"
              style={{ background: 'white', borderTop: '1px solid hsl(338,40%,92%)' }}
            >
              <button
                onClick={confirmExpense}
                disabled={loading}
                className="flex-1 min-h-[44px] text-sm font-semibold rounded-xl text-white transition-opacity disabled:opacity-50 active:opacity-80"
                style={{ background: 'linear-gradient(135deg, hsl(152,45%,48%), hsl(152,45%,42%))' }}
              >
                ✓ Sí, registrar
              </button>
              <button
                onClick={() => { rejectExpense(); setTimeout(() => inputRef.current?.focus(), 50); }}
                disabled={loading}
                className="flex-1 min-h-[44px] text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 active:opacity-70"
                style={{ background: 'hsl(338,45%,95%)', color: 'hsl(338,40%,48%)' }}
              >
                ✗ Cancelar
              </button>
            </div>
          )}

          {/* ── Input ── */}
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-2.5"
            style={{ background: 'white', borderTop: '1px solid hsl(338,25%,92%)' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              placeholder="gasté 30 en almuerzo..."
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
              onClick={handleSend}
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
