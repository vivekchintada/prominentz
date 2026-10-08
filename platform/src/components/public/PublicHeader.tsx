// src/components/public/PublicHeader.tsx
import Link from 'next/link';
import styles from '../../components/landing/MiddayMarketing.module.css';
import { ProminentzLogo } from '@/components/ui/ProminentzLogo';

export default function PublicHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand}>
          <div className={styles.brandMark}>R</div>
          <div className={styles.brandName}>Resto</div>
        </Link>
        <nav className={styles.navLinks}>
          <Link href="/pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/signup" className={styles.navLink}>Sign Up</Link>
          <Link href="/login" className={styles.navLink}>Login</Link>
        </nav>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.btnPrimary}>Sign In →</Link>
        </div>
      </div>
    </header>
  );
}
