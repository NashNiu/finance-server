import { PrismaClient, RecordType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

interface SeedNode {
  name: string;
  icon: string;
  children?: { name: string; icon: string }[];
}

// Full 小青账-style default tree. Existing flat defaults (餐饮/交通/购物/娱乐/
// 居住/医疗/工资/兼职/理财/其他) are reused as first-level parents so older
// records keep pointing at valid categories.
const EXPENSE_TREE: SeedNode[] = [
  {
    name: '餐饮',
    icon: '🍴',
    children: [
      { name: '早餐', icon: '🥐' },
      { name: '午餐', icon: '🍱' },
      { name: '晚餐', icon: '🍚' },
      { name: '零食', icon: '🍿' },
      { name: '奶茶', icon: '🧋' },
      { name: '咖啡', icon: '☕' },
      { name: '水果', icon: '🍎' },
      { name: '食材', icon: '🥬' },
      { name: '柴米油盐', icon: '🧂' },
    ],
  },
  {
    name: '日常',
    icon: '🧾',
    children: [
      { name: '日用品', icon: '🧺' },
      { name: '缴费', icon: '🧾' },
      { name: '维修', icon: '🔧' },
    ],
  },
  {
    name: '购物',
    icon: '🛒',
    children: [
      { name: '服饰', icon: '👕' },
      { name: '数码', icon: '📱' },
      { name: '家居', icon: '🛋️' },
      { name: '日用', icon: '🧺' },
    ],
  },
  {
    name: '娱乐',
    icon: '🎬',
    children: [
      { name: '电影', icon: '🎬' },
      { name: '游戏', icon: '🎮' },
      { name: '运动', icon: '🏀' },
      { name: '唱歌', icon: '🎤' },
    ],
  },
  {
    name: '居住',
    icon: '🏠',
    children: [
      { name: '房租', icon: '🏠' },
      { name: '物业', icon: '🏢' },
      { name: '水电', icon: '💡' },
      { name: '宽带', icon: '📶' },
    ],
  },
  {
    name: '医疗',
    icon: '🏥',
    children: [
      { name: '买药', icon: '💊' },
      { name: '门诊', icon: '🩺' },
      { name: '体检', icon: '📋' },
    ],
  },
  {
    name: '学习',
    icon: '📚',
    children: [
      { name: '书籍', icon: '📖' },
      { name: '课程', icon: '🎓' },
      { name: '文具', icon: '✏️' },
    ],
  },
  {
    name: '人情',
    icon: '🎁',
    children: [
      { name: '红包', icon: '🧧' },
      { name: '礼物', icon: '🎁' },
      { name: '请客', icon: '🍻' },
    ],
  },
  {
    name: '美妆',
    icon: '💄',
    children: [
      { name: '护肤', icon: '🧴' },
      { name: '彩妆', icon: '💄' },
      { name: '美发', icon: '💇' },
    ],
  },
  {
    name: '旅游',
    icon: '🧳',
    children: [
      { name: '交通', icon: '🚆' },
      { name: '住宿', icon: '🏨' },
      { name: '门票', icon: '🎫' },
    ],
  },
  {
    name: '交通',
    icon: '🚗',
    children: [
      { name: '公交', icon: '🚌' },
      { name: '地铁', icon: '🚇' },
      { name: '打车', icon: '🚕' },
      { name: '加油', icon: '⛽' },
      { name: '停车', icon: '🅿️' },
    ],
  },
  {
    name: '通讯',
    icon: '📱',
    children: [
      { name: '话费', icon: '📞' },
      { name: '流量', icon: '📶' },
    ],
  },
  {
    name: '母婴',
    icon: '🍼',
    children: [
      { name: '奶粉', icon: '🍼' },
      { name: '尿布', icon: '🧷' },
      { name: '玩具', icon: '🧸' },
    ],
  },
  {
    name: '会员租用',
    icon: '👑',
    children: [
      { name: '视频会员', icon: '📺' },
      { name: '音乐会员', icon: '🎵' },
      { name: '云服务', icon: '☁️' },
    ],
  },
];

const INCOME_TREE: SeedNode[] = [
  {
    name: '工资',
    icon: '💰',
    children: [
      { name: '月薪', icon: '💵' },
      { name: '奖金', icon: '🏅' },
      { name: '年终奖', icon: '🎍' },
    ],
  },
  {
    name: '兼职',
    icon: '💼',
    children: [
      { name: '外快', icon: '💸' },
      { name: '稿费', icon: '✍️' },
    ],
  },
  {
    name: '理财',
    icon: '📈',
    children: [
      { name: '利息', icon: '🏦' },
      { name: '分红', icon: '💹' },
      { name: '基金', icon: '📊' },
    ],
  },
  {
    name: '其他',
    icon: '✨',
    children: [
      { name: '红包', icon: '🧧' },
      { name: '中奖', icon: '🎉' },
      { name: '其他收入', icon: '💲' },
    ],
  },
];

async function ensureCategory(
  name: string,
  icon: string,
  type: RecordType,
  parentId: number | null,
  sortOrder: number,
): Promise<number> {
  const existing = await prisma.category.findFirst({
    where: { userId: null, name, type, parentId },
  });
  if (existing) {
    // keep icon/sortOrder fresh for system defaults
    if (existing.icon !== icon || existing.sortOrder !== sortOrder) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { icon, sortOrder },
      });
    }
    return existing.id;
  }
  const created = await prisma.category.create({
    data: { userId: null, name, icon, type, parentId, sortOrder },
  });
  return created.id;
}

async function seedTree(tree: SeedNode[], type: RecordType) {
  let order = 1;
  for (const node of tree) {
    const parentId = await ensureCategory(node.name, node.icon, type, null, order++);
    let childOrder = 1;
    for (const child of node.children ?? []) {
      await ensureCategory(child.name, child.icon, type, parentId, childOrder++);
    }
  }
}

async function main() {
  await seedTree(EXPENSE_TREE, RecordType.EXPENSE);
  await seedTree(INCOME_TREE, RecordType.INCOME);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
