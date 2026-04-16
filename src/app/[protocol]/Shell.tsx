'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DashboardLayout } from '@datumlabs/dashboard-kit';

interface ShellProps {
  protocol: string;
  protocolName: string;
  children: React.ReactNode;
}

export default function Shell({ protocol, protocolName, children }: ShellProps) {
  const pathname = usePathname();

  const navItems = [
    { href: `/${protocol}/overview`, label: 'Overview' },
    { href: `/${protocol}/markets`, label: 'Markets' },
    { href: `/${protocol}/liquidation`, label: 'Liquidation' },
    { href: `/${protocol}/wallets`, label: 'Wallets' },
    { href: `/${protocol}/methodology`, label: 'Methodology' },
  ];

  return (
    <DashboardLayout
      title={`${protocolName} Lending Terminal`}
      navItems={navItems}
      pathname={pathname}
      iconSrc="/branding/icon.png"
      statusBarLeft="datumlabs.xyz"
      statusBarRight="Powered by DatumLabs"
      linkComponent={Link}
      emailGate={{
        dashboardName: `${protocolName} Lending Terminal`,
        features: [
          'Live liquidation feed',
          'Health-factor watchlist',
          'Per-asset risk metrics',
        ],
        subscribeEndpoint: '/api/subscribe',
      }}
    >
      {children}
    </DashboardLayout>
  );
}
