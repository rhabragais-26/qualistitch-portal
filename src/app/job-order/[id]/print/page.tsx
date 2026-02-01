'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import PrintInner from './print-inner';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PrintInner />
    </Suspense>
  );
}