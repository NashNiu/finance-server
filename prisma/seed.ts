import { PrismaClient, RecordType } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(connectionString);
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
    icon: 'food-o',
    children: [
      { name: '早餐', icon: 'food-o' },
      { name: '午餐', icon: 'food-o' },
      { name: '晚餐', icon: 'food-o' },
      { name: '零食', icon: 'gift-o' },
      { name: '奶茶', icon: 'cash-back-record' },
      { name: '咖啡', icon: 'cash-back-record' },
      { name: '水果', icon: 'flower-o' },
      { name: '食材', icon: 'shop-o' },
      { name: '柴米油盐', icon: 'shop-o' },
    ],
  },
  {
    name: '日常',
    icon: 'todo-list-o',
    children: [
      { name: '日用品', icon: 'todo-list-o' },
      { name: '缴费', icon: 'balance-list-o' },
      { name: '维修', icon: 'setting-o' },
    ],
  },
  {
    name: '购物',
    icon: 'shopping-cart-o',
    children: [
      { name: '服饰', icon: 'bag-o' },
      { name: '数码', icon: 'phone-o' },
      { name: '家居', icon: 'home-o' },
      { name: '日用', icon: 'shop-o' },
    ],
  },
  {
    name: '娱乐',
    icon: 'music-o',
    children: [
      { name: '电影', icon: 'video-o' },
      { name: '游戏', icon: 'play-circle-o' },
      { name: '运动', icon: 'fire-o' },
      { name: '唱歌', icon: 'music-o' },
    ],
  },
  {
    name: '居住',
    icon: 'home-o',
    children: [
      { name: '房租', icon: 'home-o' },
      { name: '物业', icon: 'wap-home-o' },
      { name: '水电', icon: 'fire-o' },
      { name: '宽带', icon: 'wifi-o' },
    ],
  },
  {
    name: '医疗',
    icon: 'plus',
    children: [
      { name: '买药', icon: 'plus' },
      { name: '门诊', icon: 'plus' },
      { name: '体检', icon: 'records-o' },
    ],
  },
  {
    name: '学习',
    icon: 'bookmark-o',
    children: [
      { name: '书籍', icon: 'bookmark-o' },
      { name: '课程', icon: 'label-o' },
      { name: '文具', icon: 'edit' },
    ],
  },
  {
    name: '人情',
    icon: 'friends-o',
    children: [
      { name: '红包', icon: 'gift-o' },
      { name: '礼物', icon: 'gift-o' },
      { name: '请客', icon: 'friends-o' },
    ],
  },
  {
    name: '美妆',
    icon: 'flower-o',
    children: [
      { name: '护肤', icon: 'flower-o' },
      { name: '彩妆', icon: 'flower-o' },
      { name: '美发', icon: 'smile-o' },
    ],
  },
  {
    name: '旅游',
    icon: 'guide-o',
    children: [
      { name: '交通', icon: 'logistics' },
      { name: '住宿', icon: 'hotel-o' },
      { name: '门票', icon: 'coupon-o' },
    ],
  },
  {
    name: '交通',
    icon: 'logistics',
    children: [
      { name: '公交', icon: 'logistics' },
      { name: '地铁', icon: 'logistics' },
      { name: '打车', icon: 'logistics' },
      { name: '加油', icon: 'fire-o' },
      { name: '停车', icon: 'location-o' },
    ],
  },
  {
    name: '通讯',
    icon: 'phone-o',
    children: [
      { name: '话费', icon: 'phone-o' },
      { name: '流量', icon: 'wifi-o' },
    ],
  },
  {
    name: '母婴',
    icon: 'smile-o',
    children: [
      { name: '奶粉', icon: 'smile-o' },
      { name: '尿布', icon: 'smile-o' },
      { name: '玩具', icon: 'gift-o' },
    ],
  },
  {
    name: '会员租用',
    icon: 'gem-o',
    children: [
      { name: '视频会员', icon: 'video-o' },
      { name: '音乐会员', icon: 'music-o' },
      { name: '云服务', icon: 'cluster-o' },
    ],
  },
];

const INCOME_TREE: SeedNode[] = [
  {
    name: '工资',
    icon: 'gold-coin-o',
    children: [
      { name: '月薪', icon: 'gold-coin-o' },
      { name: '奖金', icon: 'medal-o' },
      { name: '年终奖', icon: 'medal-o' },
    ],
  },
  {
    name: '兼职',
    icon: 'bag-o',
    children: [
      { name: '外快', icon: 'bag-o' },
      { name: '稿费', icon: 'edit' },
    ],
  },
  {
    name: '理财',
    icon: 'balance-o',
    children: [
      { name: '利息', icon: 'balance-o' },
      { name: '分红', icon: 'gold-coin-o' },
      { name: '基金', icon: 'chart-trending-o' },
    ],
  },
  {
    name: '其他',
    icon: 'ellipsis',
    children: [
      { name: '红包', icon: 'gift-o' },
      { name: '中奖', icon: 'medal-o' },
      { name: '其他收入', icon: 'ellipsis' },
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
