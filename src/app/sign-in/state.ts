// shared state types/values for the sign-in flow.
// kept out of actions.ts because next.js 16 disallows non-async exports
// from 'use server' files.

export type SendMagicLinkState = {
  ok: boolean;
  error?: 'invalidEmail' | 'sendFailed';
};

export const initialState: SendMagicLinkState = { ok: false };
