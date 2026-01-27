// This file is the "Server Component" container that satisfies Next.js's static export demands

import PrintClient from './PrintClient';
import React from 'react';

// This function tells Next.js to make a static placeholder page
export function generateStaticParams() {
  return []; 
}
    
// This renders the client-side content we moved to PrintClient.tsx
export default function Page() {
  return <PrintClient />;
}