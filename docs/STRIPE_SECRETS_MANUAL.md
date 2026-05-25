# Configurar secrets manualmente (se o script CLI falhar)

Projeto: **tbiepfclghsrwinqluls**

## 1. Supabase Dashboard → Edge Functions → Secrets

Adicione cada par (nome = valor):

| Nome | Valor |
|------|--------|
| `STRIPE_SECRET_KEY` | sua `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | seu `whsec_...` |
| `STRIPE_PRICE_MOTORISTA_BRONZE` | `price_1TaxoePFQwuRFQbNH58ShlMn` |
| `STRIPE_PRICE_MOTORISTA_PRATA` | `price_1TaxoyPFQwuRFQbNFm5cyIWf` |
| `STRIPE_PRICE_MOTORISTA_OURO` | `price_1TaxpIPFQwuRFQbN95waf4Cc` |
| `STRIPE_PRICE_EMPRESA_BRONZE` | `price_1TaxpePFQwuRFQbNIoaaNdXw` |
| `STRIPE_PRICE_EMPRESA_PRATA` | `price_1TaxqEPFQwuRFQbNbznxFmgG` |
| `STRIPE_PRICE_EMPRESA_OURO` | `price_1TaxqfPFQwuRFQbND81JoD0H` |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente pelo Supabase nas Edge Functions.

## 2. Deploy das funções (terminal, após login)

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_SEU_TOKEN"
cd c:\Users\User\rota-ja-app
.\scripts\setup-stripe-supabase.local.ps1
```

Ou:

```bash
npx supabase login
npx supabase link --project-ref tbiepfclghsrwinqluls
npx supabase functions deploy create-checkout-session --project-ref tbiepfclghsrwinqluls
npx supabase functions deploy stripe-webhook --project-ref tbiepfclghsrwinqluls --no-verify-jwt
```

## 3. Webhook Stripe (confirme)

URL: `https://tbiepfclghsrwinqluls.supabase.co/functions/v1/stripe-webhook`

Eventos: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`

## 4. SQL

SQL Editor → executar `src/config/migration_security_plans.sql`

## 5. App

`.env` já deve ter `EXPO_PUBLIC_PAYMENTS_MODE=stripe` → `npx expo start -c`
