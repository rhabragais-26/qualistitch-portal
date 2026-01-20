'use client';
import { Header } from '@/components/header';
import { DigitizingTable } from '@/components/digitizing-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';


export default function CompletedProgramsPage() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  return (
    <Header>
      <DigitizingTable isReadOnly={!canEdit} filterType="COMPLETED" />
    </Header>
  );
}
