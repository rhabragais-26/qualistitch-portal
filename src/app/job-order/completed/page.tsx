'use client';
import { Header } from '@/components/header';
import { JobOrderTable } from '@/components/job-order-table';

export default function CompletedJobOrderPage() {
  return (
    <Header>
      <JobOrderTable isReadOnly={true} filterType="COMPLETED" />
    </Header>
  );
}
