import { createHmac } from 'node:crypto';

export function verifyTwilioSignature(input: {
  authToken: string;
  signature: string;
  url: string;
  params: Record<string, string>;
}): boolean {
  try {
    // Twilio signature verification: HMAC-SHA1(url + sorted params, authToken)
    let data = input.url;
    const sortedKeys = Object.keys(input.params).sort();
    for (const key of sortedKeys) {
      data += key + input.params[key];
    }

    const expected = createHmac('sha1', input.authToken).update(data).digest('base64');
    return input.signature === expected;
  } catch {
    return false;
  }
}
