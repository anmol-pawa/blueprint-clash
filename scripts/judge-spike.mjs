// ADR 0001 spike: compile a multi-file project with @yowasp/clang and run it under WASI (Node).
// Usage: node scripts/judge-spike.mjs   (first run decompresses ~100 MB of toolchain; expect ~7 s)
import { runClang } from '@yowasp/clang';
import { WASI } from 'node:wasi';
import fs from 'node:fs';
const hdr = fs.readFileSync(new URL('../lib/judge/cpp/bp_test.h', import.meta.url),'utf8');
const files = { 'bp_test.h': hdr, 'lib.h':'#pragma once\nint twice(int);\n','lib.cpp':'#include "lib.h"\nint twice(int x){return 2*x;}\n',
 'main.cpp':'#define BP_TEST_MAIN\n#include "bp_test.h"\n#include "lib.h"\nTEST(Basic,Twice){ EXPECT_EQ(twice(2),4); }\nTEST(Basic,Bad){ EXPECT_EQ(twice(2),5); ASSERT_EQ(1,2); EXPECT_EQ(9,9);}\n'};
const t=performance.now();
const out = await runClang(['clang++','-std=c++20','-O1','-fno-exceptions','main.cpp','lib.cpp','-o','a.wasm'], files, {stderr:d=>{if(d)process.stderr.write(d)}});
console.log('compile ms',Math.round(performance.now()-t), out['a.wasm'].length);
const mod = await WebAssembly.compile(out['a.wasm']);
async function exec(args){
  const w = new WASI({version:'preview1', args:['a.wasm',...args], returnOnExit:true, stdout: fs.openSync('/tmp/bp-spike-out.txt','w')});
  const inst = await WebAssembly.instantiate(mod,{wasi_snapshot_preview1:w.wasiImport});
  const code = w.start(inst); return {code, out: fs.readFileSync('/tmp/bp-spike-out.txt','utf8')};
}
for (const a of [['--list'],['=Basic.Twice'],['=Basic.Bad'],[]]) { const t=performance.now(); const r=await exec(a); console.log(a.join(' ')||'(all)', 'exit',r.code, Math.round(performance.now()-t)+'ms\n'+r.out); }
