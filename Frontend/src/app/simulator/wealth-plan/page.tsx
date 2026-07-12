'use client';

import { Suspense } from "react";
import WealthPlanTool from "@/components/simulator/WealthPlanTool";

export default function WealthPlanPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <WealthPlanTool />
    </Suspense>
  );
}
