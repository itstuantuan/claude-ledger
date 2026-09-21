import { Home, UserRound, UsersRound, HardHat, MapPinned, PackageOpen, BadgeDollarSign, FilePlus2, ReceiptText, RotateCcw, HandCoins, WalletCards } from 'lucide-react';
export const navigation = [
  { href: '/dashboard', label: '工作台', icon: Home, description: '门店工作台', group: '工作空间' },
  { href: '/orders/create', label: '开用料单', icon: FilePlus2, description: '快速创建客户用料单', group: '业务管理' },
  { href: '/orders', label: '用料记录', icon: ReceiptText, description: '查看已提交的用料单', group: '业务管理' },
  { href: '/returns', label: '退料记录', icon: RotateCcw, description: '从原用料单发起退料', group: '业务管理' },
  { href: '/workers', label: '油漆工', icon: UsersRound, description: '客户资料与账务摘要', group: '客户管理' },
  { href: '/teams', label: '施工队', icon: HardHat, description: '施工队与成员汇总', group: '客户管理' },
  { href: '/projects', label: '工地 / 项目', icon: MapPinned, description: '项目关联与用料归属', group: '客户管理' },
  { href: '/materials', label: '材料', icon: PackageOpen, description: '材料资料、价格与状态', group: '材料管理' },
  { href: '/pricing', label: '客户价格', icon: BadgeDollarSign, description: '油漆工专属材料价格', group: '材料管理' },
  { href: '/payments', label: '收款', icon: HandCoins, description: '登记客户付款并冲减应收', group: '财务管理' },
  { href: '/prepaid', label: '预存款', icon: WalletCards, description: '登记和查看客户预存资金', group: '财务管理' },
  { href: '/account', label: '我的账号', icon: UserRound, description: '账号信息与访问权限', group: '系统' },
];
