
'use client';
import { Header } from '@/components/header';
import { ProgramFilesDatabaseTable } from '@/components/program-files-database-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function ProgramFilesDatabasePage() {
    const { userProfile } = useUser();
    const pathname = usePathname();
    const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  return (
    <Header>
      <ProgramFilesDatabaseTable isReadOnly={!canEdit} />
    </Header>
  );
}
