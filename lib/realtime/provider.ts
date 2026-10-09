/** Abstraksi provider realtime: ganti implementasi tanpa menyentuh game engine. */
export interface RealtimeProvider {
  readonly name: string;
  readonly configured: boolean;
  publish(channel: string, event: string, payload: unknown): Promise<void>;
  authorizeChannel(socketId: string, channel: string): { auth: string } | null;
}
