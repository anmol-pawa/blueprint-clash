// ADR 0001 spike: compile + link a 3-file C++20 project with @yowasp/clang and run it under WASI.
// Not a project dependency yet. Run: npm i --no-save @yowasp/clang && node scripts/toolchain-spike.mjs
import { runClang } from '@yowasp/clang';
import { WASI } from 'node:wasi';
const files = {
 'shape.h': `#pragma once\n#include <memory>\n#include <vector>\nstruct Shape { virtual ~Shape()=default; virtual double area() const=0; };\nstruct Sq : Shape { double s; explicit Sq(double s):s(s){} double area() const override {return s*s;} };\nstd::vector<std::unique_ptr<Shape>> make();\n`,
 'shape.cpp': `#include "shape.h"\nstd::vector<std::unique_ptr<Shape>> make(){ std::vector<std::unique_ptr<Shape>> v; v.push_back(std::make_unique<Sq>(3)); return v; }\n`,
 'tests.cpp': `#include "shape.h"\n#include <iostream>\n#include <map>\n#include <string>\n#include <algorithm>\nint main(){ auto v=make(); std::map<std::string,int> m; m["a"]=1; std::cout<<"{\\"area\\":"<<v[0]->area()<<"}\\n"; long long s=0; for(long long i=0;i<200000000;i++) s+=i%7; std::cout<<s<<"\\n"; }\n`,
};
async function once(label, flags) {
  const t0 = performance.now(); let err='';
  const out = await runClang(['clang++','-std=c++20',...flags,'--target=wasm32-wasip1','-fno-exceptions','shape.cpp','tests.cpp','-o','a.out'], files, {stderr: b=>{ if(b) err+=new TextDecoder().decode(b)}});
  const t1 = performance.now();
  const wasi = new WASI({version:'preview1', returnOnExit:true});
  const inst = await WebAssembly.instantiate(await WebAssembly.compile(out['a.out']),{wasi_snapshot_preview1:wasi.wasiImport});
  const t2=performance.now(); const code = wasi.start(inst);
  console.log(label,'compile+link ms',Math.round(t1-t0),'wasm KB',Math.round(out['a.out'].length/1024),'run ms',Math.round(performance.now()-t2),'exit',code, err.slice(0,200));
}
await once('cold -O1',['-O1']); await once('warm -O1',['-O1']); await once('warm -O0',['-O0']); await once('warm -O2',['-O2']);
