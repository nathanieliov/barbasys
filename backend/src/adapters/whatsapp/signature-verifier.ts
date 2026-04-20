import { createHmac } from 'node:crypto';

function computeTwilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  let data = url;
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    data += key + params[key];
  }
  return createHmac('sha1', authToken).update(data).digest('base64');
}

export function verifyTwilioSignature(input: {
  authToken: string;
  signature?: string;
  url: string;
  params: Record<string, string>;
  method?: string;
}): boolean | string {
  try {
    const expected = computeTwilioSignature(input.authToken, input.url, input.params);

    // If signature provided, verify it; otherwise return the computed signature (for testing)
    if (input.signature) {
      return input.signature === expected;
    } else {
      return expected;
    }
  } catch {
    return false;
  }
}
