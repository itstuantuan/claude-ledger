import type { ProjectStatus } from './schema';
export const entityStatusLabels = { ACTIVE: '正常', DISABLED: '已停用' } as const;
export const projectStatusLabels: Record<ProjectStatus, string> = { PLANNING: '筹备中', ACTIVE: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' };

