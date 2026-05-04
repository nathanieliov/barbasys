export interface ParsedInbound {
  from: string;
  to: string;
  body: string | null;
  mediaUrl: string | null;
  sid: string;
}

export function parseTwilioInbound(payload: Record<string, string>): ParsedInbound {
  const stripPrefix = (phone: string): string => {
    return phone.startsWith('whatsapp:') ? phone.slice(9) : phone;
  };

  const bodyText = payload.Body?.trim() || null;
  const mediaUrl = payload.MediaUrl0 ? payload.MediaUrl0 : null;

  return {
    from: stripPrefix(payload.From),
    to: stripPrefix(payload.To),
    body: bodyText || null,
    mediaUrl,
    sid: payload.MessageSid,
  };
}
