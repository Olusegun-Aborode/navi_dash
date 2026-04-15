import { redirect } from 'next/navigation';

/**
 * Single-protocol deployment — the root URL sends visitors straight to the
 * NAVI dashboard shell, which handles the EmailGate. This matches the SDK
 * convention (see create-datumlabs-dashboard/templates/default/app/page.tsx).
 */
export default function Home() {
  redirect('/navi/overview');
}
