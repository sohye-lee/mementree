'use client';

import { useActionState, useEffect, useState } from 'react';
import { copy } from '@/lib/copy';
import { sendMagicLink } from './actions';
import { initialState } from './state';
import styles from './sign-in.module.css';

const c = copy.signIn;

type View = 'enter' | 'sent';

export function SignInForm({ initialError }: { initialError?: string }) {
  const [view, setView] = useState<View>('enter');
  const [state, formAction, isPending] = useActionState(
    sendMagicLink,
    initialState,
  );

  useEffect(() => {
    if (state.ok) setView('sent');
  }, [state.ok]);

  const errorMessage = (() => {
    if (initialError === 'callback') return c.errors.callback;
    if (state.error === 'invalidEmail') return c.errors.invalidEmail;
    if (state.error === 'sendFailed') return c.errors.sendFailed;
    return null;
  })();

  if (view === 'sent') {
    return (
      <div className={styles.state}>
        <h2 className={styles.formTitle}>{c.sent.title}</h2>
        <p className={styles.formSub}>{c.sent.sub}</p>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => setView('enter')}
        >
          {c.sent.back}
        </button>
        <p className={styles.footnote}>{c.sent.retry}</p>
      </div>
    );
  }

  return (
    <div className={styles.state}>
      <h2 className={styles.formTitle}>{c.enter.title}</h2>
      <p className={styles.formSub}>{c.enter.sub}</p>

      <form action={formAction} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            {c.enter.emailLabel}
          </label>
          <input
            className={styles.input}
            id="email"
            name="email"
            type="email"
            placeholder={c.enter.emailPlaceholder}
            autoComplete="email"
            required
            disabled={isPending}
          />
        </div>

        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={isPending}
        >
          {isPending ? c.enter.submitting : c.enter.submit}
          {!isPending && <span className={styles.arrow}>→</span>}
        </button>

        {errorMessage && <p className={styles.errorLine}>{errorMessage}</p>}

        <p className={styles.footnote}>{c.enter.footnote}</p>
      </form>
    </div>
  );
}
