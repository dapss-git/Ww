import { env } from '@/lib/env';
import { NoopProvider } from './noop';
import { PusherProvider } from './pusher';
import type { RealtimeProvider } from './provider';
import type { OutboundEvent } from '@/types/realtime';

let provider: RealtimeProvider | null = null;

export function getRealtime(): RealtimeProvider {
  if (provider) return provider;
  const e = env();
  if (e.REALTIME_PROVIDER === 'pusher' && e.PUSHER_APP_ID && e.PUSHER_KEY && e.PUSHER_SECRET && e.PUSHER_CLUSTER) {
    provider = new PusherProvider({ appId: e.PUSHER_APP_ID, key: e.PUSHER_KEY, secret: e.PUSHER_SECRET, cluster: e.PUSHER_CLUSTER });
  } else {
    provider = new NoopProvider();
  }
  return provider;
}

/** Publikasikan event setelah transaksi database commit. Kegagalan realtime tidak boleh merusak game. */
export async function emitAll(events: OutboundEvent[]): Promise<void> {
  if (events.length === 0) return;
  const rt = getRealtime();
  if (!rt.configured) return;
  await Promise.all(
    events.map((e) => rt.publish(e.channel, e.event, e.payload).catch((err) => console.error('[realtime] publish gagal:', err instanceof Error ? err.message : err))),
  );
}
