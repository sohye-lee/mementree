// shared state types for server actions used via useActionState.
// kept out of actions.ts since next.js 16 disallows non-async exports there.

import type { FieldMode } from '@/types/domain';

export const ALL_MODES: readonly FieldMode[] = [
  'project',
  'wish',
  'diary',
  'note',
] as const;

export type CreateFieldState = {
  ok: boolean;
  error?: 'nameRequired' | 'modeRequired' | 'serverError';
};

export const initialCreateFieldState: CreateFieldState = { ok: false };

export type PlantTreeState = {
  ok: boolean;
  error?: 'nameRequired' | 'serverError';
  treeId?: string;
  treeName?: string;
};

export const initialPlantState: PlantTreeState = { ok: false };

export type TieMemoState = {
  ok: boolean;
  error?: 'textRequired' | 'serverError';
  memoId?: string;
};

export const initialTieMemoState: TieMemoState = { ok: false };
