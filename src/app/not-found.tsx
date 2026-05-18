import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { copy } from '@/lib/copy';
import styles from './not-found.module.css';

const c = copy.notFound;

export const metadata = {
  title: 'mementree · not found',
};

export default function NotFound() {
  return (
    <main className={styles.main}>
      <div className={styles.mark}>
        <Logo size={56} />
      </div>
      <div className={styles.code}>{c.code}</div>
      <h1 className={styles.title}>{c.title}</h1>
      <p className={styles.sub}>{c.sub}</p>
      <Link href="/" className={styles.back}>
        {c.back}
      </Link>
    </main>
  );
}
