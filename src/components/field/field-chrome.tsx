'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { letMemoFall, witherTree } from '@/app/actions';
import { copy } from '@/lib/copy';
import { emitToast } from '@/lib/toast-bus';
import type { FieldMode } from '@/types/domain';
import type { NoteInput } from '@/lib/three/note-mesh';
import type { SceneTree } from '@/lib/three/scene';
import { ConfirmModal } from './confirm-modal';
import { DetailPanel, type DetailMemo, type DetailTree } from './detail-panel';
import { FallenTray, type FallenItem } from './fallen-tray';
import { Compass } from './compass';
import { Crosshair } from './crosshair';
import { FieldCanvas } from './field-canvas';
import { FieldFooter } from './field-footer';
import { FieldNav } from './field-nav';
import { IndexPanel, type IndexTree } from './index-panel';
import { MemoView } from './memo-view';
import { PlantFab } from './fab';
import { PlantModal } from './plant-modal';
import { Toaster } from './toast';

export interface FieldTreeData extends SceneTree {
  ord: number;
  name: string;
  year: string | null;
  lead: string | null;
  description: string | null;
  memos: DetailMemo[];
}

interface Props {
  handle: string;
  trees: FieldTreeData[];
  fallen: FallenItem[];
  firstTime: boolean;
  fieldMode: FieldMode | null;
  defaultLead: string;
}

type ConfirmTarget =
  | { kind: 'witherTree'; treeId: string }
  | { kind: 'letMemoFall'; memoId: string }
  | null;

export function FieldChrome({
  handle,
  trees,
  fallen,
  firstTime,
  fieldMode,
  defaultLead,
}: Props) {
  const [plantOpen, setPlantOpen] = useState(firstTime);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [fallenOpen, setFallenOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  // tree to fly the camera to once it lands in the scene (set after a plant)
  const [focusTreeId, setFocusTreeId] = useState<string | null>(null);
  // bumped to recenter the camera (footer "↑ recenter")
  const [recenterNonce, setRecenterNonce] = useState(0);
  // index into the selected tree's memos for the fullscreen-ish memo reader
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const router = useRouter();

  // memo viewer closes whenever the selected tree changes
  useEffect(() => {
    setViewerIndex(null);
  }, [selectedTreeId]);

  const memoCount = useMemo(
    () => trees.reduce((sum, t) => sum + t.memos.length, 0),
    [trees],
  );

  const indexTrees = useMemo<IndexTree[]>(
    () =>
      trees.map((t) => ({
        id: t.id,
        ord: t.ord,
        name: t.name,
        lead: t.lead,
        year: t.year,
        memoCount: t.memos.length,
        memoHaystack: t.memos
          .map((m) => m.text)
          .join(' ')
          .toLowerCase(),
      })),
    [trees],
  );

  const sceneTrees = useMemo<SceneTree[]>(
    () => trees.map((t) => ({ id: t.id, x: t.x, z: t.z, seed: t.seed })),
    [trees],
  );

  const memosByTreeId = useMemo<Record<string, NoteInput[]>>(() => {
    const out: Record<string, NoteInput[]> = {};
    for (const t of trees) {
      out[t.id] = t.memos.map((m) => ({
        id: m.id,
        text: m.text,
        author: m.author,
        createdAt: new Date(m.createdAt).getTime(),
      }));
    }
    return out;
  }, [trees]);

  const selectedTree = useMemo<DetailTree | null>(() => {
    if (!selectedTreeId) return null;
    const t = trees.find((x) => x.id === selectedTreeId);
    if (!t) return null;
    return {
      id: t.id,
      ord: t.ord,
      name: t.name,
      year: t.year,
      lead: t.lead,
      description: t.description,
    };
  }, [selectedTreeId, trees]);

  const selectedMemos = useMemo<DetailMemo[]>(() => {
    if (!selectedTreeId) return [];
    const t = trees.find((x) => x.id === selectedTreeId);
    return t?.memos ?? [];
  }, [selectedTreeId, trees]);

  const handleTreeClick = useCallback((id: string | null) => {
    setSelectedTreeId(id);
  }, []);
  const handleClosePanel = useCallback(() => {
    setSelectedTreeId(null);
  }, []);
  const handleRequestWither = useCallback((treeId: string) => {
    setConfirmTarget({ kind: 'witherTree', treeId });
  }, []);
  const handleRequestMemoFall = useCallback((memoId: string) => {
    setConfirmTarget({ kind: 'letMemoFall', memoId });
  }, []);

  // memo viewer — index is clamped against the live memo list
  const viewerMemo =
    viewerIndex != null ? (selectedMemos[viewerIndex] ?? null) : null;

  async function handleConfirm() {
    if (!confirmTarget) return;
    if (confirmTarget.kind === 'witherTree') {
      const treeId = confirmTarget.treeId;
      setConfirmTarget(null);
      setSelectedTreeId(null);
      await witherTree(treeId);
      emitToast(copy.toast.treeWithered);
      router.refresh();
    } else {
      const memoId = confirmTarget.memoId;
      setConfirmTarget(null);
      await letMemoFall(memoId);
      emitToast(copy.toast.memoFell);
      router.refresh();
    }
  }

  const panelOpen = selectedTreeId !== null;

  return (
    <>
      <FieldNav
        handle={handle}
        treeCount={trees.length}
        selectedOrd={selectedTree?.ord ?? null}
        fallenCount={fallen.length}
        onFallenClick={() => setFallenOpen(true)}
      />

      <FieldCanvas
        trees={sceneTrees}
        memosByTreeId={memosByTreeId}
        selectedTreeId={selectedTreeId}
        focusTreeId={focusTreeId}
        recenterNonce={recenterNonce}
        onTreeClick={handleTreeClick}
      />

      <IndexPanel
        trees={indexTrees}
        selectedTreeId={selectedTreeId}
        onSelectTree={(id) => {
          setSelectedTreeId(id);
          setFocusTreeId(id);
        }}
        onPlant={() => setPlantOpen(true)}
      />

      <DetailPanel
        tree={selectedTree}
        memos={selectedMemos}
        fieldMode={fieldMode}
        defaultAuthor={defaultLead}
        onClose={handleClosePanel}
        onRequestWither={handleRequestWither}
        onRequestMemoFall={handleRequestMemoFall}
        onOpenMemo={(index) => setViewerIndex(index)}
      />

      <MemoView
        memo={viewerMemo}
        index={viewerIndex ?? 0}
        total={selectedMemos.length}
        treeName={selectedTree?.name ?? ''}
        onClose={() => setViewerIndex(null)}
        onPrev={() =>
          setViewerIndex((i) => (i == null ? null : Math.max(0, i - 1)))
        }
        onNext={() =>
          setViewerIndex((i) =>
            i == null ? null : Math.min(selectedMemos.length - 1, i + 1),
          )
        }
        onLetFall={(memoId) => {
          setViewerIndex(null);
          setConfirmTarget({ kind: 'letMemoFall', memoId });
        }}
      />

      <FallenTray
        open={fallenOpen}
        items={fallen}
        onClose={() => setFallenOpen(false)}
      />

      <ConfirmModal
        open={confirmTarget !== null}
        variant={confirmTarget?.kind ?? 'witherTree'}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
      />

      <PlantFab
        onClick={() => setPlantOpen(true)}
        hidden={
          firstTime ||
          panelOpen ||
          fallenOpen ||
          plantOpen ||
          confirmTarget !== null
        }
      />

      <PlantModal
        open={plantOpen}
        fieldMode={fieldMode}
        defaultLead={defaultLead}
        onClose={firstTime ? undefined : () => setPlantOpen(false)}
        onPlanted={(treeId) => {
          setPlantOpen(false);
          setSelectedTreeId(null);
          setFocusTreeId(treeId);
          router.refresh();
        }}
      />

      <FieldFooter
        treeCount={trees.length}
        memoCount={memoCount}
        season={null}
        phase={null}
        locating={false}
        onLocate={() => {}}
        onRecenter={() => setRecenterNonce((n) => n + 1)}
      />

      <Compass />
      <Crosshair />
      <Toaster />
    </>
  );
}
