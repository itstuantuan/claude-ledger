import Link from 'next/link';
import { Button } from '@/components/ui/button';
export const metadata = { title: '无访问权限' };
export default function Forbidden() { return <main className="grid min-h-svh place-items-center bg-[#fcfcfb]"><div className="flex min-h-60 flex-col items-center justify-center gap-4 p-8 text-center text-[#8c9783]"><span className="font-serif text-[64px] text-[#a8b59f]">403</span><h1 className="text-[22px] font-medium text-[#3e4e33]">暂无访问权限</h1><p className="text-[13px]">请联系门店管理员确认你的角色权限。</p><Button asChild><Link href="/dashboard">返回工作台</Link></Button></div></main>; }
