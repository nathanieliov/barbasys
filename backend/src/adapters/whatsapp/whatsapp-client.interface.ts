export interface IWhatsAppClient {
  sendText(to: string, body: string): Promise<{ sid: string | null; status: string }>;
  sendList(
    to: string,
    header: string,
    body: string,
    buttonText: string,
    items: Array<{ id: string; title: string }>,
  ): Promise<{ sid: string | null; status: string }>;
}
