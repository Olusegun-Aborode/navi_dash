import { notFound } from 'next/navigation';
import { isValidProtocol } from '@/protocols/registry';

export default async function ProtocolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ protocol: string }>;
}) {
  const { protocol } = await params;

  if (!isValidProtocol(protocol)) {
    notFound();
  }

  return <>{children}</>;
}
