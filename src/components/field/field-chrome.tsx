'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FieldMode } from '@/types/domain';
import { FieldCanvas } from './field-canvas';
import { DetailPanel, type DetailTree } from './detail-panel';
import { PlantFab } from './fab';
import { PlantModal } from './plant-modal';
import type { SceneTree } from '@/lib/three/scene';

// chrome = the floating ui that sits on top of the 3d scene.
// owns:
//   - the plant modal (open on FAB, forced open during first-time onboarding)
//   - the detail panel (open on tree click)
//   - the selected tree id (passed down to the scene as well)

export interface FieldTreeData extends SceneTree {
  ord: number;
  name: string;
  year: string | null;
  lead: string | null;
  description: string | null;
}

interface Props {
  trees: FieldTreeData[];
  firstTime: boolean;
  fieldMode: FieldMode | null;
  defaultLead: string;
}

export function FieldChrome({
  trees,
  firstTime,
  fieldMode,
  defaultLead,
}: Props) {
  const [plantOpen, setPlantOpen] = useState(firstTime);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const router = useRouter();

  // simplified data for the three.js scene
  const sceneTrees = useMemo<SceneTree[]>(
    () => trees.map((t) => ({ id: t.id, x: t.x, z: t.z, seed: t.seed })),
    [trees],
  );

  // full data for the detail panel
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

  const handleTreeClick = useCallback((id: string | null) => {
    setSelectedTreeId(id);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedTreeId(null);
  }, []);

  const panelOpen = selectedTreeId !== null;

  return (
    <>
      <FieldCanvas
        trees={sceneTrees}
        selectedTreeId={selectedTreeId}
        onTreeClick={handleTreeClick}
      />

      <DetailPanel
        tree={selectedTree}
        fieldMode={fieldMode}
        onClose={handleClosePanel}
      />

      <PlantFab
        onClick={() => setPlantOpen(true)}
        hidden={firstTime || panelOpen}
      />

      <PlantModal
        open={plantOpen}
        fieldMode={fieldMode}
        defaultLead={defaultLead}
        onClose={firstTime ? undefined : () => setPlantOpen(false)}
        onPlanted={() => {
          setPlantOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
