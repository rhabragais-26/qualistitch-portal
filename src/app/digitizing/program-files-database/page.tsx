
'use client';
import { Header } from '@/components/header';
import { ProgramFilesDatabaseTable } from '@/components/program-files-database-table';

export default function ProgramFilesDatabasePage() {
  return (
    <Header>
      <ProgramFilesDatabaseTable />
    </Header>
  );
}
