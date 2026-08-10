'use client';

import { Suspense } from "react";
import TaxOptimizer from "@/components/simulator/TaxOptimizer";

export default function TaxPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <TaxOptimizer />
    </Suspense>
  );
}
