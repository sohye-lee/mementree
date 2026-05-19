'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createField } from '@/app/actions';
import { ALL_MODES, initialCreateFieldState } from '@/app/action-state';
import { copy } from '@/lib/copy';
import type { FieldMode } from '@/types/domain';
// the new-field modal wears the same onboarding look as the first-plant
// modal — eyebrow, big title, mode-card grid. that styling already lives
// in plant-modal.module.css, so it's reused here rather than duplicated.
import styles from '@/components/field/plant-modal.module.css';

const c = copy.createField;

interface Props {
  open: boolean;
  onClose: () => void;
}

// picks a field's kind + name, then `createField` redirects to the new
// field. mode is frozen at creation — every tree planted later inherits it.
export function CreateFieldModal({ open, onClose }: Props) {
  const [chosenMode, setChosenMode] = useState<FieldMode | null>(null);
  const [state, formAction, pending] = useActionState(
    createField,
    initialCreateFieldState,
  );
  const nameRef = useRef<HTMLInputElement>(null);

  // focus the name input once a kind is chosen
  useEffect(() => {
    if (open && chosenMode) nameRef.current?.focus();
  }, [open, chosenMode]);

  if (!open) return null;

  const errorMessage = (() => {
    if (state.error === 'nameRequired') return c.errors.nameRequired;
    if (state.error === 'modeRequired') return c.errors.modeRequired;
    if (state.error === 'serverError') return c.errors.serverError;
    return null;
  })();

  return (
    <div
      className={styles.veil}
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`${styles.panel} ${styles.first}`}>
        <div className={styles.eyebrow}>
          <span>{c.eyebrow[0]}</span>
          <span className={styles.eyebrowDim}>/</span>
          <span>{c.eyebrow[1]}</span>
        </div>

        <h2 className={styles.title}>{c.title}</h2>
        <p className={styles.lede}>{c.lede}</p>

        <div className={styles.section}>
          <p className={styles.sectionRule}>{c.section1}</p>
          <ul className={styles.modeList}>
            {ALL_MODES.map((m) => {
              const meta = copy.plant.modes[m];
              return (
                <li key={m}>
                  <button
                    type="button"
                    className={`${styles.mode} ${
                      chosenMode === m ? styles.selected : ''
                    }`}
                    onClick={() => setChosenMode(m)}
                  >
                    <span className={styles.modeGlyph} aria-hidden="true">
                      {meta.glyph}
                    </span>
                    <span className={styles.modeBody}>
                      <span className={styles.modeName}>{meta.name}</span>
                      <span className={styles.modeDesc}>{meta.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <form className={styles.form} action={formAction} noValidate>
          <p className={styles.sectionRule}>{c.section2}</p>

          {chosenMode && (
            <input type="hidden" name="mode" value={chosenMode} />
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="field-name">
              {c.nameLabel}
            </label>
            <input
              ref={nameRef}
              className={styles.input}
              id="field-name"
              name="name"
              type="text"
              maxLength={60}
              autoComplete="off"
              placeholder={c.namePlaceholder}
              disabled={pending}
              required
            />
          </div>

          <div className={styles.foot}>
            <span className={styles.help}>{c.foot}</span>
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
                disabled={pending || !chosenMode}
              >
                {pending ? c.submitting : `${c.submit} →`}
              </button>
            </div>
          </div>

          {errorMessage && <p className={styles.errorLine}>{errorMessage}</p>}
        </form>
      </div>
    </div>
  );
}
