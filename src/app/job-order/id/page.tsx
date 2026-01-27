// This file is the "Server Component" container that satisfies Next.js's static export demands

import JobOrderClient from './JobOrderClient';
import React from 'react';
    
// This function tells Next.js to make a static placeholder page
export function generateStaticParams() {
  return []; 
}
    
// This renders the client-side content we moved to JobOrderClient.tsx
export default function Page() {
  return <JobOrderClient />;
}