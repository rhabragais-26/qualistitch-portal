
'use client';
import { Header } from '@/components/header';
import { JobOrderTable } from '@/components/job-order-table';

export default function JobOrderPage() {
  return (
    <Header>
      <JobOrderTable />
    </Header>
  );
}
