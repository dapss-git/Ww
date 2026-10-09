import type { RealtimeProvider } from './provider';

/** Tanpa provider: client mengandalkan polling ke endpoint state (tetap server-authoritative). */
export class NoopProvider implements RealtimeProvider {
  readonly name = 'none';
  readonly configured = false;
  async publish(): Promise<void> {}
  authorizeChannel(): { auth: string } | null {
    return null;
  }
}
