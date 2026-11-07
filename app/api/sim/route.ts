import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { Fault,getStore,type Role } from '@/lib/store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function local(req:NextRequest) { const host=(req.headers.get('host')||req.nextUrl.hostname).split(':')[0]; const privateNetwork=/^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(host); if(!['localhost','127.0.0.1','[::1]'].includes(host)&&!privateNetwork) throw new Fault('This simulation is available on this local network only.',403); const origin=req.headers.get('origin'); if(origin && new URL(origin).host!==req.headers.get('host')) throw new Fault('Cross-origin request blocked.',403); }
function error(e:unknown) { return NextResponse.json({error:e instanceof Fault?e.message:'Something went wrong. Please retry.'},{status:e instanceof Fault?e.status:500}); }
export async function GET(req:NextRequest) { try {local(req);const s=getStore();s.sweep();const q=req.nextUrl.searchParams;const view=q.get('view');if(view==='cafes')return NextResponse.json(s.cafes());if(view==='menu')return NextResponse.json({cafe:s.cafe(q.get('cafe')||''),menu:s.menu(q.get('cafe')||'')});if(view==='order')return NextResponse.json(s.customerOrder(q.get('cafe')||'',req.cookies.get('mf_customer')?.value||'',q.get('id')||''));const actor=s.session(req.cookies.get('mf_staff')?.value||'');if(!actor)return NextResponse.json({actor:null});return NextResponse.json({actor,...s.staff(actor)});}catch(e){return error(e);} }
export async function POST(req:NextRequest) {try{local(req);const s=getStore();const raw=await req.text();if(raw.length>20000)throw new Fault('Request too large.',413);let b;try{b=JSON.parse(raw);}catch{throw new Fault('Invalid request.');}let customer=req.cookies.get('mf_customer')?.value||randomUUID();let result:unknown={ok:true};let sessionToken='';
  if(b.op==='login'){sessionToken=s.login(b.cafe,b.role as Role);}
  else if(b.op==='logout')s.logout(req.cookies.get('mf_staff')?.value||'');
  else if(b.op==='checkout')result=s.checkout(b.cafe,customer,b.table,b.items,b.key);
  else if(b.op==='pay')result=s.pay(b.cafe,customer,b.id);
  else if(b.op==='expire')result=s.expire(b.cafe,customer,b.id);
  else {const actor=s.session(req.cookies.get('mf_staff')?.value||'');if(!actor)throw new Fault('Choose a demo staff session first.',401);if(b.op==='saveStaff')result=s.saveStaff(actor,b.id,b.name,b.role,b.active);else if(b.op==='deleteStaff')s.deleteStaff(actor,b.id);else if(b.op==='advance')s.advance(actor,b.id,b.target);else if(b.op==='startPreparation')s.startPreparation(actor,b.id);else if(b.op==='advanceItem')s.advanceItem(actor,b.id,b.itemId,b.target);else if(b.op==='inventory')s.inventory(actor,b.id,b.stock,b.paused);else if(b.op==='review')s.review(actor,b.id);else if(b.op==='refund')s.refund(actor,b.id,b.action);else throw new Fault('Unknown action.');}
  const response=NextResponse.json(result);response.cookies.set('mf_customer',customer,{httpOnly:true,sameSite:'strict',path:'/',maxAge:86400});if(sessionToken)response.cookies.set('mf_staff',sessionToken,{httpOnly:true,sameSite:'strict',path:'/',maxAge:86400});if(b.op==='logout')response.cookies.delete('mf_staff');return response;
}catch(e){return error(e);}}
