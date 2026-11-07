import {NextRequest,NextResponse} from 'next/server';
import QRCode from 'qrcode';
import {getStore} from '@/lib/store';
export const runtime='nodejs';
export async function GET(req:NextRequest){
  if(!['127.0.0.1','localhost','[::1]'].includes(req.nextUrl.hostname))return new NextResponse('Local simulation only',{status:403});
  const cafe=req.nextUrl.searchParams.get('cafe')||'';const table=Number(req.nextUrl.searchParams.get('table'));
  try{getStore().cafe(cafe);if(!Number.isInteger(table)||table<1||table>12)throw Error();}catch{return new NextResponse('Invalid table',{status:404});}
  const url=`http://${req.headers.get('host')}/order/${cafe}/${table}`;
  const svg=await QRCode.toString(url,{type:'svg',margin:2,width:160,color:{dark:'#335e43',light:'#fffefa'}});
  const headers:Record<string,string>={'Content-Type':'image/svg+xml','Cache-Control':'no-store'};
  if(req.nextUrl.searchParams.has('download'))headers['Content-Disposition']=`attachment; filename="${cafe}-table-${table}-local.svg"`;
  return new NextResponse(svg,{headers});
}
