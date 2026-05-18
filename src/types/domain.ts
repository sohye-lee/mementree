// mementree — domain types
// source: handoff/data-model.md
// keep in sync with supabase/migrations/*.sql

export type FieldMode = 'project' | 'wish' | 'diary' | 'note';
export type FieldAccess = 'private' | 'unlisted' | 'public';
export type VisitorPerm = 'read' | 'memo' | 'plant';
export type TreeState = 'living' | 'withered';
export type MemoState = 'tied' | 'fallen';
// per-tree visibility: 'public' = any visitor, 'shared' = signed-in visitors only
export type TreeAccess = 'public' | 'shared';

export interface Profile {
  id: string;            // uuid, references auth.users(id)
  handle: string;        // unique, used in URLs: mementree.app/{handle}/...
  displayName: string | null;
  createdAt: string;     // iso
}

export interface Field {
  id: string;            // uuid
  ownerId: string;       // uuid → profiles.id
  slug: string;          // unique within owner
  title: string;
  mode: FieldMode;
  access: FieldAccess;
  visitorPerm: VisitorPerm;
  passwordHash: string | null;
  createdAt: string;
}

export interface Tree {
  id: string;            // uuid
  fieldId: string;
  ord: number;           // insertion order within field
  name: string;          // ≤ 40 char
  year: string | null;   // 'YYYY' or null
  lead: string | null;   // ≤ 24 char
  description: string | null; // ≤ 180 char (DB column 'description'; voice calls it 'desc')
  x: number;             // world coord, meters
  z: number;             // world coord, meters
  seed: number;          // uint32 from hashStr(name); determines tree shape
  state: TreeState;
  access: TreeAccess;
  witheredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Memo {
  id: string;            // uuid (DB-assigned)
  treeId: string;
  ord: number;           // leaf order on the branch
  author: string | null; // null → render as 'anon'
  text: string;          // ≤ 180 char
  state: MemoState;
  fallenAt: string | null;
  createdAt: string;
}

// ui-side capability flags returned with field load.
// the server decides what the current viewer can do; the client only toggles ui.
export interface ViewerCaps {
  canPlant: boolean;
  canMemo: boolean;
  canWither: boolean;
}
