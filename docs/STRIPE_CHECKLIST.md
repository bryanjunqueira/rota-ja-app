# Checklist — Stripe RotaJá (projeto tbiepfclghsrwinqluls)

Price IDs já configurados no código. Falta deploy Supabase (login CLI ou secrets manuais).

# Checklist — Você criou os 6 produtos no Stripe ✅

Siga nesta ordem. Marque cada item ao concluir.

---

## 1. Copiar os 6 Price IDs

No Stripe → **Catálogo de produtos** → clique em cada produto → copie o **ID do preço** (`price_1ABC...`).

| Produto no Stripe | Secret no Supabase |
|-------------------|-------------------|
| Motorista Bronze (R$ 69) | `STRIPE_PRICE_MOTORISTA_BRONZE` |
| Motorista Prata (R$ 89) | `STRIPE_PRICE_MOTORISTA_PRATA` |
| Motorista Ouro (R$ 109) | `STRIPE_PRICE_MOTORISTA_OURO` |
| Empresa Bronze (R$ 199) | `STRIPE_PRICE_EMPRESA_BRONZE` |
| Empresa Prata (R$ 269) | `STRIPE_PRICE_EMPRESA_PRATA` |
| Empresa Ouro (R$ 359) | `STRIPE_PRICE_EMPRESA_OURO` |

Chaves da API: **Desenvolvedores → Chaves da API** → copie `sk_test_...` (secreta).

---

## 2. SQL no Supabase (se ainda não fez)

SQL Editor → executar:

1. `src/config/migration_assinaturas.sql`
2. `src/config/migration_security_plans.sql`

---

## 3. Publicar Edge Functions no Supabase

No terminal, na pasta do projeto:

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF
```

`SEU_PROJECT_REF` = ID do projeto (Supabase → Settings → General → Reference ID).

Definir secrets (cole seus valores reais):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_MOTORISTA_BRONZE=price_...
supabase secrets set STRIPE_PRICE_MOTORISTA_PRATA=price_...
supabase secrets set STRIPE_PRICE_MOTORISTA_OURO=price_...
supabase secrets set STRIPE_PRICE_EMPRESA_BRONZE=price_...
supabase secrets set STRIPE_PRICE_EMPRESA_PRATA=price_...
supabase secrets set STRIPE_PRICE_EMPRESA_OURO=price_...
```

Deploy:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## 4. Webhook no Stripe

**Desenvolvedores → Webhooks → Adicionar endpoint**

- URL: `https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
- Eventos: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
- Copiar **Signing secret** (`whsec_...`) → rodar de novo:
  `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 5. App (.env)

```env
EXPO_PUBLIC_PAYMENTS_MODE=stripe
```

Reinicie o Expo: `npx expo start -c`

---

## 6. Testar

1. Login no app → Planos → escolher Bronze (motorista)
2. Checkout → pagar (cartão teste: `4242 4242 4242 4242`)
3. Supabase → tabela `assinaturas` → `tipo_plano=bronze`, `status_assinatura=ativo`
4. Aba Cargas → limite de 10 fretes

---

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| Erro ao pagar / função não encontrada | `supabase functions deploy` + projeto linkado |
| Pagou mas plano não mudou | Ver logs do webhook; conferir `STRIPE_WEBHOOK_SECRET` |
| Sandbox ainda abre | `.env` com `EXPO_PUBLIC_PAYMENTS_MODE=stripe` e reiniciar Expo |

Guia completo: [PAGAMENTOS_STRIPE.md](./PAGAMENTOS_STRIPE.md)
