'use client';

import { usePathname } from 'next/navigation';
import { CollapsibleChat } from '@/components/collapsible-chat';
import { CollapsibleRightPanel } from '@/components/collapsible-right-panel';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPrintView = pathname.includes('/print');

  return (
    <>
      {children}
      {!isPrintView && <CollapsibleChat />}
      {!isPrintView && <CollapsibleRightPanel />}
    </>
  );
}
