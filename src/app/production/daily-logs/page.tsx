'use client';
import { Header } from '@/components/header';
import { EmbroideryDailyLogsTable } from '@/components/production-daily-logs-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function EmbroideryDailyLogsPage() {
    const { userProfile } = useUser();
    const pathname = usePathname();
    const canEdit = hasEditPermission(userProfile?.position as any, '/production/production-queue');

  return (
    <Header>
      <EmbroideryDailyLogsTable isReadOnly={!canEdit} />
    </Header>
  );
}
