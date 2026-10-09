import { z } from 'zod';

export const RESERVED_USERNAMES = ['admin', 'owner', 'root', 'system', 'moderator', 'support', 'werewolf', 'api', 'null', 'undefined'];

export const usernameSchema = z
  .string({ required_error: 'Username wajib diisi' })
  .trim()
  .toLowerCase()
  .min(3, 'Username minimal 3 karakter')
  .max(20, 'Username maksimal 20 karakter')
  .regex(/^[a-z0-9_]+$/, 'Username hanya boleh huruf kecil, angka, dan underscore');

export const passwordSchema = z
  .string({ required_error: 'Password wajib diisi' })
  .min(8, 'Password minimal 8 karakter')
  .max(64, 'Password maksimal 64 karakter')
  .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
  .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
  .regex(/[0-9]/, 'Password harus mengandung angka');

export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Konfirmasi password tidak cocok' });

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Username wajib diisi').max(40),
  password: z.string().min(1, 'Password wajib diisi').max(128),
  remember: z.boolean().default(false),
});
