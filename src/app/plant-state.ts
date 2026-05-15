// state types for the plant-tree server action.
// kept out of actions.ts (next.js 16 disallows non-async exports there).

import type { FieldMode } from '@/types/domain';

export type PlantTreeState = {
  ok: boolean;
  error?: 'nameRequired' | 'modeRequired' | 'serverError';
  // when ok=true, the new tree's id is returned so the client can react
  // (close the modal, focus the tree, toast, etc.)
  treeId?: string;
};

export const initialPlantState: PlantTreeState = { ok: false };

export const ALL_MODES: readonly FieldMode[] = [
  'project',
  'wish',
  'diary',
  'note',
] as const;
