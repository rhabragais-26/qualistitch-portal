'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivityLogsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect away from this page as it has been removed
    router.replace('/home');
  }, [router]);

  return null;
}
