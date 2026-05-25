# Stripe: PIX, Boleto e conta bancária (RotaJá)

## Duas contas diferentes (não confundir)

| Quem | O que é | Onde configura |
|------|---------|----------------|
| **Você (RotaJá)** | Conta que **recebe** o dinheiro dos planos | Stripe → **Pagamentos / Repasses** |
| **Motorista / Empresa (cliente)** | Conta de onde **paga** o plano | Na hora do pagamento (cartão, PIX ou boleto deles) |

O app **não cadastra** conta bancária do seu cliente. O cliente paga na Stripe; o valor líquido vai para **sua** conta Stripe e depois para **seu** banco.

---

## Colocar SUA conta bancária para receber (RotaJá)

1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com)
2. Complete o cadastro da empresa (CNPJ/CPF, endereço, representante)
3. Menu **Pagamentos** ou **Configurações → Dados bancários e repasses**
4. **Adicionar conta bancária** (Brasil: banco, agência, conta, titular)
5. Aguarde verificação da Stripe

Em **modo Test**: não há repasse real.  
Em **modo Live**: após cada pagamento, a Stripe acumula saldo e **transfere** para essa conta (prazo típico: alguns dias úteis no Brasil).

---

## Ativar PIX e Boleto na Stripe (obrigatório)

1. Stripe Dashboard → **Configurações → Formas de pagamento**
2. Ative **PIX** e **Boleto** (Brasil)
3. Assinaturas com PIX usam **Pix Automático** (débito recorrente autorizado no app do banco do cliente)
4. Boleto: voucher com vencimento (ex.: 3 dias); renovação mensal gera novo boleto

Se PIX/Boleto não aparecerem no Checkout, normalmente falta ativar aqui ou a conta ainda não está habilitada para Brasil.

---

## Como o app escolhe o método

1. Usuário toca **Cartão**, **PIX** ou **Boleto** no app
2. Ao confirmar, abre a Stripe **só com esse método**
3. Após pagamento confirmado, webhook atualiza o plano no Supabase

Após atualizar o código, rode de novo:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "seu_token"
npm run setup:stripe
```

(ou só: `npx supabase functions deploy create-checkout-session --project-ref tbiepfclghsrwinqluls`)

---

## PIX e assinatura mensal

- **Cartão**: cobrança automática todo mês
- **Boleto**: novo boleto a cada ciclo (cliente paga até vencer)
- **PIX (Automático)**: cliente autoriza no banco; cobranças mensais via mandate

Se o pagamento PIX/boleto ficar **pendente**, o plano só ativa quando o webhook `checkout.session.completed` ou `invoice.paid` confirmar.
