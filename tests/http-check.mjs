import assert from 'node:assert/strict';
const base='http://127.0.0.1:3100';
async function send(body,cookie='',origin=base){const r=await fetch(base+'/api/sim',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:origin},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),cookies:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};}
async function get(q,cookie=''){const r=await fetch(base+'/api/sim'+q,{headers:{Cookie:cookie}});return {status:r.status,body:await r.json()};}
const owner=await send({op:'login',cafe:'taman',role:'owner'});assert.equal(owner.status,200);
const cashier=await send({op:'login',cafe:'taman',role:'cashier'});
const kitchen=await send({op:'login',cafe:'taman',role:'kitchen'});
assert.equal((await send({op:'login',cafe:'taman',role:'owner'},'','https://unrelated.example')).status,403);
assert.equal((await send({op:'inventory',id:'taman-8',stock:1,paused:false},kitchen.cookies)).status,403);
assert.equal((await send({op:'inventory',id:'taman-8',stock:1,paused:false},owner.cookies)).status,200);
const customers=await Promise.all([send({op:'checkout',cafe:'taman',table:10,key:crypto.randomUUID(),items:[{id:'taman-8',qty:1}]}),send({op:'checkout',cafe:'taman',table:11,key:crypto.randomUUID(),items:[{id:'taman-8',qty:1}]})]);
assert.deepEqual(customers.map(c=>c.status).sort(),[200,409]);
const winner=customers.find(c=>c.status===200);const order=winner.body;
assert(!(await get('',kitchen.cookies)).body.orders.some(o=>o.id===order.id));
assert.equal((await get(`?view=order&cafe=taman&id=${order.id}`)).status,404);
await Promise.all([send({op:'pay',cafe:'taman',id:order.id},winner.cookies),send({op:'pay',cafe:'taman',id:order.id},winner.cookies)]);
assert.equal((await get('',kitchen.cookies)).body.orders.filter(o=>o.id===order.id).length,1);
assert.equal((await send({op:'advance',id:order.id,target:'Preparing'},cashier.cookies)).status,403);
assert.equal((await send({op:'advance',id:order.id,target:'Preparing'},kitchen.cookies)).status,200);
assert.equal((await send({op:'refund',id:order.id,action:'approve'},cashier.cookies)).status,403);
const other=await send({op:'login',cafe:'senja',role:'owner'});
assert(!(await get('',other.cookies)).body.orders.some(o=>o.id===order.id));
assert.equal((await send({op:'advance',id:order.id,target:'Ready'},other.cookies)).status,404);
const item=(await get('?view=menu&cafe=taman')).body.menu.find(m=>m.id==='taman-8');assert.equal(item.stock,0);assert.equal(item.reserved,0);
const qr=await fetch(base+'/api/qr?cafe=taman&table=7');assert.equal(qr.status,200);assert((await qr.text()).includes('<svg'));
assert.equal((await fetch(base+'/api/qr?cafe=taman&table=99')).status,404);
console.log('HTTP checks passed: same-origin writes, kitchen/cashier denials, concurrent last-unit checkout, customer privacy, duplicate payments, cafe isolation and QR validation.');
