/**
 * ฟังก์ชันตัวช่วยทั่วไปสำหรับ Frontend
 */

/**
 * แปลงตัวเลขใส่ลูกน้ำ
 * @param num - ตัวเลขที่ต้องการแปลง
 * @param decimals - จำนวนทศนิยม (default: 2)
 * @returns ตัวเลขที่แปลงแล้ว
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * แปลงตัวเลขเป็นสกุลเงิน
 * @param num - ตัวเลขที่ต้องการแปลง
 * @param currency - สกุลเงิน (default: USD)
 * @returns สตริงสกุลเงิน
 */
export const formatCurrency = (num: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num)
}

/**
 * แปลงวันที่
 * @param date - วันที่ที่ต้องการแปลง
 * @returns วันที่ที่แปลงแล้ว
 */
export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง
 * @param oldValue - ค่าเดิม
 * @param newValue - ค่าใหม่
 * @returns เปอร์เซ็นต์การเปลี่ยนแปลง
 */
export const calculatePercentageChange = (oldValue: number, newValue: number): number => {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / oldValue) * 100
}
