/**
 * Utility Functions สำหรับ Backend
 */

/**
 * แปลงตัวเลขใส่ลูกน้ำ
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals)
}

/**
 * ตัวอักษรแรกใหญ่
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * สร้าง Random Token
 */
export const generateToken = (length: number = 32): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * ตรวจสอบ Email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
