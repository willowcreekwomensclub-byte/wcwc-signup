const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8');
function environment({fail=false, missing=false}={}) {
  let groupCalls=0, peopleCalls=0;
  const store=new Map();
  const output = value => ({value,setXFrameOptionsMode(){return this;}});
  const context=vm.createContext({
    console:{log(){},error(){}},
    Utilities:{newBlob:s=>({getBytes:()=>Buffer.from(s)})},
    CacheService:{getScriptCache:()=>({get:k=>store.get(k),put:(k,v)=>store.set(k,v),remove:k=>store.delete(k)})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    HtmlService:{XFrameOptionsMode:{ALLOWALL:1},createHtmlOutput:output,createTemplateFromFile(name){assert.equal(name,'Index'); return {evaluate(){return output(JSON.parse(this.payload));}};}},
    People:{ContactGroups:{list(o){groupCalls++; if(fail) throw Error('API unavailable'); return o.pageToken ? {contactGroups:missing?[]:[{name:'2026-27 Members',resourceName:'contactGroups/members'}]} : {contactGroups:[{name:'Other',resourceName:'contactGroups/other'}],nextPageToken:'groups2'};}},People:{Connections:{list(id,o){peopleCalls++; assert.equal(id,'people/me'); if(o.pageToken) return {connections:[{emailAddresses:[{value:' MEMBER@EXAMPLE.COM '},{value:'alternate@example.com'}],memberships:[{contactGroupMembership:{contactGroupResourceName:'contactGroups/members'}}]}]}; return {connections:[{emailAddresses:[{value:'outsider@example.com'}],memberships:[{contactGroupMembership:{contactGroupResourceName:'contactGroups/other'}}]}],nextPageToken:'people2'};}}}}
  });
  vm.runInContext(code,context);
  const post=(email,extra={})=>context.doPost({parameter:{email,origin:'https://willowcreekwomensclub-byte.github.io',requestId:'a'.repeat(32),...extra}}).value;
  return {context,post,calls:()=>({groupCalls,peopleCalls})};
}
test('member on later pages, alternate email, mixed case, spaces, and caching',()=>{const e=environment(); for(const email of ['member@example.com',' MEMBER@EXAMPLE.COM ','alternate@example.com']) assert.equal(e.post(email).destination,'https://tinyurl.com/wcwc-holidaytea'); assert.deepEqual(e.calls(),{groupCalls:2,peopleCalls:2});});
test('unlabeled contact and unknown email go to registration',()=>{const e=environment();for(const email of ['outsider@example.com','unknown@example.com'])assert.equal(e.post(email).destination,'https://tinyurl.com/wcwc-register');});
test('API failures and missing label never send visitors to registration',()=>{for(const opts of [{fail:true},{missing:true}]){const r=environment(opts).post('member@example.com');assert.equal(r.ok,false);assert.equal(r.error,'lookup_unavailable');assert.equal(r.destination,undefined);}});
test('invalid email, origin and request ID are rejected before contact access',()=>{const e=environment();for(const email of ['','bad','a@b','a b@example.com','a'.repeat(250)+'@example.com']) assert.equal(e.post(email).error,'invalid_email');assert.match(e.post('x@example.com',{origin:'https://evil.example'}),/Invalid request/);assert.match(e.post('x@example.com',{requestId:'bad'}),/Invalid request/);assert.deepEqual(e.calls(),{groupCalls:0,peopleCalls:0});});
test('template JSON cannot break out of script and retains its value',()=>{const e=environment();const input={s:'</script><script>alert(1)</script>&'};const encoded=e.context.safeJson_(input);assert.equal(encoded.includes('<'),false);assert.deepEqual(JSON.parse(encoded),input);});
