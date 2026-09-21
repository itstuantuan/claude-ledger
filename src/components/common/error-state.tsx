'use client';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, errorMessage } from '@/lib/api/errors';
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="flex min-h-60 flex-col items-center justify-center gap-4 p-8 text-center text-[#8c9783] [&_h2]:text-[22px] [&_h2]:font-medium [&_h2]:text-[#3e4e33] [&_p]:max-w-[480px] [&_p]:text-[13px] [&_p]:leading-7 [&_small]:[overflow-wrap:anywhere] [&_small]:text-[11px]" role="alert"><AlertCircle size={26} /><h2>暂时无法加载</h2><p>{errorMessage(error)}</p>{error instanceof ApiError && error.requestId && <small>请求编号：{error.requestId}</small>}{retry && <Button variant="outline" onClick={retry}>重新加载</Button>}</div>;
}
export function LoadingState({ label = '正在加载…' }: { label?: string }) {
  return <div className="flex min-h-60 flex-col items-center justify-center gap-4 p-8 text-center text-[#8c9783]" role="status"><span className="size-[22px] animate-spin rounded-full border-2 border-[#c6d0bc] border-t-[#517344] motion-reduce:animate-none" /><p className="text-[13px] leading-7">{label}</p></div>;
}
