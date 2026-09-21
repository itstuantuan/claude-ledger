'use client';
import type { ReactNode } from 'react';
import type { Permission } from '@/features/auth/schema';
import { can } from '@/lib/auth/permissions';
import { useAuthStore } from '@/stores/auth-store';
export function PermissionGate({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  return can(user, permission) ? children : fallback;
}
