// shared state types for server actions used via useActionState.
// kept out of actions.ts since next.js 16 disallows non-async exports there.

import type { FieldMode } from '@/types/domain';

export type PlantTreeState = {
  ok: boolean;
  error?: 'nameRequired' | 'modeRequired' | 'serverError';
  treeId?: string;
};

export const initialPlantState: PlantTreeState = { ok: false };

export const ALL_MODES: readonly FieldMode[] = [
  'project',
  'wish',
  'diary',
  'note',
] as const;

export type TieMemoState = {
  ok: boolean;
  error?: 'textRequired' | 'serverError';
  memoId?: string;
};

export const initialTieMemoState: TieMemoState = { ok: false };
