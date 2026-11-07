import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export type Role = 'owner' | 'cashier' | 'kitchen';
export type Actor = { cafe: string; role: Role };
export class Fault extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status=status; } }
const id = () => randomUUID();
const integer = (v: unknown, min = 1, max = 100) => { if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Fault(`Enter a whole number between ${min} and ${max}.`); return v; };
const text = (v: unknown, max = 250) => typeof v === 'string' ? v.trim().slice(0, max) : '';

export class Store {
  db: DatabaseSync;
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS cafes (id TEXT PRIMARY KEY, name TEXT NOT NULL, subtitle TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS menu (id TEXT PRIMARY KEY, cafe TEXT NOT NULL REFERENCES cafes(id), name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0), paused INTEGER NOT NULL DEFAULT 0, art TEXT NOT NULL, description TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, cafe TEXT NOT NULL REFERENCES cafes(id), customer TEXT NOT NULL, number INTEGER NOT NULL, table_no INTEGER NOT NULL, items TEXT NOT NULL, total INTEGER NOT NULL, payment TEXT NOT NULL, progress TEXT NOT NULL, held INTEGER NOT NULL, expires INTEGER NOT NULL, created INTEGER NOT NULL, checkout_key TEXT NOT NULL, UNIQUE(cafe,customer,checkout_key), UNIQUE(cafe,number));
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, cafe TEXT NOT NULL REFERENCES cafes(id), role TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, cafe TEXT NOT NULL, action TEXT NOT NULL, role TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS refunds (order_id TEXT PRIMARY KEY REFERENCES orders(id), cafe TEXT NOT NULL, status TEXT NOT NULL, requested_by TEXT NOT NULL);
    `);
    if (!(this.db.prepare('SELECT id FROM cafes LIMIT 1').get())) this.seed();
  }
  tx<T>(fn: () => T): T { this.db.exec('BEGIN IMMEDIATE'); try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  seed() {
    this.tx(() => {
      this.db.prepare('INSERT INTO cafes VALUES(?,?,?)').run('senja', 'Kopi Senja', 'Slow mornings. Good coffee.');
      this.db.prepare('INSERT INTO cafes VALUES(?,?,?)').run('taman', 'Ruang Taman', 'A little pause in your day.');
      const items: [string,string,number,number,string,string][] = [
        ['Nasi goreng','Meals',30000,12,'rice','Wok-fried rice, sunny-side egg, fresh greens.'],
        ['Iced tea','Drinks',10000,21,'tea','Freshly brewed jasmine tea, served over ice.'],
        ['Cappuccino','Coffee',28000,18,'coffee','Double espresso with silky steamed milk.'],
        ['Chicken satay','Meals',35000,0,'satay','Grilled chicken skewers with peanut sauce.'],
        ['Iced latte','Coffee',30000,16,'latte','Our house espresso, milk and a little ice.'],
        ['Butter croissant','Snacks',22000,8,'bread','Golden, flaky layers. Baked this morning.'],
        ['Matcha latte','Drinks',32000,10,'matcha','Earthy matcha with creamy milk.'],
        ['French fries','Snacks',24000,14,'fries','Crispy potatoes, sea salt and house dip.']
      ];
      for (const cafe of ['senja','taman']) items.forEach(([name,cat,price,stock,art,description],i) => this.db.prepare('INSERT INTO menu VALUES(?,?,?,?,?,?,0,?,?)').run(`${cafe}-${i+1}`,cafe,name,cat, cafe==='taman'?price+2000:price,stock,art,description));
      for (const [cafe,table,lines,progress] of [ ['senja',7,[{id:'senja-1',qty:2,note:'Less spicy, please'},{id:'senja-2',qty:1,note:''}],'Preparing'],['senja',8,[{id:'senja-3',qty:1,note:''}],'New'],['senja',3,[{id:'senja-6',qty:2,note:''}],'Ready'],['taman',2,[{id:'taman-5',qty:1,note:''}],'New'] ] as const) {
        const order=this.checkoutInner(cafe,'seed',table,[...lines],id()); this.payInner(cafe,'seed',order.id); this.db.prepare('UPDATE orders SET progress=? WHERE id=?').run(progress,order.id);
      }
    });
  }
  cafes() { return this.db.prepare('SELECT * FROM cafes').all(); }
  cafe(cafe: string) { const r=this.db.prepare('SELECT * FROM cafes WHERE id=?').get(cafe); if(!r) throw new Fault('Cafe not found.',404); return r; }
  audit(actor: Actor, action: string) { this.db.prepare('INSERT INTO audit VALUES(?,?,?,?,?)').run(id(),actor.cafe,action,actor.role,Date.now()); }
  allow(actor: Actor, roles: Role[]) { this.cafe(actor.cafe); if(!roles.includes(actor.role)) throw new Fault('Your role cannot perform this action.',403); }
  login(cafe: string, role: Role) { this.cafe(cafe); if(!['owner','cashier','kitchen'].includes(role)) throw new Fault('Choose a demo role.'); const token=id(); this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(token,cafe,role,Date.now()+86400000); return token; }
  session(token: string): Actor | null { const r=this.db.prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(token,Date.now()) as any; return r ? {cafe:r.cafe,role:r.role}:null; }
  logout(token:string) { this.db.prepare('DELETE FROM sessions WHERE id=?').run(token); }
  menu(cafe: string) { this.cafe(cafe); return this.db.prepare(`SELECT m.*, COALESCE((SELECT SUM(CAST(json_extract(j.value,'$.qty') AS INTEGER)) FROM orders o,json_each(o.items) j WHERE o.cafe=m.cafe AND o.held=1 AND json_extract(j.value,'$.id')=m.id),0) AS reserved FROM menu m WHERE cafe=?`).all(cafe).map((m:any)=>({...m,available:m.stock-m.reserved})); }
  rawOrder(cafe:string,order:string) { const r=this.db.prepare('SELECT * FROM orders WHERE cafe=? AND id=?').get(cafe,order) as any; if(!r) throw new Fault('Order not found.',404); return r; }
  shape(r:any, kitchen=false) { const fallback=r.progress==='Ready'||r.progress==='Served'?'Ready':r.progress==='Preparing'?'Preparing':'New'; const items=JSON.parse(r.items).map((line:any)=>{const {prep,...item}=line;return kitchen?{...item,prep:prep||fallback}:item;}); return {...r, items, customer:undefined,checkout_key:undefined}; }
  customerOrder(cafe:string, customer:string,order:string) { const r=this.rawOrder(cafe,order); if(r.customer!==customer) throw new Fault('Order not found.',404); return this.shape(r); }
  checkout(cafe:string,customer:string,table:number,lines:any[],key:string) { return this.tx(()=>this.checkoutInner(cafe,customer,table,lines,key)); }
  checkoutInner(cafe:string,customer:string,table:number,lines:any[],key:string) {
    this.cafe(cafe); integer(table,1,12); if(!key || key.length>100) throw new Fault('Checkout reference required.');
    const old=this.db.prepare('SELECT * FROM orders WHERE cafe=? AND customer=? AND checkout_key=?').get(cafe,customer,key); if(old) return this.shape(old);
    if(!Array.isArray(lines)||!lines.length||lines.length>30) throw new Fault('Add at least one item.');
    const menu=this.menu(cafe) as any[]; const seen=new Set();
    const items=lines.map(line=>{ const item=menu.find(m=>m.id===line.id); if(!item||seen.has(item.id)) throw new Fault('Invalid or repeated menu item.'); seen.add(item.id); const qty=integer(line.qty); if(item.paused || item.available<qty) throw new Fault(`${item.name} is unavailable in that quantity. Please update your cart.`,409); return {id:item.id,name:item.name,price:item.price,qty,note:text(line.note),prep:'New'}; });
    const total=items.reduce((s,i)=>s+i.price*i.qty,0); const number=Number((this.db.prepare('SELECT COALESCE(MAX(number),1040)+1 AS n FROM orders WHERE cafe=?').get(cafe) as any).n); const oid=id();
    this.db.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(oid,cafe,customer,number,table,JSON.stringify(items),total,'pending','New',1,Date.now()+5*60000,Date.now(),key);
    return this.shape(this.rawOrder(cafe,oid));
  }
  pay(cafe:string,customer:string,oid:string) { return this.tx(()=>this.payInner(cafe,customer,oid)); }
  payInner(cafe:string,customer:string,oid:string) {
    const order=this.rawOrder(cafe,oid); if(order.customer!==customer) throw new Fault('Order not found.',404);
    if(order.payment==='paid') return this.shape(order);
    if(order.held && order.expires<=Date.now()) this.db.prepare('UPDATE orders SET held=0,payment=? WHERE id=?').run('expired',oid);
    const latest=this.rawOrder(cafe,oid);
    if(latest.held) { this.consume(order); this.db.prepare("UPDATE orders SET payment='paid',held=0 WHERE id=?").run(oid); }
    else this.db.prepare("UPDATE orders SET payment='paid',progress='Needs review',held=0 WHERE id=?").run(oid);
    return this.shape(this.rawOrder(cafe,oid));
  }
  consume(order:any) { for(const line of JSON.parse(order.items)) { const r=this.db.prepare('UPDATE menu SET stock=stock-? WHERE id=? AND cafe=? AND stock>=?').run(line.qty,line.id,order.cafe,line.qty); if(r.changes!==1) throw new Fault('Stock conflict. Review required.',409); } }
  expire(cafe:string,customer:string,oid:string) { return this.tx(()=>{ const o=this.rawOrder(cafe,oid); if(o.customer!==customer) throw new Fault('Order not found.',404); if(o.payment==='pending') this.db.prepare("UPDATE orders SET held=0,payment='expired' WHERE id=?").run(oid); return this.shape(this.rawOrder(cafe,oid)); }); }
  sweep() { this.db.prepare("UPDATE orders SET held=0,payment='expired' WHERE payment='pending' AND expires<=?").run(Date.now()); }
  staff(actor:Actor) {
    this.allow(actor,['owner','cashier','kitchen']); this.sweep();
    const orders=(this.db.prepare(`SELECT * FROM orders WHERE cafe=? AND payment='paid' ORDER BY created ${actor.role==='kitchen'?'ASC':'DESC'}`).all(actor.cafe) as any[]).filter(o=>actor.role!=='kitchen'||o.progress!=='Needs review').map(o=>this.shape(o,actor.role==='kitchen'));
    return {cafe:this.cafe(actor.cafe),role:actor.role,orders, menu:actor.role==='kitchen'?[]:this.menu(actor.cafe),refunds:actor.role==='kitchen'?[]:this.db.prepare('SELECT * FROM refunds WHERE cafe=?').all(actor.cafe),audit:actor.role==='kitchen'?[]:this.db.prepare('SELECT action,role,created FROM audit WHERE cafe=? ORDER BY created DESC LIMIT 15').all(actor.cafe)};
  }
  advance(actor:Actor,oid:string,target:string) { return this.tx(()=>{
    this.allow(actor,target==='Served'?['owner','cashier','kitchen']:['owner','kitchen']); const o=this.rawOrder(actor.cafe,oid);
    const next:Record<string,string>={New:'Preparing',Preparing:'Ready',Ready:'Served'};
    if(o.payment!=='paid'||next[o.progress]!==target) throw new Fault('This order cannot move to that status.',409);
    this.db.prepare('UPDATE orders SET progress=? WHERE id=?').run(target,oid); this.audit(actor,`Order #${o.number}: ${target}`);
  }); }
  startPreparation(actor:Actor,oid:string) { return this.tx(()=>{
    this.allow(actor,['kitchen']); const o=this.rawOrder(actor.cafe,oid); if(o.payment!=='paid'||o.progress!=='New') throw new Fault('This order cannot be started.',409);
    const items=JSON.parse(o.items).map((line:any)=>({...line,prep:'Preparing'})); this.db.prepare("UPDATE orders SET items=?,progress='Preparing' WHERE id=?").run(JSON.stringify(items),oid); this.audit(actor,`Order #${o.number}: preparation started`);
  }); }
  advanceItem(actor:Actor,oid:string,itemId:string,target:string) { return this.tx(()=>{
    this.allow(actor,['kitchen']); const o=this.rawOrder(actor.cafe,oid); if(o.payment!=='paid'||['Served','Refunded','Needs review'].includes(o.progress)) throw new Fault('This kitchen ticket cannot be updated.',409);
    const items=JSON.parse(o.items); const item=items.find((line:any)=>line.id===itemId); if(!item) throw new Fault('Menu item not found on this ticket.',404);
    const fallback=o.progress==='Ready'?'Ready':o.progress==='Preparing'?'Preparing':'New'; const current=item.prep||fallback;
    if(current!=='Preparing'||target!=='Ready') throw new Fault('Start the order before marking menu items ready.',409); item.prep='Ready';
    const progress=items.every((line:any)=>(line.prep||fallback)==='Ready')?'Ready':items.some((line:any)=>(line.prep||fallback)==='Preparing'||(line.prep||fallback)==='Ready')?'Preparing':'New';
    this.db.prepare('UPDATE orders SET items=?,progress=? WHERE id=?').run(JSON.stringify(items),progress,oid); this.audit(actor,`Order #${o.number}: ${item.name} ${target}`);
  }); }
  inventory(actor:Actor,item:string,stock:number,paused:boolean) { return this.tx(()=>{ this.allow(actor,['owner','cashier']); integer(stock,0,100000); const m=(this.menu(actor.cafe) as any[]).find(i=>i.id===item); if(!m) throw new Fault('Item not found.',404); if(stock<m.reserved) throw new Fault(`Cannot set stock below ${m.reserved} reserved units.`,409); this.db.prepare('UPDATE menu SET stock=?,paused=? WHERE id=? AND cafe=?').run(stock,paused?1:0,item,actor.cafe); this.audit(actor,`${m.name}: stock ${stock}, ordering ${paused?'paused':'open'}`); }); }
  review(actor:Actor,oid:string) { return this.tx(()=>{ this.allow(actor,['owner','cashier']); const o=this.rawOrder(actor.cafe,oid); if(o.payment!=='paid'||o.progress!=='Needs review') throw new Fault('Order is not awaiting review.',409); const menu=this.menu(actor.cafe) as any[]; for(const l of JSON.parse(o.items)){const m=menu.find(m=>m.id===l.id);if(!m||m.available<l.qty) throw new Fault('Not enough stock. Request a refund or arrange an agreed replacement.',409);} this.consume(o); this.db.prepare("UPDATE orders SET progress='New' WHERE id=?").run(oid); this.audit(actor,`Late order #${o.number}: released to kitchen`); }); }
  refund(actor:Actor,oid:string,action:string) { return this.tx(()=>{this.allow(actor,action==='request'?['owner','cashier']:['owner']); const o=this.rawOrder(actor.cafe,oid); if(o.payment!=='paid'||o.progress==='Refunded') throw new Fault('This order is not refundable.',409); if(action==='request'){this.db.prepare("INSERT OR IGNORE INTO refunds VALUES(?,?,'requested',?)").run(oid,actor.cafe,actor.role); this.audit(actor,`Refund requested for #${o.number}`);} else if(action==='approve'){this.db.prepare("INSERT INTO refunds VALUES(?,?,'pending',?) ON CONFLICT(order_id) DO UPDATE SET status='pending' WHERE status='requested'").run(oid,actor.cafe,actor.role);this.audit(actor,`Refund pending for #${o.number}`);} else if(action==='confirm'){const r=this.db.prepare("UPDATE refunds SET status='completed' WHERE order_id=? AND cafe=? AND status='pending'").run(oid,actor.cafe);if(!r.changes)throw new Fault('Approve the refund first.',409);this.db.prepare("UPDATE orders SET progress='Refunded' WHERE id=?").run(oid);this.audit(actor,`Simulated refund completed for #${o.number}`);}else throw new Fault('Unknown refund action.'); }); }
}

const globalStore=globalThis as unknown as {mfStore?:Store};
export function getStore() { if(!globalStore.mfStore){mkdirSync(path.join(process.cwd(),'data'),{recursive:true});globalStore.mfStore=new Store(path.join(process.cwd(),'data','simulation.sqlite'));} return globalStore.mfStore; }
