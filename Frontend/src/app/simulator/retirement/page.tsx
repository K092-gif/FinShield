'use client';

import { Suspense } from "react";
import RetirementTool from "@/components/simulator/RetirementTool";

export default function RetirementPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <RetirementTool />
    </Suspense>
  );
}
