import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET minimal 32 karakter'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  REALTIME_PROVIDER: z.enum(['none', 'pusher']).default('none'),
  PUSHER_APP_ID: z.string().optional(),
  PUSHER_KEY: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  PUSHER_CLUSTER: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  OWNER_USERNAME: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Dibaca secara lazy supaya build tidak gagal bila env belum diisi. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Konfigurasi environment tidak valid: ${message}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => process.env.NODE_ENV === 'production';
