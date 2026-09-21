'use client';
import { ErrorState } from '@/components/common/error-state';
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="grid min-h-svh place-items-center bg-[#fcfcfb]"><ErrorState error={new Error(`页面加载失败，请重试。${error.digest ? ` 编号：${error.digest}` : ''}`)} retry={reset} /></div>; }
