import { redirect } from 'next/navigation';
import { copy } from '@/lib/copy';
import { Logo } from '@/components/brand/logo';
import { createClient } from '@/lib/db/server';
import { SignInForm } from './sign-in-form';
import styles from './sign-in.module.css';

const c = copy.signIn;

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const metadata = {
  title: 'mementree · sign in',
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/');
  }

  const { error } = await searchParams;

  return (
    <div className={styles.body}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <Logo size={16} />
          <span>{copy.brand}</span>
          <span className={styles.brandSep}>/</span>
          <span className={styles.brandState}>{c.topbarState}</span>
        </div>
      </header>

      <main className={styles.stage}>
        <section className={`${styles.panel} ${styles.left}`}>
          <div>
            <div className={styles.eyebrow}>
              <span>{c.leftEyebrow[0]}</span>
              <span className={styles.eyebrowDim}>/</span>
              <span>{c.leftEyebrow[1]}</span>
            </div>
            <h1 className={styles.leftTitle}>{c.leftTitle}</h1>
            <p className={styles.leftLede}>{c.leftLede}</p>
            <p className={styles.leftLine}>{c.leftLine}</p>
          </div>

          <svg
            className={styles.silhouette}
            viewBox="0 0 320 380"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <g
              fill="none"
              stroke="#0A0A0A"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M160 360 Q 158 280, 162 220 Q 165 160, 158 120" />
              <path d="M158 220 Q 130 200, 100 180 Q 80 168, 60 150" />
              <path d="M160 200 Q 195 178, 230 168 Q 255 162, 275 152" />
              <path d="M158 160 Q 138 140, 116 122" />
              <path d="M161 145 Q 188 128, 210 110" />
              <path d="M159 125 Q 145 105, 130 88" />
              <path d="M161 122 Q 178 100, 192 80" />
              <path d="M158 120 Q 158 96, 156 78" />
              <path d="M100 180 Q 88 168, 78 152" />
              <path d="M85 162 Q 76 152, 68 140" />
              <path d="M230 168 Q 244 158, 256 142" />
              <path d="M116 122 Q 108 110, 102 96" />
              <path d="M210 110 Q 220 96, 226 82" />
              <path d="M130 88 Q 124 76, 120 64" />
              <path d="M192 80 Q 200 68, 204 54" />
              <path d="M156 78 Q 150 62, 154 46" />
              <path d="M156 78 Q 164 60, 168 46" />
              <g strokeWidth="1" opacity="0.85">
                <line x1="78" y1="152" x2="78" y2="178" />
                <rect
                  x="69"
                  y="178"
                  width="18"
                  height="22"
                  fill="#0A0A0A"
                  opacity="0.18"
                  stroke="none"
                />
                <line x1="226" y1="82" x2="226" y2="108" />
                <rect
                  x="217"
                  y="108"
                  width="18"
                  height="22"
                  fill="#0A0A0A"
                  opacity="0.18"
                  stroke="none"
                />
                <line x1="156" y1="46" x2="156" y2="68" />
                <rect
                  x="147"
                  y="68"
                  width="18"
                  height="22"
                  fill="#0A0A0A"
                  opacity="0.18"
                  stroke="none"
                />
              </g>
            </g>
          </svg>

          <div className={styles.leftFoot}>
            {/* TODO: location is part of the env system (see project memory).
                show "{c.leftFoot} · {resolved location}" once that ships. */}
            <span>{c.leftFoot}</span>
            <span className={styles.leftFootGlyph}>◐</span>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.right}`}>
          <div className={styles.formFrame}>
            <SignInForm initialError={error} />
          </div>
        </section>
      </main>
    </div>
  );
}
