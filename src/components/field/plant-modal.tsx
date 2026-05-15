'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { plantTree } from '@/app/actions';
import { ALL_MODES, initialPlantState } from '@/app/plant-state';
import { copy } from '@/lib/copy';
import type { FieldMode } from '@/types/domain';
import styles from './plant-modal.module.css';

const c = copy.plant;

interface Props {
  open: boolean;
  // when null, this is the first tree — modal shows mode selector + bigger framing
  fieldMode: FieldMode | null;
  defaultLead: string;
  // not provided when first tree (modal forces a plant)
  onClose?: () => void;
  onPlanted?: () => void;
}

export function PlantModal({
  open,
  fieldMode,
  defaultLead,
  onClose,
  onPlanted,
}: Props) {
  const isFirst = fieldMode === null;
  const [chosenMode, setChosenMode] = useState<FieldMode | null>(fieldMode);
  const [state, formAction, pending] = useActionState(
    plantTree,
    initialPlantState,
  );
  const nameRef = useRef<HTMLInputElement>(null);

  // focus name on open
  useEffect(() => {
    if (open && !isFirst) nameRef.current?.focus();
  }, [open, isFirst]);

  // for first plant, focus the name input when a mode gets picked
  useEffect(() => {
    if (open && isFirst && chosenMode) nameRef.current?.focus();
  }, [open, isFirst, chosenMode]);

  // close + notify parent on success
  useEffect(() => {
    if (state.ok) {
      onPlanted?.();
      onClose?.();
    }
  }, [state.ok, onPlanted, onClose]);

  if (!open) return null;

  const errorMessage = (() => {
    if (state.error === 'nameRequired') return c.errors.nameRequired;
    if (state.error === 'modeRequired') return c.errors.modeRequired;
    if (state.error === 'serverError') return c.errors.serverError;
    return null;
  })();

  const titleText = isFirst
    ? c.first.title
    : c.again.title.replace('%mode%', fieldMode!);
  const ledeText = isFirst ? c.first.lede : c.again.lede;
  const submitText = isFirst ? c.first.submit : c.again.submit;
  const footText = isFirst ? c.first.foot : c.again.foot;

  const submitDisabled =
    pending || (isFirst && !chosenMode);

  return (
    <div
      className={styles.veil}
      role="dialog"
      aria-modal="true"
      aria-label={isFirst ? c.first.title : titleText}
      onClick={(e) => {
        // backdrop click only closes for subsequent (first plant is forced)
        if (!isFirst && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`${styles.panel} ${isFirst ? styles.first : ''}`}>
        {isFirst && (
          <div className={styles.eyebrow}>
            <span>{c.first.eyebrow[0]}</span>
            <span className={styles.eyebrowDim}>/</span>
            <span>{c.first.eyebrow[1]}</span>
          </div>
        )}

        <h2 className={styles.title}>{titleText}</h2>
        <p className={styles.lede}>{ledeText}</p>

        {isFirst && (
          <div className={styles.section}>
            <p className={styles.sectionRule}>{c.first.section1}</p>
            <ul className={styles.modeList}>
              {ALL_MODES.map((m) => {
                const meta = c.modes[m];
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
        )}

        <form className={styles.form} action={formAction} noValidate>
          {isFirst && <p className={styles.sectionRule}>{c.first.section2}</p>}

          {/* hidden mode field for first plant */}
          {isFirst && chosenMode && (
            <input type="hidden" name="mode" value={chosenMode} />
          )}

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

          {/* year + lead only for subsequent (first plant defaults silently) */}
          {!isFirst && (
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
          )}

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

          <div className={styles.foot}>
            <span className={styles.help}>{footText}</span>
            <div className={styles.actions}>
              {!isFirst && (
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={onClose}
                  disabled={pending}
                >
                  {c.cancel}
                </button>
              )}
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={submitDisabled}
              >
                {pending ? c.submitting : `${submitText} →`}
              </button>
            </div>
          </div>

          {errorMessage && <p className={styles.errorLine}>{errorMessage}</p>}
        </form>
      </div>
    </div>
  );
}
