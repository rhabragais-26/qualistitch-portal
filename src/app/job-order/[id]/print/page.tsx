import { Suspense } from 'react';
import PrintInner from './print-inner';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <PrintInner id={params.id} />
    </Suspense>
  );
}
