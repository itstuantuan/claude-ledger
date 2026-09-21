import test from 'node:test';
import assert from 'node:assert/strict';
import { projectInputSchema, teamInputSchema, workerInputSchema } from '../src/features/customers/schema';

test('worker and team inputs reject invalid phone numbers', () => {
  assert.equal(workerInputSchema.safeParse({ name:'张三',phone:'123',wechat:'',teamId:null,status:'ACTIVE',note:'' }).success,false);
  assert.equal(teamInputSchema.safeParse({ name:'施工队',leader:'张三',phone:'123',status:'ACTIVE',note:'' }).success,false);
});
test('project requires a worker and an ordered date range', () => {
  const input={name:'项目',address:'地址',manager:'张三',workerIds:[],teamId:null,startDate:'2026-09-20',endDate:'2026-09-01',status:'ACTIVE' as const,note:''};
  const result=projectInputSchema.safeParse(input);assert.equal(result.success,false);
  if(!result.success) assert.deepEqual(new Set(result.error.issues.map(x=>x.path[0])),new Set(['workerIds','endDate']));
});
