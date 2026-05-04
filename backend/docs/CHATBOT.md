# BarbaSys WhatsApp Chatbot Documentation

## Overview
The BarbaSys chatbot is a WhatsApp-based conversational interface that allows customers to:
- View their next appointment
- Book new appointments
- Reschedule existing appointments
- Cancel appointments
- Ask frequently asked questions

## Architecture

### Message Flow
```
WhatsApp Webhook (Twilio)
    ↓
POST /webhooks/whatsapp
    ↓
Parse inbound message
    ↓
Rate limit check
    ↓
Resolve/create customer
    ↓
LLM intent classification
    ↓
Route to appropriate flow
    ↓
Send response + save to history
```

### Core Components

#### 1. **Intent Routing** (`handle-inbound-message.ts`)
- Receives raw WhatsApp messages via Twilio webhook
- Parses message content and sender information
- Checks rate limits (10 messages per 60 seconds per phone)
- Resolves customer from phone number (creates if new)
- Calls LLM to classify intent
- Dispatches to appropriate flow based on intent

#### 2. **Intent Classification** (`route-intent.ts`)
Uses OpenAI's `gpt-4o-mini` model to classify user intent:
- `book`: Schedule new appointment
- `view_next`: Show next appointment
- `cancel`: Cancel appointment
- `reschedule`: Change appointment
- `faq`: Answer common questions
- `unknown`: Show main menu

#### 3. **Conversational Flows**
Each flow is a state machine that guides multi-step interactions:

**BookAppointmentFlow** (7 states)
1. Select barber
2. Confirm barber
3. Select service
4. Confirm service
5. Select date
6. Select time
7. Confirm & create

**ViewNextFlow** (1 state)
- Query next appointment
- Format and display or "no appointments" message

**CancelFlow** (3 states)
1. List appointments
2. Select appointment
3. Confirm cancellation & delete

**RescheduleFlow** (7 states)
1. List appointments
2. Select appointment
3. Choose new barber
4. Choose new service
5. Choose new date
6. Choose new time
7. Confirm & update

**FAQFlow** (1 state)
- Accept customer question
- Query LLM for answer
- Format and send response

#### 4. **Session Window** (`session-window.ts`)
Determines if customer is "in session" (last message within 24 hours):
```typescript
isInSessionWindow(lastInboundAt: string): boolean
```
Used for:
- Preferring WhatsApp over SMS/Email for notifications
- Determining if casual messaging is allowed

#### 5. **Messaging** (`communication.ts`)
Sends notifications with intelligent channel selection:
- **Receipts** (after purchase)
- **Appointment confirmations/reminders**
- **Cancellation notices**

Channel priority:
1. WhatsApp (if opted-in AND in-session)
2. Email (if configured)
3. SMS (if phone available)

#### 6. **Rate Limiting** (`phone-rate-limiter.ts`)
In-memory rate limiter:
- 10 messages per 60-second window per phone
- Sliding window implementation
- TTL-based cleanup of expired entries

Configured in `src/routes/chatbot.ts`:
```typescript
const rateLimiter = new PhoneRateLimiter({
  maxRequests: 10,
  windowMs: 60000 // 1 minute
});
```

## Bilingual Support

All user-facing text supports Spanish (es-DO) and English (en-US):
- Controlled by `conversation.language` field
- i18n keys in `src/locales/{es-DO,en-US}.json`
- Menu, errors, and notifications all translated

Example conversation initialization:
```typescript
// Default to Spanish, but customer can switch languages
const conversation = await convRepo.create({
  language: 'es', // Spanish by default
  // ...
});
```

## Customer Opt-In and Data

### WhatsApp Opt-In
- **Implicit**: Customer opts-in by sending first WhatsApp message
- **Storage**: `customers.wa_opt_in` (0/1 boolean)
- **Timestamp**: `customers.wa_opt_in_at` (when they opted in)
- **Usage**: Determines if WhatsApp channel is preferred for notifications

### Session Tracking
- **last_inbound_at**: Stored in `conversations` table
- **Purpose**: Determine if customer is "in session" (24-hour window)
- **Updated**: Every inbound message

## API Endpoints

### POST /webhooks/whatsapp
Receive inbound messages from WhatsApp (Twilio webhook)

**Request Body** (URL-encoded):
```
From=whatsapp:+15551234567&
To=+1234567890&
Body=Hello&
MessageSid=SMxxxxxxxxx
```

**Response** (200 OK):
```json
{
  "customerId": 123,
  "conversationId": 456,
  "inboundMessageId": 789
}
```

**Error** (500):
```json
{
  "error": "Rate limit exceeded for phone: +15551234567"
}
```

## Database Schema

### Key Tables
- `customers`: User profiles with opt-in status
- `conversations`: Chat sessions (language, state, context)
- `wa_messages`: Individual messages (in/out, body, status)
- `appointments`: Bookings (date, barber, service, status)
- `barbers`: Staff profiles with Google Calendar credentials

### Important Columns
- `conversations.language`: 'es' or 'en'
- `conversations.state`: Current flow state
- `conversations.context_json`: Flow-specific data
- `conversations.last_inbound_at`: Last customer message timestamp
- `customers.wa_opt_in`: WhatsApp consent (0/1)
- `wa_messages.direction`: 'in' or 'out'

## Environment Variables

Required for chatbot operation:
```
OPENAI_API_KEY=sk-...              # For intent classification
TWILIO_PHONE=+1234567890            # WhatsApp business phone
TWILIO_SID=ACxxxxxxxx              # Twilio account SID
TWILIO_AUTH=yyyyyyyyyy             # Twilio auth token
EMAIL_USER=noreply@barbasys.com    # Gmail sender
EMAIL_PASS=xxxx xxxx xxxx xxxx     # Gmail app password
SHOP_PHONE=+1-800-000-0000         # Default shop phone for responses
```

## Testing

All flows have comprehensive test suites:
```bash
npm test -- handle-inbound-message.test.ts
npm test -- book-appointment.test.ts
npm test -- view-next-flow.test.ts
npm test -- cancel-flow.test.ts
npm test -- reschedule-flow.test.ts
npm test -- session-window.test.ts
npm test -- phone-rate-limiter.test.ts
```

## Common Scenarios

### Scenario 1: New Customer Books Appointment
1. Customer sends "quiero agendar" (I want to book)
2. Bot classifies as `book` intent
3. BookAppointmentFlow starts (state: select_barber)
4. Bot asks "¿Con cuál barbero?" (Which barber?)
5. Customer replies "Juan"
6. Flow moves to select_service, then date, then time
7. Customer confirms
8. Appointment created, customer receives WhatsApp + email confirmation

### Scenario 2: Appointment Reminder Sent
1. Cron job identifies upcoming appointments
2. Calls `sendAppointmentNotification()`
3. For opted-in customers with recent activity → WhatsApp
4. Otherwise → Email → SMS
5. Message includes date, time, barber name

### Scenario 3: Rate Limit Triggered
1. Customer sends 11 messages in 60 seconds
2. Rate limiter rejects 11th message
3. Handler throws error
4. Express error handler catches and responds with 500
5. Message is not processed or stored

## Monitoring and Debugging

### Key Logs
- `[Retention]`: Purge operation results
- `[Calendar]`: Watch renewal success/failure
- `Email sent to {email}`: Receipt/notification delivery
- `Error handling inbound message`: Flow failures

### Debug Mode
Enable verbose logging by setting:
```bash
DEBUG=barbasys:* npm start
```

## Future Enhancements

1. **Multi-language support** (add French, Portuguese, etc.)
2. **Rich media support** (photos, files in WhatsApp)
3. **Callback scheduling** ("call me in 2 hours")
4. **Customer feedback** (rate appointment, review service)
5. **Proactive outreach** (birthday specials, seasonal promotions)
6. **AI improvements** (few-shot learning, custom intent classifiers)
