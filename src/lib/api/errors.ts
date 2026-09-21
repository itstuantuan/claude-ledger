import { z } from 'zod';
const errorSchema = z.object({ code: z.string(), message: z.string(), requestId: z.string().optional(), fieldErrors: z.record(z.string(), z.array(z.string())).optional() });
const messages: Record<number, string> = {
  401: '登录已过期，请重新登录。', 403: '你没有执行此操作的权限。',
  404: '所请求的内容不存在。', 409: '数据已变更或请求已提交，请刷新后核对。',
  422: '请检查填写的内容。', 500: '服务暂时不可用，请稍后重试。',
};
export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'API_ERROR', public requestId?: string, public fieldErrors?: Record<string, string[]>) { super(message); this.name = 'ApiError'; }
  static fromResponse(status: number, data: unknown, requestId?: string) {
    const parsed = errorSchema.safeParse(data);
    return parsed.success
      ? new ApiError(status, parsed.data.message, parsed.data.code, parsed.data.requestId ?? requestId, parsed.data.fieldErrors)
      : new ApiError(status, messages[status] ?? '请求失败，请稍后重试。', 'API_ERROR', requestId);
  }
}
export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : '发生未知错误，请重试。'; }
