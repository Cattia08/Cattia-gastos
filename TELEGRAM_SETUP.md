# Setup Telegram Bot — Cattia

## Estado

- [x] SQL `chat_sessions` ejecutado
- [x] Edge functions desplegadas (`chat-assistant`, `telegram-webhook`)
- [x] Bot creado en `@BotFather`
- [x] Webhook activo
- [x] Tu chat_id en whitelist — funciona en tu cel
- [ ] Agregar chat_id de ella
- [ ] Editar `BOT_USERNAME` en frontend + redeploy
- [ ] Probar en su cel

---

## Agregar a tu enamorada

Ella **no necesita terminal ni nada técnico**. Tú lo haces todo desde tu lado en 3 pasos.

### Paso 1 — Que ella abra el bot y mande `/start`

Pásale el username del bot (ej: `@cattia_gastos_bot`). Ella:

1. Abre Telegram en su cel.
2. Pega el username en la búsqueda.
3. Toca el bot, toca `Iniciar` (o escribe `/start`).

El bot **no le va a responder aún** (su chat_id todavía no está en la whitelist). Es normal. Eso ya deja registrado su chat_id en el servidor de Telegram, que es lo que necesitas.

### Paso 2 — Tú sacas su chat_id

En tu navegador, abre (reemplaza `<TOKEN>`):

```
https://api.telegram.org/bot<TOKEN>/getUpdates
```

Verás un JSON con varios `update`. Busca uno donde `"text":"/start"` aparezca y el `"chat":{"id":NÚMERO,...}` sea **distinto al tuyo**. Ese número es el de ella. Cópialo.

> Si no aparece, dile que vuelva a mandar `/start`. Telegram solo guarda updates recientes.

### Paso 3 — Actualizas el secret

En tu terminal (raíz del proyecto):

```bash
supabase secrets set TELEGRAM_OWNER_CHAT_ID=<TU_CHAT_ID>,<CHAT_ID_DE_ELLA>
```

Sin espacios, separados por coma. **Reemplaza** el valor anterior — Supabase no concatena, sobreescribe.

Alternativa Dashboard: Project Settings → Edge Functions → Manage secrets → editar `TELEGRAM_OWNER_CHAT_ID`.

> No necesitas redeploy: el edge fn lee el secret en cada request.

---

## Editar `BOT_USERNAME` en la UI

Para que el tab Admin → Telegram muestre el nombre correcto del bot a ella:

Abre `src/components/admin/TelegramSetupGuide.tsx`, línea 7:

```ts
const BOT_USERNAME: string | null = null;
```

Cambia a tu username (sin la `@`):

```ts
const BOT_USERNAME: string | null = 'cattia_gastos_bot';
```

Commit + push + redeploy frontend.

---

## Probar en su cel

1. Que ella vuelva a abrir el bot y mande `/start`. Ahora **sí debe responder** con el saludo.
2. Que mande `gasté 25 en almuerzo`. Debe mostrar la tarjeta con Sí / Editar / Cancelar.
3. Que toque **Sí**. Debe responder `✅ Listo!...`.
4. Abre la app web → Transactions → verifica que aparezca el gasto.

---

## Comandos útiles (referencia)

| Acción | Comando |
|---|---|
| Ver chat_ids en whitelist | `supabase secrets list` (no muestra valor por seguridad — ver Dashboard) |
| Ver estado del webhook | `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo` |
| Ver últimos updates Telegram | abrir `https://api.telegram.org/bot<TOKEN>/getUpdates` en navegador |
| Logs edge fn | Supabase Dashboard → Edge Functions → telegram-webhook → Logs |
| Eliminar webhook (debug) | `curl https://api.telegram.org/bot<TOKEN>/deleteWebhook` |

---

## Si ella manda `/start` y no responde

1. Verifica que su chat_id realmente esté en `TELEGRAM_OWNER_CHAT_ID`. Dashboard → Manage secrets → ver el valor.
2. Verifica que `getUpdates` muestre actividad de su chat (sino, manda otra vez `/start`).
3. Revisa logs del edge fn — busca líneas con su chat_id. Si no aparece nada, el webhook no llega; revisa `getWebhookInfo`.
4. Si `getWebhookInfo` muestra `last_error_message` con algo → léelo.

---

## Agregar más usuarios a futuro

Mismo proceso: que la persona mande `/start` → tú sacas su chat_id de `getUpdates` → agregas a la lista separada por comas.

```bash
supabase secrets set TELEGRAM_OWNER_CHAT_ID=id1,id2,id3
```
