'use client';

import Pusher, { type Channel } from 'pusher-js';

let instance: Pusher | null = null;

export function realtimeEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

function getClient(): Pusher | null {
  if (!realtimeEnabled()) return null;
  instance ??= new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY as string, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string,
    channelAuthorization: { endpoint: '/api/realtime/auth', transport: 'ajax' },
  });
  return instance;
}

/** Subscribe ke channel; semua event diteruskan ke handler sebagai sinyal refresh. */
export function subscribeChannels(channels: string[], onEvent: (event: string) => void): () => void {
  const client = getClient();
  if (!client) return () => undefined;
  const subscribed: Channel[] = [];
  for (const name of channels) {
    const ch = client.subscribe(name);
    ch.bind_global((event: string) => {
      if (!event.startsWith('pusher:')) onEvent(event);
    });
    subscribed.push(ch);
  }
  return () => {
    for (const ch of subscribed) {
      ch.unbind_global();
      client.unsubscribe(ch.name);
    }
  };
}
