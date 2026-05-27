import { PrismaClient, Role, SpotType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

function getParisTzOffset(): number {
  const now = new Date();
  const parisTz = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false });
  const parisHour = Number(parisTz.format(now));
  const utcHour = now.getUTCHours();
  return parisHour - utcHour;
}

function toUtcTime(parisTime: string): string {
  const offset = getParisTzOffset();
  const [h, m] = parisTime.split(':').map(Number);
  const utcH = ((h - offset) + 24) % 24;
  return `${String(utcH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function main() {
  console.log('🌱 Seeding DriveXchange Parking…');

  const adminPw = await bcrypt.hash('Admin123!', 12);
  const userPin = await bcrypt.hash('1234', 12);

  await db.user.upsert({
    where: { accessId: 'ADMIN1' },
    create: { accessId: 'ADMIN1', name: 'Administrateur', pinHash: adminPw, role: Role.ADMIN, locale: 'fr' },
    update: {},
  });

  const users = [
    { accessId: 'MAR001', name: 'Marie Dupont' },
    { accessId: 'THO002', name: 'Thomas Martin' },
    { accessId: 'JUL003', name: 'Julie Bernard' },
    { accessId: 'KAR004', name: 'Karim Smail' },
  ];
  for (const u of users) {
    await db.user.upsert({
      where: { accessId: u.accessId },
      create: { ...u, pinHash: userPin, role: Role.USER, locale: 'fr' },
      update: {},
    });
  }

  const spots = [
    ...Array.from({ length: 5 }, (_, i) => ({ number: `D-0${i + 1}`, type: SpotType.DEMO, label: null })),
    ...Array.from({ length: 10 }, (_, i) => ({ number: `S-${String(i + 1).padStart(2, '0')}`, type: SpotType.STANDARD, label: null })),
    ...Array.from({ length: 3 }, (_, i) => ({ number: `EV-0${i + 1}`, type: SpotType.EV, label: null })),
    ...Array.from({ length: 2 }, (_, i) => ({ number: `V-0${i + 1}`, type: SpotType.VISITOR, label: null })),
  ];

  for (const spot of spots) {
    await db.spot.upsert({
      where: { number: spot.number },
      create: { ...spot, status: 'FREE' },
      update: {},
    });
  }

  const d04 = await db.spot.findUnique({ where: { number: 'D-04' } });
  if (d04 && d04.status === 'FREE') {
    await db.spot.update({ where: { id: d04.id }, data: { status: 'BLOCKED', blockReason: 'Tesla Model 3 - essai longue durée' } });
  }

  console.log('✅ Seed terminé');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => void db.$disconnect());
