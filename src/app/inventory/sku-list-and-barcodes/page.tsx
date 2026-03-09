'use client';

import { Header } from '@/components/header';
import { SkuBarcodeList } from '@/components/sku-barcode-list';

export default function SkuListAndBarcodesPage() {
  return (
    <Header>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <SkuBarcodeList />
      </div>
    </Header>
  );
}
