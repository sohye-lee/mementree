'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FieldMode } from '@/types/domain';
import { PlantFab } from './fab';
import { PlantModal } from './plant-modal';

// chrome = the floating ui that sits on top of the 3d scene.
// owns: the plant modal open/close state, the FAB.
//
// the modal is forced open when there are no trees yet (firstTime).
// otherwise the FAB toggles it.

interface Props {
  firstTime: boolean;
  fieldMode: FieldMode | null;
  defaultLead: string;
}

export function FieldChrome({ firstTime, fieldMode, defaultLead }: Props) {
  const [open, setOpen] = useState(firstTime);
  const router = useRouter();

  // if the prop changes after a server revalidation (e.g. first tree planted),
  // sync the local state so the modal closes naturally.
  useEffect(() => {
    if (!firstTime) return;
    setOpen(true);
  }, [firstTime]);

  return (
    <>
      <PlantFab onClick={() => setOpen(true)} hidden={firstTime} />
      <PlantModal
        open={open}
        fieldMode={fieldMode}
        defaultLead={defaultLead}
        // first plant has no cancel — keeper must commit
        onClose={firstTime ? undefined : () => setOpen(false)}
        onPlanted={() => {
          setOpen(false);
          // server already revalidated; nudge the router so the new tree
          // appears in the scene without a manual refresh.
          router.refresh();
        }}
      />
    </>
  );
}
