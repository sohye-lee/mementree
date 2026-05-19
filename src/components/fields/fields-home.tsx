import Link from 'next/link';
import { signOut } from '@/app/actions';
import { Logo } from '@/components/brand/logo';
import { copy } from '@/lib/copy';
import type { FieldMode } from '@/types/domain';
import { CreateFieldLauncher } from './create-field-launcher';
import styles from './fields-home.module.css';

// the keeper's home at `/` — a picker for the fields they keep. each card
// links into `/{handle}/{slug}`, the canonical field view. server component;
// the only interactivity is the create-field launcher.

const c = copy.fieldsHome;

export interface FieldsHomeItem {
  id: string;
  slug: string;
  title: string;
  mode: FieldMode | null;
  treeCount: number;
}

interface Props {
  handle: string;
  displayName: string;
  fields: FieldsHomeItem[];
}

export function FieldsHome({ handle, displayName, fields }: Props) {
  const empty = fields.length === 0;

  return (
    <div className={styles.body}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <Logo size={16} />
          <span>{copy.brand}</span>
        </div>
        <div className={styles.account}>
          <span className={styles.signedIn}>
            {c.signedInAs} <span className={styles.who}>{displayName}</span>
          </span>
          <form action={signOut}>
            <button type="submit" className={styles.signOut}>
              {c.signOut}
            </button>
          </form>
        </div>
      </header>

      <main className={styles.stage}>
        <div className={styles.inner}>
          {empty ? (
            <section className={styles.emptyBlock}>
              <div className={styles.eyebrow}>
                <span>{c.eyebrow[0]}</span>
                <span className={styles.eyebrowDim}>/</span>
                <span>{c.empty.eyebrow}</span>
              </div>
              <h1 className={styles.title}>{c.empty.title}</h1>
              <p className={styles.lede}>{c.empty.lede}</p>
              <CreateFieldLauncher variant="cta" />
            </section>
          ) : (
            <>
              <div className={styles.eyebrow}>
                <span>{c.eyebrow[0]}</span>
                <span className={styles.eyebrowDim}>/</span>
                <span>{c.eyebrow[1]}</span>
              </div>
              <h1 className={styles.title}>{c.title}</h1>
              <p className={styles.lede}>{c.lede}</p>

              <ul className={styles.grid}>
                {fields.map((f) => {
                  const glyph = f.mode
                    ? copy.plant.modes[f.mode].glyph
                    : '○';
                  const modeWord = f.mode ? c.modeWord[f.mode] : 'a field';
                  const trees =
                    f.treeCount === 1 ? '1 tree' : `${f.treeCount} trees`;
                  return (
                    <li key={f.id}>
                      <Link
                        href={`/${handle}/${f.slug}`}
                        className={styles.card}
                      >
                        <span
                          className={styles.cardGlyph}
                          aria-hidden="true"
                        >
                          {glyph}
                        </span>
                        <span className={styles.cardTitle}>{f.title}</span>
                        <span className={styles.cardMeta}>
                          {modeWord} · {trees}
                        </span>
                        <span className={styles.cardEnter}>{c.enter}</span>
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <CreateFieldLauncher variant="card" />
                </li>
              </ul>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
