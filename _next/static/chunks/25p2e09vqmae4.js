(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[53668,t=>{var e=t.i(43476),r=t.i(47465),s=t.i(811);let n=`#pragma once
class Counter {
 public:
  virtual ~Counter() = default;
  virtual int next() = 0;
};
Counter* make_counter();
`,a=`#include "api.h"

// Implement Counter and make_counter() here. Add more files with the + button.
Counter* make_counter() { return nullptr; }
`,i=`#define BP_TEST_MAIN
#include "bp_test.h"
#include "api.h"
#include <memory>
TEST(Counter, counts) {
  std::unique_ptr<Counter> c(make_counter());
  ASSERT_TRUE(c != nullptr);
  EXPECT_EQ(c->next(), 1);
  EXPECT_EQ(c->next(), 2);
}
TEST(Counter, independent) {
  std::unique_ptr<Counter> a(make_counter()), b(make_counter());
  ASSERT_TRUE(a != nullptr && b != nullptr);
  a->next();
  EXPECT_EQ(b->next(), 1);
}
`;t.s(["default",0,function(){return(0,e.jsxs)("main",{className:"mx-auto w-full min-w-0 max-w-5xl space-y-3 p-4",children:[(0,e.jsx)("h1",{className:"text-xl font-bold",children:"/dev/editor"}),(0,e.jsx)(r.f,{id:"dev-editor-counter",provided:[{path:"api.h",content:n,readOnly:!0}],starter:[{path:"impl.cpp",content:a}],runExtras:[{path:"tests.cpp",content:i,readOnly:!0}],submitExtras:[{path:"tests.cpp",content:i,readOnly:!0}],judge:t=>(0,s.f)(t,3e3)})]})}])},811,t=>{function e(t){let e,r=[],s=null;for(let e of t.split(/\r?\n/)){let t;if(e.startsWith('{"t":"')){try{t=JSON.parse(e)}catch{continue}"begin"===t.t?s=t:"result"===t.t&&(r.push({suite:t.suite,name:t.name,status:t.status,ms:t.ms,failures:t.failures}),s=null)}}s&&(e=`${s.suite}.${s.name}`,r.push({suite:s.suite,name:s.name,status:"crash",ms:0,failures:[]}));let n=r.filter(t=>"pass"===t.status).length;return{tests:r,passed:n,failed:r.length-n,crashed:e}}let r="/blueprint-clash",s=null,n=null;async function a(i,o=1e4){var u,c,l;let p,m,h=await (u=await (n??=fetch(`${r}/clang/bp_test.h`).then(t=>{if(!t.ok)throw Error(`bp_test.h: HTTP ${t.status}`);return t.text()})),p=s??=t.r(29071)(Worker),new Promise((t,e)=>{p.onmessage=e=>t(e.data),p.onerror=t=>{s=null,e(Error(t.message||"compiler worker crashed"))},p.postMessage({base:location.origin+r,req:{files:i,header:u}})})),d=e("");if(!h.ok){if("fatal"in h)throw Error(`Toolchain failure: ${h.fatal}`);return{verdict:"compile_error",diagnostics:h.diagnostics,summary:d,stdout:"",timings:{compileMs:h.compileMs,runMs:0}}}let f=await (c=h.wasm,m=t.r(91026)(Worker),new Promise(t=>{let e=setTimeout(()=>(m.terminate(),t("timeout")),o);m.onmessage=r=>(clearTimeout(e),m.terminate(),t(r.data)),m.onerror=()=>(clearTimeout(e),m.terminate(),t({exitCode:null,stdout:"",stderr:"",runMs:0,trap:"worker error"})),m.postMessage(c,[c.buffer])})),_="timeout"===f,k=_?"":f.stdout,g=e(k),b=_?null:f.exitCode;return{verdict:(l={compileOk:!0,timedOut:_,exitCode:b,summary:g}).compileOk?l.timedOut?"time_limit":l.summary.crashed||0===l.summary.tests.length&&0!==l.exitCode?"runtime_error":0===l.summary.failed&&l.summary.tests.length>0?"accepted":"wrong_behaviour":"compile_error",diagnostics:h.diagnostics,summary:g,stdout:k,timings:{compileMs:h.compileMs,runMs:_?o:f.runMs}}}t.s(["f",0,a],811)},55954,t=>{let e=/^(?:[A-Za-z0-9_-]+\/)?[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_]+)?$/,r=/\.(cpp|cc|cxx)$/,s=/\.(h|hpp|hh)$/;t.s(["H",0,function(t){return t.filter(t=>{var e;return e=t.path,r.test(e)}).map(t=>t.path).sort()},"e",0,function(t){return t.includes("..")||t.startsWith("/")?"Paths cannot escape the project.":e.test(t)?r.test(t)||s.test(t)?null:"Only .h, .hpp, .cpp and .cc files are allowed.":"Use letters, digits, _ and - (one folder deep at most)."}])},10914,t=>{t.s(["f",0,function(e,r){return(s,n)=>(function(e,r,s,n){let a="SharedWorker"===e.name,i=t.b,o=[s.map(e=>t.h("string"==typeof e?e:e.path,i)).reverse(),t.X,i],u=["NEXT_DEPLOYMENT_ID","NEXT_CLIENT_ASSET_SUFFIX"];for(let t=0;t<u.length;t++)o.push(globalThis[u[t]]);let c=new URL(t.h(r,i),location.origin),l=JSON.stringify(o);return a?c.searchParams.set("params",l):c.hash="#params="+encodeURIComponent(l),new e(c,n?{...n,type:void 0}:void 0)})(s,e,r,n)}])}],96582,t=>{t.q("/blueprint-clash/_next/static/media/compile.worker.36hqb2--3a7c6.ts")},29071,t=>{t.v(t.r(10914).f("static/chunks/turbopack-worker-1hrsqshz0gfey.js",["static/chunks/2b8n9-xv-02c7.js","static/chunks/turbopack-1yrp0udhvt0sh.js","static/chunks/turbopack-1l1ijncxz8cv6.js"]))},10671,t=>{t.q("/blueprint-clash/_next/static/media/run.worker.3qivqaajtajcv.ts")},91026,t=>{t.v(t.r(10914).f("static/chunks/turbopack-worker-1hrsqshz0gfey.js",["static/chunks/1-kacuvrl7_28.js","static/chunks/turbopack-2qnfoi4tyurx1.js","static/chunks/turbopack-1l1ijncxz8cv6.js"]))}]);