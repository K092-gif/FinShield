'use client';

import { Suspense } from "react";
import EmergencyFundTool from "@/components/simulator/EmergencyFundTool";

export default function EmergencyPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <EmergencyFundTool />
    </Suspense>
  );
}
