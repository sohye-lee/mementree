'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { letMemoFall, setTreeAccess, witherTree } from '@/app/actions';
import { copy } from '@/lib/copy';
import { emitToast } from '@/lib/toast-bus';
import { useEnvironment } from '@/lib/use-environment';
import type { FieldMode, TreeAccess } from '@/types/domain';
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
import { ShareModal } from './share-modal';
import { Toaster } from './toast';

export interface FieldTreeData extends SceneTree {
  ord: number;
  name: string;
  year: string | null;
  lead: string | null;
  description: string | null;
  access: TreeAccess;
  memos: DetailMemo[];
}

export type ViewerRole = 'keeper' | 'visitor';

interface Props {
  // 'keeper' = the field's owner; 'visitor' = anyone else
  role: ViewerRole;
  // a signed-in viewer (keeper, or a signed-in visitor) may tie memos
  canMemo: boolean;
  viewerSignedIn: boolean;
  handle: string;
  slug: string;
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
  role,
  canMemo,
  viewerSignedIn,
  handle,
  slug,
  trees,
  fallen,
  firstTime,
  fieldMode,
  defaultLead,
}: Props) {
  const isKeeper = role === 'keeper';

  const [plantOpen, setPlantOpen] = useState(firstTime);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [fallenOpen, setFallenOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  // tree to fly the camera to; focusNonce bumps on every request so
  // re-selecting the same tree re-centers it.
  const [focusTreeId, setFocusTreeId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  // bumped to recenter the camera (footer "↑ recenter")
  const [recenterNonce, setRecenterNonce] = useState(0);
  // index into the selected tree's memos for the close-reading memo card
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const router = useRouter();

  // local sky — sun phase, season, weather
  const env = useEnvironment();

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
      access: t.access,
    };
  }, [selectedTreeId, trees]);

  const selectedMemos = useMemo<DetailMemo[]>(() => {
    if (!selectedTreeId) return [];
    const t = trees.find((x) => x.id === selectedTreeId);
    return t?.memos ?? [];
  }, [selectedTreeId, trees]);

  const requestFocus = useCallback((id: string) => {
    setFocusTreeId(id);
    setFocusNonce((n) => n + 1);
  }, []);

  const handleTreeClick = useCallback(
    (id: string | null) => {
      setSelectedTreeId(id);
      if (id) requestFocus(id);
    },
    [requestFocus],
  );
  const handleClosePanel = useCallback(() => {
    setSelectedTreeId(null);
  }, []);
  const handleRequestWither = useCallback((treeId: string) => {
    setConfirmTarget({ kind: 'witherTree', treeId });
  }, []);
  const handleRequestMemoFall = useCallback((memoId: string) => {
    setConfirmTarget({ kind: 'letMemoFall', memoId });
  }, []);

  const handleSetAccess = useCallback(
    async (treeId: string, access: TreeAccess) => {
      await setTreeAccess(treeId, access);
      router.refresh();
    },
    [router],
  );

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
        isKeeper={isKeeper}
        viewerSignedIn={viewerSignedIn}
        handle={handle}
        treeCount={trees.length}
        selectedOrd={selectedTree?.ord ?? null}
        fallenCount={fallen.length}
        onFallenClick={() => setFallenOpen(true)}
        onShareClick={() => setShareOpen(true)}
      />

      <FieldCanvas
        trees={sceneTrees}
        memosByTreeId={memosByTreeId}
        selectedTreeId={selectedTreeId}
        focusTreeId={focusTreeId}
        focusNonce={focusNonce}
        recenterNonce={recenterNonce}
        phase={env.phase}
        weather={env.weather}
        onTreeClick={handleTreeClick}
      />

      <IndexPanel
        trees={indexTrees}
        selectedTreeId={selectedTreeId}
        canPlant={isKeeper}
        onSelectTree={(id) => {
          setSelectedTreeId(id);
          requestFocus(id);
        }}
        onPlant={() => setPlantOpen(true)}
      />

      <DetailPanel
        tree={selectedTree}
        memos={selectedMemos}
        fieldMode={fieldMode}
        defaultAuthor={defaultLead}
        canManage={isKeeper}
        canMemo={canMemo}
        onClose={handleClosePanel}
        onRequestWither={handleRequestWither}
        onRequestMemoFall={handleRequestMemoFall}
        onOpenMemo={(index) => setViewerIndex(index)}
        onSetAccess={handleSetAccess}
        onMemoTied={() => router.refresh()}
      />

      <MemoView
        memo={viewerMemo}
        index={viewerIndex ?? 0}
        total={selectedMemos.length}
        treeName={selectedTree?.name ?? ''}
        canManage={isKeeper}
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

      {isKeeper && (
        <>
          <FallenTray
            open={fallenOpen}
            items={fallen}
            onClose={() => setFallenOpen(false)}
          />

          <ShareModal
            open={shareOpen}
            handle={handle}
            slug={slug}
            onClose={() => setShareOpen(false)}
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
              shareOpen ||
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
              requestFocus(treeId);
              router.refresh();
            }}
          />
        </>
      )}

      <FieldFooter
        treeCount={trees.length}
        memoCount={memoCount}
        season={env.season}
        phase={env.phase}
        locating={env.locating}
        onLocate={env.requestLocation}
        onRecenter={() => setRecenterNonce((n) => n + 1)}
      />

      <Compass />
      <Crosshair />
      <Toaster />
    </>
  );
}
