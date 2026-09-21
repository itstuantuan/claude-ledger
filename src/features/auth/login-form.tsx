'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Paintbrush, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from './schema';
import { authApi, isMock } from '@/lib/api/auth';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { safeReturnTo } from '@/lib/auth/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState, LoadingState } from '@/components/common/error-state';
import { cn } from '@/lib/utils';
export function StoreLoginForm({ compact = false }: { compact?: boolean }) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { status, error } = useAuthStore();
  const { register, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { account: '', password: '' } });
  useEffect(() => { if (status === 'authenticated') router.replace(safeReturnTo(params.get('next'))); }, [status, params, router]);
  async function submit(values: LoginInput) {
    clearErrors();
    try { await authApi.login(values); toast.success('登录成功'); }
    catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const field of ['account', 'password'] as const) if (error.fieldErrors[field]) setError(field, { message: error.fieldErrors[field][0] });
      }
      setError('root', { message: errorMessage(error) });
    }
  }
  if (status === 'loading' || status === 'authenticated') return <LoadingState label="正在确认登录状态…" />;
  if (status === 'error') return <ErrorState error={new Error(error ?? '会话恢复失败')} retry={() => void authApi.restore()} />;
  if (compact) return <section className="flex w-full max-w-md flex-col rounded-[32px] border border-[#dededb] bg-[#fcfcfb] text-center shadow-[0_12px_22px_-8px_#00000024,0_2px_8px_#00000008]" style={{ padding: 24, gap: 20 }} aria-label="门店登录">
    <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col" style={{ gap: 16 }}>
      <div className="text-left"><Input className="h-10 rounded-[10px] border-black/15 bg-white/50 px-4 text-base text-[#11110f] hover:border-[#b7b6b1] focus-visible:border-[#7f95a9] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6289ab26]" aria-label="门店账号" autoComplete="username" placeholder="请输入门店账号" disabled={isSubmitting} aria-invalid={!!errors.account} aria-describedby={errors.account ? 'console-account-error' : undefined} {...register('account')} />{errors.account && <p id="console-account-error" className="mt-1.5 text-xs leading-[18px] text-[#a63d32]">{errors.account.message}</p>}</div>
      <div className="text-left"><Input className="h-10 rounded-[10px] border-black/15 bg-white/50 px-4 text-base text-[#11110f] hover:border-[#b7b6b1] focus-visible:border-[#7f95a9] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6289ab26]" aria-label="密码" type="password" autoComplete="current-password" placeholder="请输入密码" disabled={isSubmitting} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'console-password-error' : undefined} {...register('password')} />{errors.password && <p id="console-password-error" className="mt-1.5 text-xs leading-[18px] text-[#a63d32]">{errors.password.message}</p>}</div>
      {errors.root && <p className="text-left text-xs leading-[18px] text-[#a63d32]" role="alert">{errors.root.message}</p>}
      <button className="flex h-10 w-full items-center justify-center rounded-[10px] border-0 px-4 font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-65" style={{ background: '#0b0b0b' }} type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? '正在登录…' : '登录工作台'}</button>
    </form>
    <p className="px-2 text-xs leading-[18px] text-[#8a8985]">使用门店管理员分配的账号和密码登录。</p>
  </section>;
  return <section className={cn('flex w-full max-w-[420px] flex-col gap-[18px] rounded-[28px] border border-black/10 bg-[#fcfcfb] px-7 py-[27px] text-center shadow-[0_18px_35px_-15px_#00000035,0_2px_8px_#00000008] max-[600px]:p-6', compact && 'max-w-[448px]')} aria-label="门店登录">
    {!compact && <span className="grid size-11 place-items-center self-center rounded-xl bg-[#efeeeb] text-[#585650]"><Paintbrush size={24} strokeWidth={1.5} /></span>}
    <div><h2 className="text-lg font-medium text-[#22211f]">登录你的门店</h2><p className="mt-2 text-xs text-[#817f7a]">使用管理员分配的账号继续</p></div>
    <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-[17px] text-left">
      <div><label className="mb-2 block text-xs text-[#62605b]" htmlFor="account">账号</label><Input id="account" autoComplete="username" placeholder="请输入账号" disabled={isSubmitting} aria-invalid={!!errors.account} aria-describedby={errors.account ? 'account-error' : undefined} {...register('account')} />{errors.account && <p id="account-error" className="mt-1.5 text-xs text-[#a34e40]">{errors.account.message}</p>}</div>
      <div><label className="mb-2 block text-xs text-[#62605b]" htmlFor="password">密码</label><div className="relative"><Input className="pr-[43px]" id="password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="请输入密码" disabled={isSubmitting} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} {...register('password')} /><button type="button" className="absolute right-1 top-1 grid size-8 place-items-center border-0 bg-transparent text-[#77746e]" aria-label={visible ? '隐藏密码' : '显示密码'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <p id="password-error" className="mt-1.5 text-xs text-[#a34e40]">{errors.password.message}</p>}</div>
      {errors.root && <div className="rounded-lg border border-[#efd8d2] bg-[#fcf2ef] p-2.5 text-left text-xs text-[#a34e40]" role="alert">{errors.root.message}</div>}
      <Button className="h-10 w-full !border-black !bg-black text-white hover:!bg-[#2a2927]" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? <><span className="size-3.5 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white motion-reduce:animate-none" />正在登录…</> : <>登录工作台<ArrowRight size={16} /></>}</Button>
    </form>
    <p className="text-[11px] leading-5 text-[#85827c]">忘记密码或无法登录？请联系门店管理员。</p>
    {isMock && (compact ? <p className="rounded-lg bg-[#f3f2ef] px-3 py-2 text-[10px] text-[#77746e]">体验账号 owner · 密码 Paint123!</p> : <div className="rounded-lg border border-black/10 bg-[#f3f2ef] p-[13px] text-left text-[#6f6c66] [&_code]:text-[11px] [&_p]:text-[11px] [&_p]:leading-5 [&_small]:mt-1 [&_small]:block [&_small]:text-[10px] [&_small]:text-[#908d87] [&_strong]:text-[11px] [&_strong]:font-semibold"><strong>本地模拟环境</strong><p>测试账号：owner（老板） / finance（财务） / clerk（店员）</p><p>统一测试密码：<code>Paint123!</code></p><small>仅用于功能验证，请勿录入真实账务。</small></div>)}
    {!compact && <p className="flex items-center justify-center gap-1.5 text-[10px] text-[#8d8a84]"><ShieldCheck size={14} />账号权限由门店统一管理</p>}
  </section>;
}
