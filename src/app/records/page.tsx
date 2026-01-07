
'use client';
import { Header } from '@/components/header';
import { RecordsTable } from '@/components/records-table';

export default function RecordsPage() {
  return (
    <Header>
      <RecordsTable />
    </Header>
  );
}
