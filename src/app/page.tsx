import { redirect } from 'next/navigation';

/**
 * Single-protocol deployment — the root URL sends visitors straight to the
 * NAVI overview page. The shell (NaviShell) wraps every protocol route with
 * the Datum Labs Dashboard SDK topbar / sidebar / statusbar layout.
 */
export default function Home() {
  redirect('/navi/overview');
}
