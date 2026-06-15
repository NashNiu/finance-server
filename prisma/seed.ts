import { PrismaClient, RecordType } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

const defaults = [
  { name: '餐饮', icon: 'food', type: RecordType.EXPENSE, sortOrder: 1 },
  { name: '交通', icon: 'logistics', type: RecordType.EXPENSE, sortOrder: 2 },
  { name: '购物', icon: 'shopping-cart-o', type: RecordType.EXPENSE, sortOrder: 3 },
  { name: '娱乐', icon: 'music-o', type: RecordType.EXPENSE, sortOrder: 4 },
  { name: '居住', icon: 'home-o', type: RecordType.EXPENSE, sortOrder: 5 },
  { name: '医疗', icon: 'plus', type: RecordType.EXPENSE, sortOrder: 6 },
  { name: '工资', icon: 'gold-coin-o', type: RecordType.INCOME, sortOrder: 1 },
  { name: '兼职', icon: 'bag-o', type: RecordType.INCOME, sortOrder: 2 },
  { name: '理财', icon: 'balance-o', type: RecordType.INCOME, sortOrder: 3 },
  { name: '其他', icon: 'ellipsis', type: RecordType.INCOME, sortOrder: 4 },
];

async function main() {
  for (const c of defaults) {
    const exists = await prisma.category.findFirst({
      where: { userId: null, name: c.name, type: c.type },
    });
    if (!exists) await prisma.category.create({ data: { ...c, userId: null } });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
