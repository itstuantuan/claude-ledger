import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateMock, mockFail } from './auth-service';
import { projectInputSchema, teamInputSchema, workerInputSchema, type Project, type Team, type Worker } from '@/features/customers/schema';
import { fromMinorUnits, toMinorUnits } from '@/lib/utils/money';

let teams: Team[] = [
  { id:'t-1',name:'匠心施工队',leader:'赵强',phone:'13800138001',memberCount:4,materialTotal:'128600.00',paymentTotal:'96300.00',receivable:'27100.00',note:'主要承接住宅精装',status:'ACTIVE',version:1 },
  { id:'t-2',name:'新城涂装队',leader:'周明',phone:'13800138002',memberCount:3,materialTotal:'86420.00',paymentTotal:'70200.00',receivable:'13420.00',note:'商铺与办公空间',status:'ACTIVE',version:1 },
  { id:'t-3',name:'安居油漆队',leader:'陈建国',phone:'13800138003',memberCount:2,materialTotal:'55800.00',paymentTotal:'51600.00',receivable:'4200.00',note:'老房翻新',status:'ACTIVE',version:1 },
  { id:'t-4',name:'鸿运施工队',leader:'刘海',phone:'13800138004',memberCount:2,materialTotal:'34600.00',paymentTotal:'29800.00',receivable:'4800.00',note:'暂停承接新项目',status:'DISABLED',version:1 },
];
let workers: Worker[] = [
  ['w-1','张建华','13900139001','zhangjh','t-1','匠心施工队','ACTIVE','52600.00','1800.00','39000.00','2000.00','9800.00','2026-09-20T10:30:00+08:00','长期合作，价格按客户价'],
  ['w-2','李国强','13900139002','liqiang88','t-1','匠心施工队','ACTIVE','38100.00','600.00','30100.00','0.00','7400.00','2026-09-19T16:20:00+08:00',''],
  ['w-3','王师傅','13900139003',null,'t-2','新城涂装队','ACTIVE','46800.00','2200.00','35000.00','1000.00','8600.00','2026-09-18T09:15:00+08:00','常做商铺项目'],
  ['w-4','陈海波','13900139004','chenhaibo','t-3','安居油漆队','ACTIVE','31200.00','900.00','28100.00','500.00','2200.00','2026-09-16T14:40:00+08:00',''],
  ['w-5','赵勇','13900139005',null,'t-2','新城涂装队','ACTIVE','23800.00','0.00','19800.00','0.00','4000.00','2026-09-15T11:00:00+08:00',''],
  ['w-6','孙成','13900139006','suncheng','t-1','匠心施工队','ACTIVE','19400.00','400.00','17000.00','1000.00','1000.00','2026-09-12T17:20:00+08:00',''],
  ['w-7','周平','13900139007',null,'t-3','安居油漆队','ACTIVE','24600.00','800.00','23500.00','0.00','300.00','2026-09-10T08:50:00+08:00',''],
  ['w-8','刘志伟','13900139008','liuzw','t-4','鸿运施工队','DISABLED','18600.00','0.00','13800.00','0.00','4800.00','2026-08-28T13:10:00+08:00','已离开本地'],
  ['w-9','黄文军','13900139009',null,null,null,'ACTIVE','12600.00','300.00','10500.00','800.00','1000.00','2026-09-08T12:00:00+08:00','独立油漆工'],
  ['w-10','吴建民','13900139010','wujm',null,null,'ACTIVE','9800.00','0.00','9800.00','500.00','0.00','2026-09-03T15:30:00+08:00',''],
  ['w-11','郑师傅','13900139011',null,'t-1','匠心施工队','ACTIVE','18500.00','0.00','16500.00','0.00','2000.00','2026-09-01T10:00:00+08:00',''],
] .map(([id,name,phone,wechat,teamId,teamName,status,materialTotal,returnTotal,paymentTotal,prepaidBalance,receivable,lastTransactionAt,note]) => ({ id,name,phone,wechat,teamId,teamName,status,materialTotal,returnTotal,paymentTotal,prepaidBalance,receivable,lastTransactionAt,note,version:1 } as Worker));
let projects: Project[] = [
  { id:'p-1',name:'滨江壹号 3 栋',address:'滨江路 88 号',manager:'张建华',workerIds:['w-1','w-2'],workerNames:['张建华','李国强'],teamId:'t-1',teamName:'匠心施工队',startDate:'2026-08-12',endDate:null,status:'ACTIVE',note:'精装交付',materialTotal:'38600.00',version:1 },
  { id:'p-2',name:'万象城商铺改造',address:'中心大道万象城 B1',manager:'王师傅',workerIds:['w-3','w-5'],workerNames:['王师傅','赵勇'],teamId:'t-2',teamName:'新城涂装队',startDate:'2026-09-01',endDate:'2026-10-20',status:'ACTIVE',note:'夜间施工',materialTotal:'29300.00',version:1 },
  { id:'p-3',name:'金桂苑旧房翻新',address:'金桂苑 12-2-601',manager:'陈海波',workerIds:['w-4'],workerNames:['陈海波'],teamId:'t-3',teamName:'安居油漆队',startDate:'2026-09-18',endDate:null,status:'PLANNING',note:'等待业主确认颜色',materialTotal:'0.00',version:1 },
  { id:'p-4',name:'云庭酒店翻新',address:'东湖路 16 号',manager:'赵强',workerIds:['w-1','w-6','w-11'],workerNames:['张建华','孙成','郑师傅'],teamId:'t-1',teamName:'匠心施工队',startDate:'2026-05-10',endDate:'2026-08-30',status:'COMPLETED',note:'已验收',materialTotal:'68400.00',version:1 },
  { id:'p-5',name:'南苑办公楼',address:'科创园南苑 5 号楼',manager:'周明',workerIds:['w-3'],workerNames:['王师傅'],teamId:'t-2',teamName:'新城涂装队',startDate:'2026-07-01',endDate:null,status:'CANCELLED',note:'甲方暂停项目',materialTotal:'17800.00',version:1 },
];

export function findMockWorker(id:string){return workers.find((item)=>item.id===id);}
export function listMockWorkers(){return [...workers];}
export function findMockProject(id:string){return projects.find((item)=>item.id===id);}
export function listMockProjects(){return [...projects];}
export function updateMockWorkerFinancials(id:string, change:{materialTotal?:bigint;returnTotal?:bigint;paymentTotal?:bigint;prepaidBalance?:bigint;receivable?:bigint;occurredAt?:string}) {
  const worker=workers.find((item)=>item.id===id);if(!worker)return undefined;
  const add=(value:string,delta=0n)=>fromMinorUnits(toMinorUnits(value)+delta);
  const next:Worker={...worker,materialTotal:add(worker.materialTotal,change.materialTotal),returnTotal:add(worker.returnTotal,change.returnTotal),paymentTotal:add(worker.paymentTotal,change.paymentTotal),prepaidBalance:add(worker.prepaidBalance,change.prepaidBalance),receivable:add(worker.receivable,change.receivable),lastTransactionAt:change.occurredAt||worker.lastTransactionAt,version:worker.version+1};
  workers=workers.map((item)=>item.id===id?next:item);return next;
}

function paginate<T>(items:T[], request:NextRequest) { const page=Math.max(1,Number(request.nextUrl.searchParams.get('page'))||1); const pageSize=Math.min(50,Math.max(1,Number(request.nextUrl.searchParams.get('pageSize'))||10)); return {items:items.slice((page-1)*pageSize,page*pageSize),page,pageSize,total:items.length}; }
function money(value:string){ return Number(value); }
function validation(error: { flatten(): { fieldErrors: Record<string, string[]> } }) { return mockFail(422,'VALIDATION_ERROR','请检查填写的内容。',error.flatten().fieldErrors); }
function permitted(request:NextRequest, write=false) { const user=authenticateMock(request); if(!user) return {error:mockFail(401,'UNAUTHENTICATED','请先登录。')}; if(write && !user.permissions.includes('workers:write')) return {error:mockFail(403,'FORBIDDEN','你没有维护客户资料的权限。')}; return {user}; }

export async function handleMockCustomers(request:NextRequest,path:string[]) {
  const access=permitted(request,request.method!=='GET'); if('error' in access) return access.error;
  const [resource,id]=path; const q=request.nextUrl.searchParams;
  if(resource==='workers') {
    if(request.method==='GET'&&id){const item=workers.find(x=>x.id===id);return item?NextResponse.json(item):mockFail(404,'WORKER_NOT_FOUND','油漆工不存在。');}
    if(request.method==='GET') { let items=[...workers]; const search=(q.get('search')||'').toLowerCase(); if(search)items=items.filter(x=>`${x.name}${x.phone}${x.wechat||''}`.toLowerCase().includes(search)); const team=q.get('teamId');if(team)items=items.filter(x=>x.teamId===team);const debt=q.get('debt');if(debt==='owing')items=items.filter(x=>money(x.receivable)>0);if(debt==='clear')items=items.filter(x=>money(x.receivable)<=0);const status=q.get('status');if(status)items=items.filter(x=>x.status===status);const sort=q.get('sort')||'lastTransactionAt_desc';items.sort((a,b)=>sort==='receivable_desc'?money(b.receivable)-money(a.receivable):sort==='name_asc'?a.name.localeCompare(b.name,'zh-CN'):(b.lastTransactionAt||'').localeCompare(a.lastTransactionAt||''));return NextResponse.json(paginate(items,request)); }
    const parsed=workerInputSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return validation(parsed.error);const existing=id?workers.find(x=>x.id===id):undefined;if(id&&!existing)return mockFail(404,'WORKER_NOT_FOUND','油漆工不存在。');if(existing&&parsed.data.version!==existing.version)return mockFail(409,'VERSION_CONFLICT','资料已被其他人修改，请刷新后重试。');const team=teams.find(x=>x.id===parsed.data.teamId);const next:Worker={id:existing?.id||`w-${randomUUID()}`,...parsed.data,wechat:parsed.data.wechat||null,teamId:team?.id||null,teamName:team?.name||null,materialTotal:existing?.materialTotal||'0.00',returnTotal:existing?.returnTotal||'0.00',paymentTotal:existing?.paymentTotal||'0.00',prepaidBalance:existing?.prepaidBalance||'0.00',receivable:existing?.receivable||'0.00',lastTransactionAt:existing?.lastTransactionAt||null,version:(existing?.version||0)+1};workers=existing?workers.map(x=>x.id===id?next:x):[next,...workers];return NextResponse.json(next,{status:existing?200:201});
  }
  if(resource==='teams') {
    if(request.method==='GET'&&id){const item=teams.find(x=>x.id===id);return item?NextResponse.json(item):mockFail(404,'TEAM_NOT_FOUND','施工队不存在。');}
    if(request.method==='GET'){let items=[...teams];const search=q.get('search')||'';if(search)items=items.filter(x=>`${x.name}${x.leader}${x.phone}`.includes(search));return NextResponse.json(paginate(items,request));}
    const parsed=teamInputSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return validation(parsed.error);const existing=id?teams.find(x=>x.id===id):undefined;if(id&&!existing)return mockFail(404,'TEAM_NOT_FOUND','施工队不存在。');if(existing&&parsed.data.version!==existing.version)return mockFail(409,'VERSION_CONFLICT','资料已被其他人修改，请刷新后重试。');const next:Team={id:existing?.id||`t-${randomUUID()}`,...parsed.data,memberCount:existing?.memberCount||0,materialTotal:existing?.materialTotal||'0.00',paymentTotal:existing?.paymentTotal||'0.00',receivable:existing?.receivable||'0.00',version:(existing?.version||0)+1};teams=existing?teams.map(x=>x.id===id?next:x):[next,...teams];return NextResponse.json(next,{status:existing?200:201});
  }
  if(resource==='projects') {
    if(request.method==='GET'&&id){const item=projects.find(x=>x.id===id);return item?NextResponse.json(item):mockFail(404,'PROJECT_NOT_FOUND','项目不存在。');}
    if(request.method==='GET'){let items=[...projects];const search=q.get('search')||'';if(search)items=items.filter(x=>`${x.name}${x.address}${x.manager}`.includes(search));const status=q.get('status');if(status)items=items.filter(x=>x.status===status);return NextResponse.json(paginate(items,request));}
    const parsed=projectInputSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return validation(parsed.error);const existing=id?projects.find(x=>x.id===id):undefined;if(id&&!existing)return mockFail(404,'PROJECT_NOT_FOUND','项目不存在。');if(existing&&parsed.data.version!==existing.version)return mockFail(409,'VERSION_CONFLICT','资料已被其他人修改，请刷新后重试。');const selected=workers.filter(x=>parsed.data.workerIds.includes(x.id));const team=teams.find(x=>x.id===parsed.data.teamId);const next:Project={id:existing?.id||`p-${randomUUID()}`,...parsed.data,workerNames:selected.map(x=>x.name),teamId:team?.id||null,teamName:team?.name||null,materialTotal:existing?.materialTotal||'0.00',version:(existing?.version||0)+1};projects=existing?projects.map(x=>x.id===id?next:x):[next,...projects];return NextResponse.json(next,{status:existing?200:201});
  }
  return mockFail(404,'NOT_FOUND','接口不存在。');
}
