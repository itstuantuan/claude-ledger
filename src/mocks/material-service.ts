import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateMock, mockFail } from './auth-service';
import { materialInputSchema, pricingBatchInputSchema, type Material } from '@/features/materials/schema';

let materials: Material[] = [
  ['m-1','金装五合一面漆','内墙漆','多乐士','18L','桶','520.00','388.00',126],
  ['m-2','净味二合一面漆','内墙漆','立邦','18L','桶','460.00','342.00',94],
  ['m-3','抗碱底漆','底漆','多乐士','18L','桶','285.00','210.00',81],
  ['m-4','墙面加固剂','辅材','三棵树','18kg','桶','168.00','118.00',57],
  ['m-5','外墙耐候面漆','外墙漆','华润漆','20kg','桶','680.00','515.00',42],
  ['m-6','柔性防水涂料','防水','东方雨虹','20kg','桶','298.00','226.00',39],
  ['m-7','内墙耐水腻子','腻子','美巢','20kg','袋','48.00','34.00',168],
  ['m-8','接缝纸带','辅材','三棵树','50m','卷','18.00','11.50',31],
].map(([id,name,category,brand,specification,unit,defaultPrice,costPrice,salesCount]) => ({
  id,name,category,brand,specification,unit,defaultPrice,costPrice,salesCount,status:'ACTIVE',version:1,
} as Material));

const prices = new Map<string, Map<string, string>>();
prices.set('w-1', new Map([['m-1','495.00'],['m-3','270.00'],['m-7','44.00']]));

export function findMockMaterial(id:string){return materials.find((item)=>item.id===id);}
export function getMockMaterialPrice(workerId:string,materialId:string){return prices.get(workerId)?.get(materialId)||findMockMaterial(materialId)?.defaultPrice;}

function page<T>(items:T[], request:NextRequest) {
  const current=Math.max(1,Number(request.nextUrl.searchParams.get('page'))||1);
  const size=Math.min(50,Math.max(1,Number(request.nextUrl.searchParams.get('pageSize'))||10));
  return {items:items.slice((current-1)*size,current*size),page:current,pageSize:size,total:items.length};
}
function failValidation(error:{flatten():{fieldErrors:Record<string,string[]>}}) {
  return mockFail(422,'VALIDATION_ERROR','请检查填写的内容。',error.flatten().fieldErrors);
}

export async function handleMockMaterials(request:NextRequest,path:string[]) {
  const user=authenticateMock(request);
  if(!user)return mockFail(401,'UNAUTHENTICATED','请先登录。');
  const write=request.method!=='GET';
  if(write&&!user.permissions.includes('materials:write'))return mockFail(403,'FORBIDDEN','你没有维护材料和客户价格的权限。');
  const [resource,id]=path;
  if(resource==='materials') {
    if(request.method==='GET') {
      let items=[...materials];const q=request.nextUrl.searchParams;
      const search=(q.get('search')||'').toLowerCase();if(search)items=items.filter(x=>`${x.name}${x.brand}${x.specification}`.toLowerCase().includes(search));
      const brand=q.get('brand');if(brand)items=items.filter(x=>x.brand===brand);
      const category=q.get('category');if(category)items=items.filter(x=>x.category===category);
      const status=q.get('status');if(status)items=items.filter(x=>x.status===status);
      return NextResponse.json(page(items,request));
    }
    const parsed=materialInputSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return failValidation(parsed.error);
    const existing=id?materials.find(x=>x.id===id):undefined;if(id&&!existing)return mockFail(404,'MATERIAL_NOT_FOUND','材料不存在。');
    if(existing&&parsed.data.version!==existing.version)return mockFail(409,'VERSION_CONFLICT','材料已被其他人修改，请刷新后重试。');
    const next:Material={id:existing?.id||`m-${randomUUID()}`,...parsed.data,salesCount:existing?.salesCount||0,version:(existing?.version||0)+1};
    materials=existing?materials.map(x=>x.id===id?next:x):[next,...materials];
    return NextResponse.json(next,{status:existing?200:201});
  }
  if(resource==='pricing') {
    const workerId=request.nextUrl.searchParams.get('workerId')||'';
    if(request.method==='GET') {
      if(!workerId)return mockFail(422,'WORKER_REQUIRED','请选择油漆工。');
      const own=prices.get(workerId);
      return NextResponse.json(materials.filter(x=>x.status==='ACTIVE').map(x=>({materialId:x.id,materialName:x.name,brand:x.brand,specification:x.specification,unit:x.unit,defaultPrice:x.defaultPrice,customerPrice:own?.get(x.id)||null,effectivePrice:own?.get(x.id)||x.defaultPrice})));
    }
    const parsed=pricingBatchInputSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return failValidation(parsed.error);
    const own=prices.get(parsed.data.workerId)||new Map<string,string>();
    for(const item of parsed.data.prices){if(item.price===null)own.delete(item.materialId);else own.set(item.materialId,item.price);}
    prices.set(parsed.data.workerId,own);
    return NextResponse.json(materials.filter(x=>x.status==='ACTIVE').map(x=>({materialId:x.id,materialName:x.name,brand:x.brand,specification:x.specification,unit:x.unit,defaultPrice:x.defaultPrice,customerPrice:own.get(x.id)||null,effectivePrice:own.get(x.id)||x.defaultPrice})));
  }
  return mockFail(404,'NOT_FOUND','接口不存在。');
}
