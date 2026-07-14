'use client';

import { Suspense } from "react";
import PortnTax from "@/components/simulator/PortnTax";

export default function RetirementPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <PortnTax />
    </Suspense>
  );
}
