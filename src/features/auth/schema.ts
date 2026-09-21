import { z } from 'zod';

export const roles = ['OWNER', 'FINANCE', 'CLERK'] as const;
export const permissions = ['workers:read', 'workers:write', 'materials:read', 'materials:write', 'orders:create', 'returns:request', 'returns:confirm', 'returns:manual', 'finance:read', 'payments:create', 'prepaid:deposit', 'ledger:adjust', 'reconciliation:read', 'reports:read', 'system:manage'] as const;
export const userSchema = z.object({
  id: z.string(), name: z.string(), account: z.string(), role: z.enum(roles),
  permissions: z.array(z.enum(permissions)), status: z.enum(['ACTIVE', 'DISABLED']),
});
export const sessionSchema = z.object({ accessToken: z.string().min(1), expiresIn: z.number().positive(), user: userSchema });
export const loginSchema = z.object({
  account: z.string().trim().min(1, '请输入账号').max(80, '账号不能超过 80 个字符'),
  password: z.string().min(1, '请输入密码').max(128, '密码不能超过 128 个字符'),
});
export type User = z.infer<typeof userSchema>;
export type Role = User['role'];
export type Permission = typeof permissions[number];
export type Session = z.infer<typeof sessionSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
