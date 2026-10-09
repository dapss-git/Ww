import Pusher from 'pusher';
import type { RealtimeProvider } from './provider';

export class PusherProvider implements RealtimeProvider {
  readonly name = 'pusher';
  readonly configured = true;
  private client: Pusher;

  constructor(opts: { appId: string; key: string; secret: string; cluster: string }) {
    this.client = new Pusher({ ...opts, useTLS: true });
  }

  async publish(channel: string, event: string, payload: unknown): Promise<void> {
    await this.client.trigger(channel, event, payload);
  }

  authorizeChannel(socketId: string, channel: string): { auth: string } | null {
    return this.client.authorizeChannel(socketId, channel) as { auth: string };
  }
}
