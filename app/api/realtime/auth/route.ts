import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AppError, fail } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { getRealtime } from '@/lib/realtime';
import { userChannel } from '@/lib/realtime/channels';

/** Otorisasi channel privat Pusher: user hanya boleh subscribe ke channel miliknya. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const form = await req.formData();
  const socketId = String(form.get('socket_id') ?? '');
  const channel = String(form.get('channel_name') ?? '');
  if (!socketId || channel !== userChannel(user.id)) throw new AppError('FORBIDDEN', 'Channel tidak diizinkan.');
  const auth = getRealtime().authorizeChannel(socketId, channel);
  if (!auth) return fail('NOT_FOUND', 'Realtime tidak dikonfigurasi.');
  return NextResponse.json(auth);
});
