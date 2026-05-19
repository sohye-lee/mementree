'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { plantTree } from '@/app/actions';
import { initialPlantState } from '@/app/action-state';
import { copy } from '@/lib/copy';
import { emitToast } from '@/lib/toast-bus';
import type { FieldMode, TreeAccess } from '@/types/domain';
import { AccessToggle } from './access-toggle';
import styles from './plant-modal.module.css';

const c = copy.plant;

interface Props {
  open: boolean;
  // the field this tree is planted into
  fieldId: string;
  // the field's kind — fixed at field creation; shapes the modal title
  fieldMode: FieldMode | null;
  defaultLead: string;
  onClose: () => void;
  onPlanted?: (treeId: string) => void;
}

export function PlantModal({
  open,
  fieldId,
  fieldMode,
  defaultLead,
  onClose,
  onPlanted,
}: Props) {
  const [chosenAccess, setChosenAccess] = useState<TreeAccess>('public');
  const [state, formAction, pending] = useActionState(
    plantTree,
    initialPlantState,
  );
  const nameRef = useRef<HTMLInputElement>(null);

  // focus name on open
  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  // notify parent on success — exactly once per planted tree.
  // useActionState keeps `state.ok` true after a plant, so without the
  // treeId guard this effect would re-fire (and re-close the modal) every
  // time the modal is reopened. each plant produces a fresh treeId.
  const handledTreeId = useRef<string | null>(null);
  useEffect(() => {
    if (state.ok && state.treeId && state.treeId !== handledTreeId.current) {
      handledTreeId.current = state.treeId;
      setChosenAccess('public');
      emitToast(
        state.treeName
          ? `${copy.toast.planted} · ${state.treeName}`
          : copy.toast.planted,
      );
      onPlanted?.(state.treeId);
    }
  }, [state.ok, state.treeId, state.treeName, onPlanted]);

  if (!open) return null;

  const errorMessage = (() => {
    if (state.error === 'nameRequired') return c.errors.nameRequired;
    if (state.error === 'serverError') return c.errors.serverError;
    return null;
  })();

  const titleText = c.again.title.replace('%mode%', fieldMode ?? 'tree');

  return (
    <div
      className={styles.veil}
      role="dialog"
      aria-modal="true"
      aria-label={titleText}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        <h2 className={styles.title}>{titleText}</h2>
        <p className={styles.lede}>{c.again.lede}</p>

        <form className={styles.form} action={formAction} noValidate>
          <input type="hidden" name="fieldId" value={fieldId} />

          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              {c.fields.name.label}
            </label>
            <input
              ref={nameRef}
              className={styles.input}
              id="name"
              name="name"
              type="text"
              maxLength={40}
              autoComplete="off"
              placeholder={c.fields.name.placeholder}
              disabled={pending}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="year">
                {c.fields.year.label}
              </label>
              <input
                className={styles.input}
                id="year"
                name="year"
                type="text"
                maxLength={4}
                inputMode="numeric"
                placeholder={c.fields.year.placeholder}
                disabled={pending}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lead">
                {c.fields.lead.label}
              </label>
              <input
                className={styles.input}
                id="lead"
                name="lead"
                type="text"
                maxLength={24}
                defaultValue={defaultLead}
                placeholder={c.fields.lead.placeholder}
                disabled={pending}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="brief">
              {c.fields.brief.label}
            </label>
            <textarea
              className={styles.textarea}
              id="brief"
              name="brief"
              rows={3}
              maxLength={180}
              placeholder={c.fields.brief.placeholder}
              disabled={pending}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{copy.treeAccess.label}</label>
            <AccessToggle
              value={chosenAccess}
              onChange={setChosenAccess}
              disabled={pending}
            />
            <input type="hidden" name="access" value={chosenAccess} />
          </div>

          <div className={styles.foot}>
            <span className={styles.help}>{c.again.foot}</span>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={onClose}
                disabled={pending}
              >
                {c.cancel}
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={pending}
              >
                {pending ? c.submitting : `${c.again.submit} →`}
              </button>
            </div>
          </div>

          {errorMessage && <p className={styles.errorLine}>{errorMessage}</p>}
        </form>
      </div>
    </div>
  );
}
