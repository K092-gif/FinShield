export interface PortfolioSuggestion {
  name: string;
  type: string;
  allocation: number;
  expectedYield: number;
  riskLevel: string;
  reason: string;
  market: string;
}

export interface MyPortfolioItem {
  id: string;
  name: string;
  type: string;
  allocation: number;
  expectedYield: number;
  riskLevel: string;
  market: string;
}

export type Scenario = 'job_loss' | 'illness' | 'accident';
export type Severity = 'mild' | 'moderate' | 'severe';

export interface SeverityDef {
  label: string;
  medicalCost: number;
  vehicleCost: number;
  recoveryMonths: number;
}

export interface ScenarioDef {
  icon: string;
  title: string;
  subtitle: string;
  desc: string;
  color: string;
  hasSeverity: boolean;
  severities?: Record<Severity | 'none', SeverityDef>;
}

export const SCENARIOS: Record<Scenario, ScenarioDef> = {
  job_loss: {
    icon: 'Suitcase',
    title: 'ตกงาน',
    subtitle: 'Job Loss',
    desc: 'สูญเสียรายได้กะทันหัน ต้องใช้เงินสำรองระหว่างหางานใหม่',
    color: '#f59e0b',
    hasSeverity: false
  },
  illness: {
    icon: 'Hospital',
    title: 'เจ็บป่วย',
    subtitle: 'Illness',
    desc: 'ค่ารักษาพยาบาล + รายได้ที่หายไประหว่างพักฟื้น',
    color: '#ef4444',
    hasSeverity: true,
    severities: {
      none: { label: 'ไม่มี', medicalCost: 0, vehicleCost: 0, recoveryMonths: 0 },
      mild: { label: 'เล็กน้อย (ผู้ป่วยนอก)', medicalCost: 20000, vehicleCost: 0, recoveryMonths: 1 },
      moderate: { label: 'ปานกลาง (นอนโรงพยาบาล 1–2 สัปดาห์)', medicalCost: 120000, vehicleCost: 0, recoveryMonths: 2 },
      severe: { label: 'รุนแรง (ผ่าตัด / ICU)', medicalCost: 380000, vehicleCost: 0, recoveryMonths: 5 }
    }
  },
  accident: {
    icon: 'Car',
    title: 'อุบัติเหตุ',
    subtitle: 'Accident',
    desc: 'ค่ารักษา + ซ่อมยานพาหนะ + รายได้ที่หายระหว่างฟื้นตัว',
    color: '#8b5cf6',
    hasSeverity: true,
    severities: {
      none: { label: 'ไม่บาดเจ็บ', medicalCost: 0, vehicleCost: 15000, recoveryMonths: 0 },
      mild: { label: 'บาดเจ็บเล็กน้อย (ไม่นอนโรงพยาบาล)', medicalCost: 15000, vehicleCost: 25000, recoveryMonths: 1 },
      moderate: { label: 'บาดเจ็บปานกลาง (นอนรพ. ~1 สัปดาห์)', medicalCost: 80000, vehicleCost: 60000, recoveryMonths: 2 },
      severe: { label: 'บาดเจ็บสาหัส (ผ่าตัด / กระดูกหัก)', medicalCost: 280000, vehicleCost: 120000, recoveryMonths: 5 }
    }
  },
};
