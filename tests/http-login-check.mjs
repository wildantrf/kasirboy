import assert from 'node:assert/strict';
const base='http://127.0.0.1:3100';
async function post(body,cookie=''){return fetch(base+'/api/sim',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:cookie},body:JSON.stringify(body)});}
assert.equal((await post({op:'ownerLogin',email:'owner@mejaflow.demo',password:'wrong',cafe:'senja'})).status,401);
const login=await post({op:'ownerLogin',email:'owner@mejaflow.demo',password:'MejaFlowDemo123!',cafe:'senja'});assert.equal(login.status,200);
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
const session=await(await fetch(base+'/api/sim',{headers:{Cookie:cookie}})).json();assert.deepEqual(session.actor,{cafe:'senja',role:'owner'});
assert.equal((await post({op:'logout'},cookie)).status,200);
assert.equal((await(await fetch(base+'/api/sim',{headers:{Cookie:cookie}})).json()).actor,null);
for(const route of ['/','/workspace','/order/senja/7'])assert.equal((await fetch(base+route)).status,200);
console.log('Owner login, invalid credentials, logout revocation, home/workspace/customer routes passed.');
