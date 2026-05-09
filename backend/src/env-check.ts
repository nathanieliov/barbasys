type FeatureCheck = {
  feature: string;
  vars: string[];
};

const OPTIONAL_FEATURES: FeatureCheck[] = [
  { feature: 'WhatsApp inbound (Twilio)', vars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'] },
  { feature: 'LLM intent routing (OpenAI)', vars: ['OPENAI_API_KEY'] },
  { feature: 'Email receipts (SMTP)', vars: ['EMAIL_USER', 'EMAIL_PASS'] },
  { feature: 'Google Calendar sync', vars: ['GCAL_REDIRECT_URI'] },
];

export function validateEnv(): void {
  if (process.env.NODE_ENV === 'test') return;

  const jwt = process.env.JWT_SECRET;
  if (!jwt || jwt.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long. Refusing to start.');
  }

  const disabled: string[] = [];
  for (const { feature, vars } of OPTIONAL_FEATURES) {
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      disabled.push(`${feature} — missing ${missing.join(', ')}`);
    }
  }

  if (disabled.length > 0) {
    console.warn('[env-check] Optional features disabled:');
    for (const line of disabled) console.warn(`  - ${line}`);
  } else {
    console.log('[env-check] All optional features configured.');
  }
}
