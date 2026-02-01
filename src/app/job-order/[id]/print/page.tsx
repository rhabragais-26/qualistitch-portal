import { Suspense } from 'react';
import PrintInner from './print-inner';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PrintInner />
    </Suspense>
  );
}
