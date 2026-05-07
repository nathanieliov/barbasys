# POS Receipt Feedback + Retroactive Send — Design Spec

**Date:** 2026-05-06
**Scope:** POS success state — show what happened with the receipt and let the cashier retroactively send one if customer info was missed at checkout.

---

## Problem

After a successful POS transaction, the success card says "Transaction recorded" with no mention of the receipt. Three concrete gaps:

1. **No status feedback.** Cashier doesn't know whether a receipt was sent, and to whom.
2. **No recovery for missing contact info.** If the cashier forgets to enter the customer's email/phone at checkout, there's no way to send a receipt afterward without going to Sales History.
3. **WhatsApp branch is dead code.** `sendReceipt()` has a WhatsApp delivery path, but `ProcessSale.ts` calls it without passing a `whatsAppClient`, so the branch never fires.

## Goal

Cashier sees a clear "Receipt sent to ..." line in the POS success card. If no contact info was captured, they get a "Send receipt" button that opens a small modal to enter email and/or phone and trigger delivery. WhatsApp is wired into the initial sale path so opted-in customers in their session window receive the receipt via WhatsApp.

## Non-Goals

- Returning real delivery success/failure status from `sendReceipt`. The function stays fire-and-forget on the initial sale; the UI infers "sent to X" from the inputs we passed. (Real delivery status would need a sync API and bigger refactor.)
- Print receipt — deferred (was option C).
- Customer-facing receipt URL — deferred (was option D).
- A "Send receipt" affordance from Sales History — deferred. The new endpoint will support it but no UI is added there.

## Backend

### `POST /api/sales/:id/resend-receipt`

- **Auth:** `protect` middleware. Any authenticated user can resend — but only for sales in their own `shop_id` (enforced inside the use-case).
- **Body:** `{ email?: string | null, phone?: string | null }`. At least one must be present and non-empty.
- **Validation:** 400 if both empty / null. 404 if the sale doesn't exist or doesn't belong to the user's shop.
- **Side effects:**
  1. Update the `sales` row's `customer_email` / `customer_phone` columns (only fields that were provided).
  2. Look up customer by the provided email/phone via `findByEmailOrPhone` to get `wa_opt_in` and `last_inbound_at`.
  3. Call `sendReceipt({ ...sale, customer_email, customer_phone, wa_opt_in, last_inbound_at }, whatsAppClient)`.
- **Response:** `{ success: true, channels: string[] }` where `channels` is inferred from the input — e.g. `['email', 'whatsapp']` if both email and a phone with active WhatsApp session were provided. Used purely for UI feedback; no actual delivery confirmation.

### Use case

New file: `backend/src/use-cases/pos/ResendReceipt.ts`. Takes `saleRepo`, `customerRepo`, optional `whatsAppClient` as constructor args. Single `execute({ saleId, shopId, email, phone })` method that does the validation, update, lookup, and `sendReceipt` call. Returns `{ channels }`.

### Sale repository

Add to `backend/src/repositories/sale-repository.interface.ts`:
```ts
updateContactInfo(saleId: number, email: string | null, phone: string | null): Promise<void>;
```

Implement in `backend/src/repositories/sqlite-sale-repository.ts`:
- If `email` is non-null, set `customer_email = ?`. Same for phone. Build the SET clause dynamically; if both are null, no-op.
- Used by `ResendReceipt`.

### `ProcessSale.ts` — wire WhatsApp

- Add a third optional constructor arg: `whatsAppClient?: IWhatsAppClient`.
- Before calling `sendReceipt(...)`, look up the customer with `customerRepo.findByEmailOrPhone(customer_email, customer_phone, shopId)` and capture `wa_opt_in` + `last_inbound_at`.
- Pass them into the `sendReceipt` payload, plus `whatsAppClient` as the second arg.

### `index.ts` wiring

- Construct the Twilio client + `TwilioWhatsAppClient` once at the top of `index.ts`. Currently `routes/chatbot.ts` constructs its own. To minimize blast radius: leave the chatbot's existing construction alone, and create a *separate* `TwilioWhatsAppClient` instance in `index.ts` for `processSale` and `resendReceiptUseCase`. Both instances read the same env vars, so behavior is identical. (A unification refactor can come later if it becomes a real problem.)
- Construct `resendReceiptUseCase = new ResendReceipt(saleRepo, customerRepo, whatsAppClient)`.
- Mount the new route inline (matches existing pattern of inline route definitions in `index.ts`).

## Frontend

### POS success state — `frontend/src/pages/POS.tsx`

Replace the boolean `saleSuccess` with `successInfo: { id: number; email: string; phone: string } | null`. Set it from the API response when the sale completes (the response includes `saleId`).

Update the success card body:
```tsx
const sentTo = [successInfo.email, successInfo.phone].filter(Boolean);
const hasContact = sentTo.length > 0;

<p>
  {hasContact
    ? t('pos.receipt_sent_to', { recipients: sentTo.join(' & ') })
    : t('pos.no_contact_info')}
</p>
{!hasContact && (
  <button className="btn btn-soft btn-sm" onClick={() => setShowResend(true)}>
    {t('pos.send_receipt', 'Send receipt')}
  </button>
)}
<button className="btn btn-primary" onClick={resetPOS}>{t('pos.new_transaction')}</button>
```

After a successful resend (modal flow below), replace `successInfo.email` / `successInfo.phone` with the values the cashier just entered, so the card flips to "Receipt sent to ..." automatically.

### Resend modal — inline in POS for v1

State:
```tsx
const [showResend, setShowResend] = useState(false);
const [resendEmail, setResendEmail] = useState('');
const [resendPhone, setResendPhone] = useState('');
const [resending, setResending] = useState(false);
const [resendError, setResendError] = useState('');
```

Render `<Modal>` (existing component) with two `<input>` fields and a Send button. Send handler:
1. Validate at least one is non-empty (else set local error)
2. POST `/sales/{successInfo.id}/resend-receipt` with `{ email, phone }`
3. On success: close modal, update `successInfo` to include the new email/phone (triggers card refresh), reset modal state
4. On error: show error message in modal, keep open

### i18n keys

Add under `pos` namespace in both `en-US.json` and `es-DO.json`:

| Key | en-US | es-DO |
|---|---|---|
| `pos.receipt_sent_to` | "Receipt sent to {{recipients}}" | "Recibo enviado a {{recipients}}" |
| `pos.no_contact_info` | "No contact info captured — no receipt sent." | "Sin información de contacto — no se envió recibo." |
| `pos.send_receipt` | "Send receipt" | "Enviar recibo" |
| `pos.email_or_phone_required` | "Enter at least an email or a phone number." | "Ingrese al menos un correo o teléfono." |
| `pos.send` | "Send" | "Enviar" |

(Both the button and the modal title use `pos.send_receipt`.)

### API client

`apiClient` already covers POST. No new client setup needed.

## Testing

### Backend

**`ResendReceipt.test.ts`** (new):
1. Throws on missing email AND phone.
2. Throws on sale not found.
3. Throws on sale belonging to a different shop.
4. Updates `sales.customer_email` when email provided.
5. Updates `sales.customer_phone` when phone provided.
6. Calls `sendReceipt` with the looked-up customer's `wa_opt_in` and `last_inbound_at` when found.
7. Returns `{ channels: ['email'] }` when only email provided.
8. Returns `{ channels: ['email', 'whatsapp'] }` when phone + customer has wa_opt_in + active session window.

(Use a `:memory:` DB and a fake `sendReceipt` spy.)

**`ProcessSale.test.ts`** (existing — extend or add):
- Confirm `sendReceipt` is called with `whatsAppClient` arg when one is passed to the constructor.
- Confirm the customer lookup is invoked and `wa_opt_in` makes it into the payload.

### Frontend

Add to `frontend/src/pages/smoke.test.tsx` (or create a focused `POS.test.tsx`):
1. Sale completes with no contact info → success card shows "No contact info captured" + "Send receipt" button.
2. Clicking "Send receipt" opens a modal with email + phone inputs.
3. Submitting with both empty shows "at least one required" error and does NOT call API.
4. Submitting with email calls `POST /sales/{id}/resend-receipt` with the email.
5. After successful resend, success card shows "Receipt sent to alice@example.com" and the modal closes.

## Verification

- `bash scripts/ai-verify.sh` clean.
- Backend tests: 273 + 8 new (ResendReceipt) + 1 (ProcessSale extension) = 282.
- Frontend tests: 33 + 5 new = 38.
- Manual smoke: open `/pos`, ring up a sale without entering email/phone, click "Send receipt", enter an email, confirm card updates.

## Open questions

None.
