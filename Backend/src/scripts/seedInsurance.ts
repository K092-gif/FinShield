import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const insuranceData = [
  // Class 1
  { company: 'วิริยะประกันภัย', category: 'car_class_1', planName: 'ชั้น 1', features: 'อู่/ศูนย์ซ่อมในเครือเยอะที่สุด เคลมง่าย อะไหล่แท้แน่นอน', coverage: { ownCarStr: '200,000 - 1,000,000+ บาท', ownCarLimit: 1000000, thirdPartyPropertyStr: '2,500,000 บาท', thirdPartyPropertyLimit: 2500000, thirdPartyLifeStr: '1,000,000 บาท', thirdPartyLifeLimit: 1000000, medicalStr: '50,000 - 100,000 บาท', medicalLimit: 100000 } },
  { company: 'กรุงเทพประกันภัย', category: 'car_class_1', planName: 'ชั้น 1', features: 'บริการเคลมเร็ว อนุมัติซ่อมไว ช่วยเหลือฉุกเฉิน 24 ชม. ดีเยี่ยม', coverage: { ownCarStr: '200,000 - 1,000,000+ บาท', ownCarLimit: 1000000, thirdPartyPropertyStr: '2,500,000 บาท', thirdPartyPropertyLimit: 2500000, thirdPartyLifeStr: '1,000,000 บาท', thirdPartyLifeLimit: 1000000, medicalStr: '100,000 - 200,000 บาท', medicalLimit: 200000 } },
  { company: 'แอลเอ็มจี (LMG)', category: 'car_class_1', planName: 'ชั้น 1', features: 'เชี่ยวชาญรถยุโรป รถนำเข้า และรถกระบะ วงเงินคุ้มครองสูง', coverage: { ownCarStr: '200,000 - 1,000,000+ บาท', ownCarLimit: 1000000, thirdPartyPropertyStr: '2,500,000 บาท', thirdPartyPropertyLimit: 2500000, thirdPartyLifeStr: '1,000,000 บาท', thirdPartyLifeLimit: 1000000, medicalStr: '100,000 บาท', medicalLimit: 100000 } },
  { company: 'ทิพยประกันภัย', category: 'car_class_1', planName: 'ชั้น 1', features: 'มีแผนเฉพาะกลุ่ม เช่น Tip Lady เพิ่มทุนของมีค่าในรถยนต์สำหรับผู้หญิง', coverage: { ownCarStr: '200,000 - 900,000 บาท', ownCarLimit: 900000, thirdPartyPropertyStr: '1,000,000 - 2,500,000 บาท', thirdPartyPropertyLimit: 2500000, thirdPartyLifeStr: '500,000 - 1,000,000 บาท', thirdPartyLifeLimit: 1000000, medicalStr: '50,000 - 100,000 บาท', medicalLimit: 100000 } },
  { company: 'ธนชาตประกันภัย', category: 'car_class_1', planName: 'ชั้น 1', features: 'มีแผน One Lite เซฟค่าเบี้ยลง แต่ยังได้ความคุ้มครองชั้น 1', coverage: { ownCarStr: '200,000 - 800,000 บาท', ownCarLimit: 800000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 - 100,000 บาท', medicalLimit: 100000 } },
  { company: 'ชับบ์สามัคคี (Chubb)', category: 'car_class_1', planName: 'ชั้น 1', features: 'มักมีดีลซ่อมห้าง (ซ่อมศูนย์) ร่วมกับค่ายรถและไฟแนนซ์ที่น่าสนใจ', coverage: { ownCarStr: '200,000 - 800,000 บาท', ownCarLimit: 800000, thirdPartyPropertyStr: '1,500,000 บาท', thirdPartyPropertyLimit: 1500000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 - 100,000 บาท', medicalLimit: 100000 } },
  { company: 'นวกิจประกันภัย', category: 'car_class_1', planName: 'ชั้น 1', features: 'บริษัทเก่าแก่ มั่นคง งานซ่อมสีและตัวถังได้มาตรฐานระดับสูง', coverage: { ownCarStr: '200,000 - 800,000 บาท', ownCarLimit: 800000, thirdPartyPropertyStr: '1,000,000 - 2,500,000 บาท', thirdPartyPropertyLimit: 2500000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 - 100,000 บาท', medicalLimit: 100000 } },
  { company: 'Insurverse', category: 'car_class_1', planName: 'ชั้น 1', features: 'ประกันดิจิทัลเต็มรูปแบบ ปรับลด/เพิ่มทุนและเบี้ยเองได้หน้าเว็บ', coverage: { ownCarStr: '200,000 - 700,000 บาท', ownCarLimit: 700000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },

  // Class 2+
  { company: 'ธนชาตประกันภัย', category: 'car_class_2', planName: '2+ จัดเต็ม', features: 'มีเงินชดเชยรายได้ตอนนอน รพ. และชดเชยค่าเดินทางระหว่างซ่อม', coverage: { ownCarStr: '100,000 - 500,000 บาท', ownCarLimit: 500000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '100,000 บาท', medicalLimit: 100000 } },
  { company: 'แอลเอ็มจี (LMG)', category: 'car_class_2', planName: '2+ สบายใจ', features: 'ให้วงเงินอุบัติเหตุและค่ารักษาพยาบาลคนในรถเราสูงกว่าทั่วไป', coverage: { ownCarStr: '100,000 - 400,000 บาท', ownCarLimit: 400000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '100,000 บาท', medicalLimit: 100000 } },
  { company: 'คุ้มภัยโตเกียวมารีน', category: 'car_class_2', planName: 'ชั้น 2+', features: 'เบี้ยประกันเริ่มต้นต่ำ เหมาะกับรถเอเชียและรถใช้งานทั่วไป', coverage: { ownCarStr: '100,000 - 400,000 บาท', ownCarLimit: 400000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 - 100,000 บาท', medicalLimit: 100000 } },
  { company: 'วิริยะประกันภัย', category: 'car_class_2', planName: 'ชั้น 2+', features: 'ได้มาตรฐานงานซ่อมและเครือข่ายอู่วิริยะ ในราคาเบี้ยที่จับต้องง่าย', coverage: { ownCarStr: '100,000 - 300,000 บาท', ownCarLimit: 300000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },
  { company: 'เออร์โก (ERGO)', category: 'car_class_2', planName: 'ชั้น 2+', features: 'แบรนด์สากล มั่นคง ราคาเบี้ยประกันภัยเฉลี่ยต่อปีเป็นมิตรกับกระเป๋าเงิน', coverage: { ownCarStr: '100,000 - 300,000 บาท', ownCarLimit: 300000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },
  { company: 'Insurverse', category: 'car_class_2', planName: 'ชั้น 2+', features: 'ซื้อออนไลน์ 100% เคลมไวผ่านแอป เหมาะกับคนไม่ชอบผ่านตัวแทน', coverage: { ownCarStr: '100,000 - 500,000 บาท', ownCarLimit: 500000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },

  // Class 3 / 3+
  { company: 'กรุงเทพประกันภัย', category: 'car_class_3', planName: 'ชั้น 3+', features: 'แผน 3+ มาตรฐาน บริการดี ไม่มีค่าเสียหายส่วนแรก', coverage: { ownCarStr: '100,000 - 300,000 บาท', ownCarLimit: 300000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },
  { company: 'ทิพยประกันภัย', category: 'car_class_3', planName: 'ชั้น 3+', features: 'แผน 3+ เบี้ยราคาประหยัด สมัครง่าย เหมาะกับรถเก่าจอดในบ้านปลอดภัย', coverage: { ownCarStr: '100,000 - 200,000 บาท', ownCarLimit: 200000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },
  { company: 'ชับบ์สามัคคี (Chubb)', category: 'car_class_3', planName: 'ชั้น 3+', features: 'แผน 3+ แพ็กเกจสำเร็จรูป ซื้อง่าย ไม่ต้องถ่ายรูปตรวจสภาพรถก่อนทำ', coverage: { ownCarStr: '100,000 - 200,000 บาท', ownCarLimit: 200000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },
  { company: 'เมืองไทยประกันภัย', category: 'car_class_3', planName: 'ชั้น 3+', features: 'มีแผน 3+ เซฟ และ ชั้น 3 ราคาถูก เน้นเซฟงบ จ่ายเบี้ยหลักพันต้นๆ ต่อปี', coverage: { ownCarStr: '100,000 บาท (ชั้น 3 = 0 บาท)', ownCarLimit: 100000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },
  { company: 'เมืองไทยประกันภัย', category: 'car_class_3', planName: 'ชั้น 3', features: 'มีแผน 3+ เซฟ และ ชั้น 3 ราคาถูก เน้นเซฟงบ จ่ายเบี้ยหลักพันต้นๆ ต่อปี', coverage: { ownCarStr: '0 บาท', ownCarLimit: 0, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },
  { company: 'นวกิจประกันภัย', category: 'car_class_3', planName: 'ชั้น 3+', features: 'แผน 3+ สำหรับรถใช้งานต่างจังหวัด มีอู่ท้องถิ่นรองรับการจัดซ่อมดี', coverage: { ownCarStr: '100,000 - 200,000 บาท', ownCarLimit: 200000, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },
  { company: 'วิริยะประกันภัย', category: 'car_class_3', planName: 'ชั้น 3', features: 'แผนชั้น 3 สำหรับรถเก่ามาก 15 ปี+ ทำไว้กันพลาดไปชนรถหรูคนอื่น', coverage: { ownCarStr: '0 บาท (ทำแผนชั้น 3)', ownCarLimit: 0, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },
  { company: 'เออร์โก (ERGO)', category: 'car_class_3', planName: 'ชั้น 3', features: 'แผนชั้น 3 เน้นคุ้มครองทรัพย์สินคนอื่นในวงเงินหลักล้านด้วยเบี้ยถูกที่สุด', coverage: { ownCarStr: '0 บาท (ทำแผนชั้น 3)', ownCarLimit: 0, thirdPartyPropertyStr: '1,000,000 บาท', thirdPartyPropertyLimit: 1000000, thirdPartyLifeStr: '500,000 บาท', thirdPartyLifeLimit: 500000, medicalStr: '50,000 บาท', medicalLimit: 50000 } },

  // Life & Health
  { company: 'AIA (เอไอเอ)', category: 'health_life', planName: 'AIA Health Happy', features: 'วงเงินเหมาจ่ายจะ เพิ่มเป็น 2 เท่า ทันทีหากตรวจเจอ 1 ใน 18 โรคร้ายแรงยอดฮิต และดูแลต่อเนื่องนาน 4 ปีกรมธรรม์', coverage: { lifeStr: '100,000 - 500,000 บาท', lifeLimit: 500000, healthStr: '1,000,000 - 25,000,000 บาท', healthLimit: 5000000, roomStr: 'จ่ายตามจริง (ห้องเริ่มต้น)', roomLimit: -1, opdAccidentStr: 'จ่ายตามจริง ในวงเงินเหมาจ่าย', opdAccidentLimit: -1 } },
  { company: 'อลิอันซ์ อยุธยา', category: 'health_life', planName: 'ปลดล็อค ดับเบิล แคร์', features: 'ดับเบิลวงเงินให้ 2 เท่า เมื่อเป็นโรคร้ายแรง และคุ้มครองค่ารักษาเคมีบำบัด/รังสีรักษาสำหรับผู้ป่วยนอกเต็มพิกัด', coverage: { lifeStr: '50,000 - 200,000 บาท', lifeLimit: 200000, healthStr: '8,000,000 - 30,000,000 บาท', healthLimit: 8000000, roomStr: '3,000 - 6,000 บาท', roomLimit: 3000, opdAccidentStr: 'จ่ายตามจริง ในวงเงินเหมาจ่าย', opdAccidentLimit: -1 } },
  { company: 'กรุงไทย-แอกซ่า', category: 'health_life', planName: 'iHealthy Ultra', features: 'แผนระดับสูง (Platinum) ครอบคลุมการรักษาแพทย์ทางเลือก รวมถึงค่าคลอดบุตรและค่าทำฟัน', coverage: { lifeStr: '50,000 - 100,000 บาท', lifeLimit: 100000, healthStr: '3,000,000 - 100,000,000 บาท', healthLimit: 3000000, roomStr: '2,100 - 21,000 บาท', roomLimit: 2100, opdAccidentStr: 'จ่ายตามจริง ในวงเงินเหมาจ่าย', opdAccidentLimit: -1 } },
  { company: 'เมืองไทยประกันชีวิต', category: 'health_life', planName: 'D Health Plus', features: 'เน้นเจ็บหนักนอน รพ. ค่าห้องเดี่ยวมาตรฐานเบิกได้ไม่อั้น และยังพ่วงซื้อความคุ้มครองคลอดบุตรเพิ่มได้', coverage: { lifeStr: '50,000 - 100,000 บาท', lifeLimit: 100000, healthStr: '1,000,000 - 5,000,000 บาท', healthLimit: 5000000, roomStr: 'จ่ายตามจริง (ค่าห้องเดี่ยวมาตรฐาน)', roomLimit: -1, opdAccidentStr: 'จ่ายตามจริง ในวงเงินเหมาจ่าย', opdAccidentLimit: -1 } },
  { company: 'ทิพยประกันภัย', category: 'health_life', planName: 'TIP สุขใจ', features: 'เบี้ยประกันแบบคงที่ (เบี้ยถูก) ไม่ปรับขึ้นตามอายุ เน้นคุ้มครองโรคทั่วไปที่พบบ่อย (จำกัดวงเงิน)', coverage: { lifeStr: 'ไม่มีสัญญาหลัก', lifeLimit: 0, healthStr: '30,000 - 100,000 บาท (ต่อครั้ง)', healthLimit: 100000, roomStr: '1,500 - 3,000 บาท', roomLimit: 3000, opdAccidentStr: 'จ่ายตามจริง ในวงเงิน', opdAccidentLimit: -1 } },
  { company: 'BUPA / Aetna (Allianz)', category: 'health_life', planName: 'Opal / Pearl', features: 'แผนสุขภาพเฉพาะทาง เลือกรับความคุ้มครอง OPD สูงเป็นพิเศษได้', coverage: { lifeStr: 'ไม่มีสัญญาหลัก', lifeLimit: 0, healthStr: '500,000 - 1,000,000 บาท', healthLimit: 1000000, roomStr: '2,000 - 4,000 บาท', roomLimit: 4000, opdAccidentStr: 'จ่ายตามจริง ในวงเงิน', opdAccidentLimit: -1 } }
]

async function main() {
  console.log('Clearing existing insurance plans...')
  await prisma.insurancePlan.deleteMany()

  console.log('Seeding new insurance plans...')
  const result = await prisma.insurancePlan.createMany({
    data: insuranceData
  })

  console.log(`Seeded ${result.count} insurance plans successfully!`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
