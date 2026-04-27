import {
  Send, Search, PlayCircle, MessageCircleQuestion, Sparkles, Heart, ShieldCheck,
} from 'lucide-react';

// Once Jandir creates the bot with @BotFather, paste the bot username here
// (the one ending in _bot, without the leading @). Until then it shows a placeholder.
const BOT_USERNAME: string | null = null;

// ─────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────

function ExampleChip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium bg-pastel-rose/40 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200/50 dark:border-rose-500/20">
      "{children}"
    </span>
  );
}

function CommandPill({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border">
      <code className="text-[13px] font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0">{cmd}</code>
      <span className="text-[13px] text-muted-foreground">{desc}</span>
    </div>
  );
}

function NumberedStep({
  number,
  icon: Icon,
  title,
  children,
}: {
  number: number;
  icon: typeof Send;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/25">
          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-sky-500 text-[10px] font-bold text-sky-600 flex items-center justify-center">
            {number}
          </span>
        </div>
      </div>
      <div className="flex-1 pt-1.5">
        <h4 className="text-[15px] font-bold text-foreground tracking-tight mb-1.5">{title}</h4>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

export function TelegramSetupGuide() {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
          <Send className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Cattia en Telegram</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registra tus gastos rápido sin abrir la app.
          </p>
        </div>
      </div>

      {/* Intro */}
      <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-blue-500/5 dark:from-sky-500/10 dark:to-blue-500/10 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-sky-500 mt-0.5 shrink-0" />
          <div className="text-[14px] text-foreground/85 leading-relaxed">
            Hay un bot conectado a esta app. Le escribes como si fuera un amigo —
            <span className="font-semibold text-foreground"> "gasté 30 en almuerzo"</span> — y él lo registra.
            También puedes preguntarle <span className="font-semibold text-foreground">"cuánto gasté este mes"</span> y te responde al instante. Los gastos quedan en la misma app.
          </div>
        </div>
      </div>

      {/* Pasos */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground tracking-tight">Cómo conectarte (1 minuto)</h3>

        <div className="space-y-5">
          <NumberedStep number={1} icon={Send} title="Abre Telegram en tu cel">
            Si no tienes la app, descárgala gratis de tu tienda de apps.
          </NumberedStep>

          <NumberedStep number={2} icon={Search} title="Busca el bot">
            En la barra de búsqueda escribe el nombre del bot:
            <div className="mt-1">
              {BOT_USERNAME ? (
                <code className="inline-block px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 font-mono text-[13px] font-bold border border-sky-500/20">
                  @{BOT_USERNAME}
                </code>
              ) : (
                <span className="inline-block px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[12.5px] border border-amber-500/30">
                  Jandir te pasa el nombre del bot ✨
                </span>
              )}
            </div>
          </NumberedStep>

          <NumberedStep number={3} icon={PlayCircle} title="Mándale /start">
            Toca el bot, luego el botón <span className="font-semibold text-foreground">Iniciar</span> (o escribe <code className="text-[12px] font-mono px-1.5 py-0.5 rounded bg-muted">/start</code>).
          </NumberedStep>

          <NumberedStep number={4} icon={ShieldCheck} title="Si no responde la primera vez, avísale a Jandir">
            Por seguridad, el bot solo atiende a personas autorizadas. La primera vez que mandas <code className="text-[12px] font-mono px-1.5 py-0.5 rounded bg-muted">/start</code> probablemente no te conteste. Avísale a Jandir, él te autoriza en 30 segundos. Después vuelves a mandar <code className="text-[12px] font-mono px-1.5 py-0.5 rounded bg-muted">/start</code> y ahora sí te saluda.
          </NumberedStep>
        </div>
      </div>

      {/* Qué le puedes decir */}
      <div className="rounded-2xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2.5">
          <MessageCircleQuestion className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-foreground tracking-tight">Qué le puedes decir</h3>
        </div>

        <div className="space-y-3">
          <div className="text-[13px] font-semibold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Registrar un gasto
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ExampleChip>gasté 30 en almuerzo</ExampleChip>
            <ExampleChip>café 8 con yape</ExampleChip>
            <ExampleChip>uber 12 anoche</ExampleChip>
            <ExampleChip>compré zapatillas 250 con BCP crédito</ExampleChip>
            <ExampleChip>almorcé chifa 25</ExampleChip>
          </div>
          <p className="text-xs text-muted-foreground">
            El bot te muestra el gasto y tres botones: <span className="font-semibold text-foreground">Sí</span>, <span className="font-semibold text-foreground">Editar</span> o <span className="font-semibold text-foreground">Cancelar</span>. Tocas el que quieras.
          </p>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-3">
          <div className="text-[13px] font-semibold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            Consultar gastos
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ExampleChip>cuánto gasté este mes</ExampleChip>
            <ExampleChip>en qué categoría gasto más</ExampleChip>
            <ExampleChip>qué día gasté más</ExampleChip>
            <ExampleChip>promedio diario</ExampleChip>
            <ExampleChip>gastos sobre 100 soles</ExampleChip>
            <ExampleChip>comida vs transporte</ExampleChip>
            <ExampleChip>cuánto el año pasado</ExampleChip>
          </div>
          <p className="text-xs text-muted-foreground">
            Hazle preguntas como si fuera una persona. Si no entiende algo, te pide aclarar.
          </p>
        </div>
      </div>

      {/* Comandos */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground tracking-tight">Comandos rápidos</h3>
        <div className="grid sm:grid-cols-3 gap-2">
          <CommandPill cmd="/start" desc="Saludo y bienvenida" />
          <CommandPill cmd="/reset" desc="Limpiar la conversación" />
          <CommandPill cmd="/help" desc="Ver ayuda dentro del bot" />
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-2xl border border-rose-200/60 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/5 p-4">
        <div className="flex items-start gap-3">
          <Heart className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" fill="currentColor" />
          <div className="text-[13px] text-foreground/85 leading-relaxed">
            <span className="font-semibold">Tip:</span> los gastos que registras desde Telegram aparecen en la app inmediatamente. Usa Telegram para registrar rápido y la app para ver gráficos y reportes.
          </div>
        </div>
      </div>
    </div>
  );
}
