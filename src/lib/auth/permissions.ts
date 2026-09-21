import type { Permission, Role, User } from '@/features/auth/schema';
export const roleLabels: Record<Role, string> = { OWNER: '老板', FINANCE: '财务', CLERK: '店员' };
export function can(user: User | null, permission: Permission): boolean {
  return user?.status === 'ACTIVE' && user.permissions.includes(permission);
}
export function safeReturnTo(value: string | null): string {
  // Only local, known Phase 1 pages may be used as a login redirect.
  if (!value || /[\\\r\n]/.test(value)) return '/dashboard';
  try {
    const url = new URL(value, 'https://local.invalid');
    return url.origin === 'https://local.invalid' && ['/dashboard', '/account', '/workers', '/teams', '/projects', '/materials', '/pricing', '/orders', '/orders/create', '/returns', '/payments', '/prepaid'].includes(url.pathname)
      ? url.pathname + url.search : '/dashboard';
  } catch { return '/dashboard'; }
}
