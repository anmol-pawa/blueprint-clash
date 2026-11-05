(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,54126,t=>{var e=t.i(81107),r=t.i(27076),i=t.i(65654),a=t.i(22558);let n=class t extends i.f{constructor(e){super(e={...t.defaultOptions,...e}),this.enabled=!0,this._state=a.A.for2d(),this.blendMode=e.blendMode,this.padding=e.padding,"boolean"==typeof e.antialias?this.antialias=e.antialias?"on":"off":this.antialias=e.antialias,this.resolution=e.resolution,this.blendRequired=e.blendRequired,this.clipToViewport=e.clipToViewport,this.addResource("uTexture",0,1),e.blendRequired&&this.addResource("uBackTexture",0,3)}apply(t,e,r,i){t.applyFilter(this,e,r,i)}get blendMode(){return this._state.blendMode}set blendMode(t){this._state.blendMode=t}static from(i){let a,n,{gpu:s,gl:o,...u}=i;return s&&(a=r.f.from(s)),o&&(n=e.f.from(o)),new t({gpuProgram:a,glProgram:n,...u})}};n.defaultOptions={blendMode:"normal",resolution:1,padding:0,antialias:"off",blendRequired:!1,clipToViewport:!0},t.s(["f",0,n])},68750,t=>{var e=t.i(94359),r=t.i(31320);let i={};t.s(["f",0,function(t,a,n){let s=0x811c9dc5;for(let e=0;e<a;e++)s^=t[e].uid,s=Math.imul(s,0x1000193)>>>0;return i[s]||function(t,a,n,s){let o={},u=0;for(let e=0;e<s;e++){let i=e<a?t[e]:r.f.EMPTY.source;o[u++]=i.source,o[u++]=i.style}let f=new e.f(o);return i[n]=f,f}(t,a,s,n)}])},87323,18102,96108,28028,45284,t=>{var e,r=t.i(24314);class i{constructor(t){"number"==typeof t?this.rawBinaryData=new ArrayBuffer(t):t instanceof Uint8Array?this.rawBinaryData=t.buffer:this.rawBinaryData=t,this.uint32View=new Uint32Array(this.rawBinaryData),this.float32View=new Float32Array(this.rawBinaryData),this.size=this.rawBinaryData.byteLength}get int8View(){return this._int8View||(this._int8View=new Int8Array(this.rawBinaryData)),this._int8View}get uint8View(){return this._uint8View||(this._uint8View=new Uint8Array(this.rawBinaryData)),this._uint8View}get int16View(){return this._int16View||(this._int16View=new Int16Array(this.rawBinaryData)),this._int16View}get int32View(){return this._int32View||(this._int32View=new Int32Array(this.rawBinaryData)),this._int32View}get float64View(){return this._float64Array||(this._float64Array=new Float64Array(this.rawBinaryData)),this._float64Array}get bigUint64View(){return this._bigUint64Array||(this._bigUint64Array=new BigUint64Array(this.rawBinaryData)),this._bigUint64Array}view(t){return this[`${t}View`]}destroy(){this.rawBinaryData=null,this.uint32View=null,this.float32View=null,this.uint16View=null,this._int8View=null,this._uint8View=null,this._int16View=null,this._int32View=null,this._float64Array=null,this._bigUint64Array=null}static sizeOf(t){switch(t){case"int8":case"uint8":return 1;case"int16":case"uint16":return 2;case"int32":case"uint32":case"float32":return 4;default:throw Error(`${t} isn't a valid view type`)}}}var a=t.i(49864),n=t.i(48446);function s(t,e,r,i){if(r??(r=0),i??(i=Math.min(t.byteLength-r,e.byteLength)),7&r||7&i)if(3&r||3&i)new Uint8Array(e).set(new Uint8Array(t,r,i));else{let a=i/4;new Float32Array(e,0,a).set(new Float32Array(t,r,a))}else{let a=i/8;new Float64Array(e,0,a).set(new Float64Array(t,r,a))}}t.s(["f",0,s],18102);let o={normal:"normal-npm",add:"add-npm",screen:"screen-npm"};var u=((e=u||{})[e.DISABLED=0]="DISABLED",e[e.RENDERING_MASK_ADD=1]="RENDERING_MASK_ADD",e[e.MASK_ACTIVE=2]="MASK_ACTIVE",e[e.INVERSE_MASK_ACTIVE=3]="INVERSE_MASK_ACTIVE",e[e.RENDERING_MASK_REMOVE=4]="RENDERING_MASK_REMOVE",e[e.NONE=5]="NONE",e);function f(t,e){return"no-premultiply-alpha"===e.alphaMode&&o[t]||t}t.s(["q",0,o,"U",0,u],96108);var l=t.i(29281);function d(t,e){if(0===t)throw Error("Invalid value of `0` passed to `checkMaxIfStatementsInShader`");let r=e.createShader(e.FRAGMENT_SHADER);try{for(;;){let i="precision mediump float;\nvoid main(void){\nfloat test = 0.1;\n%forloop%\ngl_FragColor = vec4(0.0);\n}".replace(/%forloop%/gi,function(t){let e="";for(let r=0;r<t;++r)r>0&&(e+="\nelse "),r<t-1&&(e+=`if(test == ${r}.0){}`);return e}(t));if(e.shaderSource(r,i),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS))break;t=t/2|0}}finally{e.deleteShader(r)}return t}t.s(["f",0,d],28028);let h=null;class c{constructor(){this.ids=Object.create(null),this.textures=[],this.count=0}clear(){for(let t=0;t<this.count;t++){let e=this.textures[t];this.textures[t]=null,this.ids[e.uid]=null}this.count=0}}class v{constructor(){this.renderPipeId="batch",this.action="startBatch",this.start=0,this.size=0,this.textures=new c,this.blendMode="normal",this.topology="triangle-strip",this.canBundle=!0}destroy(){this.textures=null,this.gpuBindGroup=null,this.bindGroup=null,this.batcher=null,this.elements=null}}let m=[],x=0;function p(){return x>0?m[--x]:new v}function b(t){t.elements=null,m[x++]=t}n.f.register({clear:()=>{if(m.length>0)for(let t of m)t&&t.destroy();m.length=0,x=0}});let _=0,g=class t{constructor(e){this.uid=(0,r.f)("batcher"),this.dirty=!0,this.batchIndex=0,this.batches=[],this._elements=[],(e={...t.defaultOptions,...e}).maxTextures||((0,a.K)("v8.8.0","maxTextures is a required option for Batcher now, please pass it in the options"),e.maxTextures=function(){if(h)return h;let t=(0,l.f)();return h=d(h=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),t),t.getExtension("WEBGL_lose_context")?.loseContext(),h}());let{maxTextures:n,attributesInitialSize:s,indicesInitialSize:o}=e;this.attributeBuffer=new i(4*s),this.indexBuffer=new Uint16Array(o),this.maxTextures=n}begin(){this.elementSize=0,this.elementStart=0,this.indexSize=0,this.attributeSize=0;for(let t=0;t<this.batchIndex;t++)b(this.batches[t]);this.batchIndex=0,this._batchIndexStart=0,this._batchIndexSize=0,this.dirty=!0}add(t){this._elements[this.elementSize++]=t,t._indexStart=this.indexSize,t._attributeStart=this.attributeSize,t._batcher=this,this.indexSize+=t.indexSize,this.attributeSize+=t.attributeSize*this.vertexSize}checkAndUpdateTexture(t,e){let r=t._batch.textures.ids[e._source.uid];return(!!r||0===r)&&(t._textureId=r,t.texture=e,!0)}updateElement(t){this.dirty=!0;let e=this.attributeBuffer;t.packAsQuad?this.packQuadAttributes(t,e.float32View,e.uint32View,t._attributeStart,t._textureId):this.packAttributes(t,e.float32View,e.uint32View,t._attributeStart,t._textureId)}break(t){let e=this._elements;if(!e[this.elementStart])return;let r=p(),i=r.textures;i.clear();let a=e[this.elementStart],n=f(a.blendMode,a.texture._source),s=a.topology;4*this.attributeSize>this.attributeBuffer.size&&this._resizeAttributeBuffer(4*this.attributeSize),this.indexSize>this.indexBuffer.length&&this._resizeIndexBuffer(this.indexSize);let o=this.attributeBuffer.float32View,u=this.attributeBuffer.uint32View,l=this.indexBuffer,d=this._batchIndexSize,h=this._batchIndexStart,c="startBatch",v=[],m=this.maxTextures;for(let a=this.elementStart;a<this.elementSize;++a){let x=e[a];e[a]=null;let b=x.texture._source,g=f(x.blendMode,b),y=n!==g||s!==x.topology;if(b._batchTick===_&&!y){x._textureId=b._textureBindLocation,d+=x.indexSize,x.packAsQuad?(this.packQuadAttributes(x,o,u,x._attributeStart,x._textureId),this.packQuadIndex(l,x._indexStart,x._attributeStart/this.vertexSize)):(this.packAttributes(x,o,u,x._attributeStart,x._textureId),this.packIndex(x,l,x._indexStart,x._attributeStart/this.vertexSize)),x._batch=r,v.push(x);continue}b._batchTick=_,(i.count>=m||y)&&(this._finishBatch(r,h,d-h,i,n,s,t,c,v),c="renderBatch",h=d,n=g,s=x.topology,(i=(r=p()).textures).clear(),v=[],++_),x._textureId=b._textureBindLocation=i.count,i.ids[b.uid]=i.count,i.textures[i.count++]=b,x._batch=r,v.push(x),d+=x.indexSize,x.packAsQuad?(this.packQuadAttributes(x,o,u,x._attributeStart,x._textureId),this.packQuadIndex(l,x._indexStart,x._attributeStart/this.vertexSize)):(this.packAttributes(x,o,u,x._attributeStart,x._textureId),this.packIndex(x,l,x._indexStart,x._attributeStart/this.vertexSize))}i.count>0&&(this._finishBatch(r,h,d-h,i,n,s,t,c,v),h=d,++_),this.elementStart=this.elementSize,this._batchIndexStart=h,this._batchIndexSize=d}_finishBatch(t,e,r,i,a,n,s,o,u){t.gpuBindGroup=null,t.bindGroup=null,t.action=o,t.batcher=this,t.textures=i,t.blendMode=a,t.topology=n,t.start=e,t.size=r,t.elements=u,++_,this.batches[this.batchIndex++]=t,s.add(t)}finish(t){this.break(t)}ensureAttributeBuffer(t){4*t<=this.attributeBuffer.size||this._resizeAttributeBuffer(4*t)}ensureIndexBuffer(t){t<=this.indexBuffer.length||this._resizeIndexBuffer(t)}_resizeAttributeBuffer(t){let e=new i(Math.max(t,2*this.attributeBuffer.size));s(this.attributeBuffer.rawBinaryData,e.rawBinaryData),this.attributeBuffer=e}_resizeIndexBuffer(t){let e=this.indexBuffer,r=Math.max(t,1.5*e.length);r+=r%2;let i=r>65535?new Uint32Array(r):new Uint16Array(r);if(i.BYTES_PER_ELEMENT!==e.BYTES_PER_ELEMENT)for(let t=0;t<e.length;t++)i[t]=e[t];else s(e.buffer,i.buffer);this.indexBuffer=i}packQuadIndex(t,e,r){t[e]=r+0,t[e+1]=r+1,t[e+2]=r+2,t[e+3]=r+0,t[e+4]=r+2,t[e+5]=r+3}packIndex(t,e,r,i){let a=t.indices,n=t.indexSize,s=t.indexOffset,o=t.attributeOffset;for(let t=0;t<n;t++)e[r++]=i+a[t+s]-o}destroy(t={}){if(null!==this.batches){for(let t=0;t<this.batchIndex;t++)b(this.batches[t]);this.batches=null,this.geometry.destroy(!0),this.geometry=null,t.shader&&(this.shader?.destroy(),this.shader=null);for(let t=0;t<this._elements.length;t++)this._elements[t]&&(this._elements[t]._batch=null);this._elements=null,this.indexBuffer=null,this.attributeBuffer.destroy(),this.attributeBuffer=null}}};g.defaultOptions={maxTextures:null,attributesInitialSize:4,indicesInitialSize:6},t.s(["f",0,g],87323);var y=t.i(85465),S=t.i(64957),w=t.i(60406);let I=new Float32Array(1),A=new Uint32Array(1);class T extends w.f{constructor(){let t=new y.f({data:I,label:"attribute-batch-buffer",usage:S.f.VERTEX|S.f.COPY_DST,shrinkToFit:!1});super({attributes:{aPosition:{buffer:t,format:"float32x2",stride:24,offset:0},aUV:{buffer:t,format:"float32x2",stride:24,offset:8},aColor:{buffer:t,format:"unorm8x4",stride:24,offset:16},aTextureIdAndRound:{buffer:t,format:"uint16x2",stride:24,offset:20}},indexBuffer:new y.f({data:A,label:"index-batch-buffer",usage:S.f.INDEX|S.f.COPY_DST,shrinkToFit:!1})})}}t.s(["f",0,T],45284)},97828,t=>{var e=t.i(47760),r=t.i(87323),i=t.i(45284),a=t.i(81491),n=t.i(68372),s=t.i(94111),o=t.i(55443),u=t.i(77953),f=t.i(65654);class l extends f.f{constructor(t){super({glProgram:(0,a.L)({name:"batch",bits:[n.z,(0,s.k)(t),o.a]}),gpuProgram:(0,a.M)({name:"batch",bits:[n.O,(0,s.u)(t),o.Z]}),resources:{batchSamplers:(0,u.f)(t)}}),this.maxTextures=t}}let d=null,h=class t extends r.f{constructor(e){super(e),this.geometry=new i.f,this.name=t.extension.name,this.vertexSize=6,d??(d=new l(e.maxTextures)),this.shader=d}packAttributes(t,e,r,i,a){let n=a<<16|65535&t.roundPixels,s=t.transform,o=s.a,u=s.b,f=s.c,l=s.d,d=s.tx,h=s.ty,{positions:c,uvs:v}=t,m=t.color,x=t.attributeOffset,p=x+t.attributeSize;for(let t=x;t<p;t++){let a=2*t,s=c[a],x=c[a+1];e[i++]=o*s+f*x+d,e[i++]=l*x+u*s+h,e[i++]=v[a],e[i++]=v[a+1],r[i++]=m,r[i++]=n}}packQuadAttributes(t,e,r,i,a){let n=t.texture,s=t.transform,o=s.a,u=s.b,f=s.c,l=s.d,d=s.tx,h=s.ty,c=t.bounds,v=c.maxX,m=c.minX,x=c.maxY,p=c.minY,b=n.uvs,_=t.color,g=a<<16|65535&t.roundPixels;e[i+0]=o*m+f*p+d,e[i+1]=l*p+u*m+h,e[i+2]=b.x0,e[i+3]=b.y0,r[i+4]=_,r[i+5]=g,e[i+6]=o*v+f*p+d,e[i+7]=l*p+u*v+h,e[i+8]=b.x1,e[i+9]=b.y1,r[i+10]=_,r[i+11]=g,e[i+12]=o*v+f*x+d,e[i+13]=l*x+u*v+h,e[i+14]=b.x2,e[i+15]=b.y2,r[i+16]=_,r[i+17]=g,e[i+18]=o*m+f*x+d,e[i+19]=l*x+u*m+h,e[i+20]=b.x3,e[i+21]=b.y3,r[i+22]=_,r[i+23]=g}_updateMaxTextures(t){this.shader.maxTextures!==t&&(d=new l(t),this.shader=d)}destroy(){this.shader=null,super.destroy()}};h.extension={type:[e.x.Batcher],name:"default"},t.s(["f",0,h],97828)},81491,68372,94111,55443,t=>{var e=t.i(81107),r=t.i(27076),i=t.i(85830);function a(t,e,r){if(t)for(let a in t){let n=e[a.toLocaleLowerCase()];if(n){let e=t[a];"header"===a&&(e=e.replace(/@in\s+[^;]+;\s*/g,"").replace(/@out\s+[^;]+;\s*/g,"")),r&&n.push(`//----${r}----//`),n.push(e)}else(0,i.f)(`${a} placement hook does not exist in shader`)}}let n=/\{\{(.*?)\}\}/g;function s(t){let e={};return(t.match(n)?.map(t=>t.replace(/[{()}]/g,""))??[]).forEach(t=>{e[t]=[]}),e}function o(t,e){let r,i=/@in\s+([^;]+);/g;for(;null!==(r=i.exec(t));)e.push(r[1])}function u(t,e,r=!1){let i=[];o(e,i),t.forEach(t=>{t.header&&o(t.header,i)}),r&&i.sort();let a=i.map((t,e)=>`       @location(${e}) ${t},`).join("\n"),n=e.replace(/@in\s+[^;]+;\s*/g,"");return n.replace("{{in}}",`
${a}
`)}function f(t,e){let r,i=/@out\s+([^;]+);/g;for(;null!==(r=i.exec(t));)e.push(r[1])}function l(t,e){let r=t;for(let t in e){let i=e[t];r=i.join("\n").length?r.replace(`{{${t}}}`,`//-----${t} START-----//
${i.join("\n")}
//----${t} FINISH----//`):r.replace(`{{${t}}}`,"")}return r}let d=Object.create(null),h=new Map,c=0;function v(t,e){return e.map(t=>(h.has(t)||h.set(t,c++),h.get(t))).sort((t,e)=>t-e).join("-")+t.vertex+t.fragment}function m(t,e,r){let i=s(t),n=s(e);return r.forEach(t=>{a(t.vertex,i,t.name),a(t.fragment,n,t.name)}),{vertex:l(t,i),fragment:l(e,n)}}let x=`
    @in aPosition: vec2<f32>;
    @in aUV: vec2<f32>;

    @out @builtin(position) vPosition: vec4<f32>;
    @out vUV : vec2<f32>;
    @out vColor : vec4<f32>;

    {{header}}

    struct VSOutput {
        {{struct}}
    };

    @vertex
    fn main( {{in}} ) -> VSOutput {

        var worldTransformMatrix = globalUniforms.uWorldTransformMatrix;
        var modelMatrix = mat3x3<f32>(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        var position = aPosition;
        var uv = aUV;

        {{start}}

        vColor = vec4<f32>(1., 1., 1., 1.);

        {{main}}

        vUV = uv;

        var modelViewProjectionMatrix = globalUniforms.uProjectionMatrix * worldTransformMatrix * modelMatrix;

        vPosition =  vec4<f32>((modelViewProjectionMatrix *  vec3<f32>(position, 1.0)).xy, 0.0, 1.0);

        vColor *= globalUniforms.uWorldColorAlpha;

        {{end}}

        {{return}}
    };
`,p=`
    @in vUV : vec2<f32>;
    @in vColor : vec4<f32>;

    {{header}}

    @fragment
    fn main(
        {{in}}
      ) -> @location(0) vec4<f32> {

        {{start}}

        var outColor:vec4<f32>;

        {{main}}

        var finalColor:vec4<f32> = outColor * vColor;

        {{end}}

        return finalColor;
      };
`,b=`
    in vec2 aPosition;
    in vec2 aUV;

    out vec4 vColor;
    out vec2 vUV;

    {{header}}

    void main(void){

        mat3 worldTransformMatrix = uWorldTransformMatrix;
        mat3 modelMatrix = mat3(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        vec2 position = aPosition;
        vec2 uv = aUV;

        {{start}}

        vColor = vec4(1.);

        {{main}}

        vUV = uv;

        mat3 modelViewProjectionMatrix = uProjectionMatrix * worldTransformMatrix * modelMatrix;

        gl_Position = vec4((modelViewProjectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);

        vColor *= uWorldColorAlpha;

        {{end}}
    }
`,_=`

    in vec4 vColor;
    in vec2 vUV;

    out vec4 finalColor;

    {{header}}

    void main(void) {

        {{start}}

        vec4 outColor;

        {{main}}

        finalColor = outColor * vColor;

        {{end}}
    }
`,g={name:"global-uniforms-bit",vertex:{header:`
        struct GlobalUniforms {
            uProjectionMatrix:mat3x3<f32>,
            uWorldTransformMatrix:mat3x3<f32>,
            uWorldColorAlpha: vec4<f32>,
            uResolution: vec2<f32>,
        }

        @group(0) @binding(0) var<uniform> globalUniforms : GlobalUniforms;
        `}},y={name:"global-uniforms-bit",vertex:{header:`
          uniform mat3 uProjectionMatrix;
          uniform mat3 uWorldTransformMatrix;
          uniform vec4 uWorldColorAlpha;
          uniform vec2 uResolution;
        `}};t.s(["L",0,function({bits:t,name:r}){return new e.f({name:r,...function({template:t,bits:e}){let r=v(t,e);return d[r]||(d[r]=m(t.vertex,t.fragment,e)),d[r]}({template:{vertex:b,fragment:_},bits:[y,...t]})})},"M",0,function({bits:t,name:e}){let i=function({template:t,bits:e}){let r=v(t,e);if(d[r])return d[r];let{vertex:i,fragment:a}=function(t,e){var r;let i,a,n,s,o,l=e.map(t=>t.vertex).filter(t=>!!t),d=e.map(t=>t.fragment).filter(t=>!!t),h=u(l,t.vertex,!0);return i=[],f(r=h,i),l.forEach(t=>{t.header&&f(t.header,i)}),a=0,n=i.sort().map(t=>t.indexOf("builtin")>-1?t:`@location(${a++}) ${t}`).join(",\n"),s=i.sort().map(t=>`       var ${t.replace(/@.*?\s+/g,"")};`).join("\n"),o=`return VSOutput(
            ${i.sort().map(t=>{let e;return` ${(e=/\b(\w+)\s*:/g.exec(t))?e[1]:""}`}).join(",\n")});`,{vertex:h=r.replace(/@out\s+[^;]+;\s*/g,"").replace("{{struct}}",`
${n}
`).replace("{{start}}",`
${s}
`).replace("{{return}}",`
${o}
`),fragment:u(d,t.fragment,!0)}}(t,e);return d[r]=m(i,a,e),d[r]}({template:{fragment:p,vertex:x},bits:[g,...t]});return r.f.from({name:e,vertex:{source:i.vertex,entryPoint:"main"},fragment:{source:i.fragment,entryPoint:"main"}})}],81491);let S={name:"color-bit",vertex:{header:`
            @in aColor: vec4<f32>;
        `,main:`
            vColor *= vec4<f32>(aColor.rgb * aColor.a, aColor.a);
        `}},w={name:"color-bit",vertex:{header:`
            in vec4 aColor;
        `,main:`
            vColor *= vec4(aColor.rgb * aColor.a, aColor.a);
        `}};t.s(["O",0,S,"z",0,w],68372);let I={},A={};t.s(["u",0,function(t){return I[t]||(I[t]={name:"texture-batch-bit",vertex:{header:`
                @in aTextureIdAndRound: vec2<u32>;
                @out @interpolate(flat) vTextureId : u32;
            `,main:`
                vTextureId = aTextureIdAndRound.y;
            `,end:`
                if(aTextureIdAndRound.x == 1)
                {
                    vPosition = vec4<f32>(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
                }
            `},fragment:{header:`
                @in @interpolate(flat) vTextureId: u32;

                ${function(t){let e=[];if(1===t)e.push("@group(1) @binding(0) var textureSource1: texture_2d<f32>;"),e.push("@group(1) @binding(1) var textureSampler1: sampler;");else{let r=0;for(let i=0;i<t;i++)e.push(`@group(1) @binding(${r++}) var textureSource${i+1}: texture_2d<f32>;`),e.push(`@group(1) @binding(${r++}) var textureSampler${i+1}: sampler;`)}return e.join("\n")}(t)}
            `,main:`
                var uvDx = dpdx(vUV);
                var uvDy = dpdy(vUV);

                ${function(t){let e=[];if(1===t)e.push("outColor = textureSampleGrad(textureSource1, textureSampler1, vUV, uvDx, uvDy);");else{e.push("switch vTextureId {");for(let r=0;r<t;r++)r===t-1?e.push("  default:{"):e.push(`  case ${r}:{`),e.push(`      outColor = textureSampleGrad(textureSource${r+1}, textureSampler${r+1}, vUV, uvDx, uvDy);`),e.push("      break;}");e.push("}")}return e.join("\n")}(t)}
            `}}),I[t]},"k",0,function(t){return A[t]||(A[t]={name:"texture-batch-bit",vertex:{header:`
                in vec2 aTextureIdAndRound;
                out float vTextureId;

            `,main:`
                vTextureId = aTextureIdAndRound.y;
            `,end:`
                if(aTextureIdAndRound.x == 1.)
                {
                    gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
                }
            `},fragment:{header:`
                in float vTextureId;

                uniform sampler2D uTextures[${t}];

            `,main:`

                ${function(t){let e=[];for(let r=0;r<t;r++)r>0&&e.push("else"),r<t-1&&e.push(`if(vTextureId < ${r}.5)`),e.push("{"),e.push(`	outColor = texture(uTextures[${r}], vUV);`),e.push("}");return e.join("\n")}(t)}
            `}}),A[t]}],94111);let T={name:"round-pixels-bit",vertex:{header:`
            fn roundPixels(position: vec2<f32>, targetSize: vec2<f32>) -> vec2<f32>
            {
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        `}},U={name:"round-pixels-bit",vertex:{header:`
            vec2 roundPixels(vec2 position, vec2 targetSize)
            {
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        `}};t.s(["Z",0,T,"a",0,U],55443)},35066,90532,t=>{let e={name:"local-uniform-bit",vertex:{header:`

            struct LocalUniforms {
                uTransformMatrix:mat3x3<f32>,
                uColor:vec4<f32>,
                uRound:f32,
            }

            @group(1) @binding(0) var<uniform> localUniforms : LocalUniforms;
        `,main:`
            vColor *= localUniforms.uColor;
            modelMatrix *= localUniforms.uTransformMatrix;
        `,end:`
            if(localUniforms.uRound == 1)
            {
                vPosition = vec4(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
            }
        `}},r={...e,vertex:{...e.vertex,header:e.vertex.header.replace("group(1)","group(2)")}},i={name:"local-uniform-bit",vertex:{header:`

            uniform mat3 uTransformMatrix;
            uniform vec4 uColor;
            uniform float uRound;
        `,main:`
            vColor *= uColor;
            modelMatrix = uTransformMatrix;
        `,end:`
            if(uRound == 1.)
            {
                gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
            }
        `}};t.s(["q",0,e,"Y",0,i,"M",0,r],35066);let a={name:"texture-bit",vertex:{header:`

        struct TextureUniforms {
            uTextureMatrix:mat3x3<f32>,
        }

        @group(2) @binding(2) var<uniform> textureUniforms : TextureUniforms;
        `,main:`
            uv = (textureUniforms.uTextureMatrix * vec3(uv, 1.0)).xy;
        `},fragment:{header:`
            @group(2) @binding(0) var uTexture: texture_2d<f32>;
            @group(2) @binding(1) var uSampler: sampler;


        `,main:`
            outColor = textureSample(uTexture, uSampler, vUV);
        `}},n={name:"texture-bit",vertex:{header:`
            uniform mat3 uTextureMatrix;
        `,main:`
            uv = (uTextureMatrix * vec3(uv, 1.0)).xy;
        `},fragment:{header:`
        uniform sampler2D uTexture;


        `,main:`
            outColor = texture(uTexture, vUV);
        `}};t.s(["S",0,a,"X",0,n],90532)},77953,t=>{var e=t.i(32543);let r={};t.s(["f",0,function(t){let i=r[t];if(i)return i;let a=new Int32Array(t);for(let e=0;e<t;e++)a[e]=e;return r[t]=new e.f({uTextures:{value:a,type:"i32",size:t}},{isStatic:!0})}])},35656,39391,t=>{var e=t.i(85830),r=t.i(46820);t.s(["f",0,function(t,i){for(let r in t.attributes){let a=t.attributes[r],n=i[r];n?(a.format??(a.format=n.format),a.offset??(a.offset=n.offset),a.instance??(a.instance=n.instance)):a.format||(0,e.f)(`Attribute ${r} is not present in the shader, but is present in the geometry. Unable to infer attribute details.`)}!function(t){let{buffers:e,attributes:i}=t,a={},n={};for(let t in e){let r=e[t];a[r.uid]=0,n[r.uid]=0}for(let t in i){let e=i[t];a[e.buffer.uid]+=(0,r.f)(e.format).stride}for(let t in i){let e=i[t];e.stride??(e.stride=a[e.buffer.uid]),e.start??(e.start=n[e.buffer.uid]),n[e.buffer.uid]+=(0,r.f)(e.format).stride}}(t)}],35656);var i=t.i(96108);let a=[];a[i.U.NONE]=void 0,a[i.U.DISABLED]={stencilWriteMask:0,stencilReadMask:0},a[i.U.RENDERING_MASK_ADD]={stencilFront:{compare:"equal",passOp:"increment-clamp"},stencilBack:{compare:"equal",passOp:"increment-clamp"}},a[i.U.RENDERING_MASK_REMOVE]={stencilFront:{compare:"equal",passOp:"decrement-clamp"},stencilBack:{compare:"equal",passOp:"decrement-clamp"}},a[i.U.MASK_ACTIVE]={stencilWriteMask:0,stencilFront:{compare:"equal",passOp:"keep"},stencilBack:{compare:"equal",passOp:"keep"}},a[i.U.INVERSE_MASK_ACTIVE]={stencilWriteMask:0,stencilFront:{compare:"not-equal",passOp:"keep"},stencilBack:{compare:"not-equal",passOp:"keep"}},t.s(["f",0,a],39391)},28353,92715,62039,33156,87784,t=>{var e=t.i(55364),r=t.i(85465),i=t.i(64957);t.s(["f",0,class{constructor(t){this._syncFunctionHash=Object.create(null),this._adaptor=t,this._systemCheck()}_systemCheck(){if(!(0,e.f)())throw Error("Current environment does not allow unsafe-eval, please use pixi.js/unsafe-eval module to enable support.")}ensureUniformGroup(t){let e=this.getUniformGroupData(t);t.buffer||(t.buffer=new r.f({data:new Float32Array(e.layout.size/4),usage:i.f.UNIFORM|i.f.COPY_DST}))}getUniformGroupData(t){return this._syncFunctionHash[t._signature]||this._initUniformGroup(t)}_initUniformGroup(t){let e=t._signature,r=this._syncFunctionHash[e];if(!r){let i=Object.keys(t.uniformStructures).map(e=>t.uniformStructures[e]),a=this._adaptor.createUboElements(i),n=this._generateUboSync(a.uboElements);r=this._syncFunctionHash[e]={layout:a,syncFunction:n}}return this._syncFunctionHash[e]}_generateUboSync(t){return this._adaptor.generateUboSync(t)}syncUniformGroup(t,e,a){let n=this.getUniformGroupData(t);t.buffer||(t.buffer=new r.f({data:new Float32Array(n.layout.size/4),usage:i.f.UNIFORM|i.f.COPY_DST}));let s=null;return e||(e=t.buffer.data,s=t.buffer.dataInt32),a||(a=0),n.syncFunction(t.uniforms,e,s,a),!0}updateUniformGroup(t){if(t.isStatic&&!t._dirtyId)return!1;t._dirtyId=0;let e=this.syncUniformGroup(t);return t.buffer.update(),e}destroy(){this._syncFunctionHash=null}}],28353);let a=[{type:"mat3x3<f32>",test:t=>void 0!==t.value.a,ubo:`
            var matrix = uv[name].toArray(true);
            data[offset] = matrix[0];
            data[offset + 1] = matrix[1];
            data[offset + 2] = matrix[2];
            data[offset + 4] = matrix[3];
            data[offset + 5] = matrix[4];
            data[offset + 6] = matrix[5];
            data[offset + 8] = matrix[6];
            data[offset + 9] = matrix[7];
            data[offset + 10] = matrix[8];
        `,uniform:`
            gl.uniformMatrix3fv(ud[name].location, false, uv[name].toArray(true));
        `},{type:"vec4<f32>",test:t=>"vec4<f32>"===t.type&&1===t.size&&void 0!==t.value.width,ubo:`
            v = uv[name];
            data[offset] = v.x;
            data[offset + 1] = v.y;
            data[offset + 2] = v.width;
            data[offset + 3] = v.height;
        `,uniform:`
            cv = ud[name].value;
            v = uv[name];
            if (cv[0] !== v.x || cv[1] !== v.y || cv[2] !== v.width || cv[3] !== v.height) {
                cv[0] = v.x;
                cv[1] = v.y;
                cv[2] = v.width;
                cv[3] = v.height;
                gl.uniform4f(ud[name].location, v.x, v.y, v.width, v.height);
            }
        `},{type:"vec2<f32>",test:t=>"vec2<f32>"===t.type&&1===t.size&&void 0!==t.value.x,ubo:`
            v = uv[name];
            data[offset] = v.x;
            data[offset + 1] = v.y;
        `,uniform:`
            cv = ud[name].value;
            v = uv[name];
            if (cv[0] !== v.x || cv[1] !== v.y) {
                cv[0] = v.x;
                cv[1] = v.y;
                gl.uniform2f(ud[name].location, v.x, v.y);
            }
        `},{type:"vec4<f32>",test:t=>"vec4<f32>"===t.type&&1===t.size&&void 0!==t.value.red,ubo:`
            v = uv[name];
            data[offset] = v.red;
            data[offset + 1] = v.green;
            data[offset + 2] = v.blue;
            data[offset + 3] = v.alpha;
        `,uniform:`
            cv = ud[name].value;
            v = uv[name];
            if (cv[0] !== v.red || cv[1] !== v.green || cv[2] !== v.blue || cv[3] !== v.alpha) {
                cv[0] = v.red;
                cv[1] = v.green;
                cv[2] = v.blue;
                cv[3] = v.alpha;
                gl.uniform4f(ud[name].location, v.red, v.green, v.blue, v.alpha);
            }
        `},{type:"vec3<f32>",test:t=>"vec3<f32>"===t.type&&1===t.size&&void 0!==t.value.red,ubo:`
            v = uv[name];
            data[offset] = v.red;
            data[offset + 1] = v.green;
            data[offset + 2] = v.blue;
        `,uniform:`
            cv = ud[name].value;
            v = uv[name];
            if (cv[0] !== v.red || cv[1] !== v.green || cv[2] !== v.blue) {
                cv[0] = v.red;
                cv[1] = v.green;
                cv[2] = v.blue;
                gl.uniform3f(ud[name].location, v.red, v.green, v.blue);
            }
        `}];function n(t,e){return`
        for (let i = 0; i < ${t*e}; i++) {
            data[offset + (((i / ${t})|0) * 4) + (i % ${t})] = v[i];
        }
    `}t.s(["f",0,a],92715),t.s(["f",0,function(t,e,r){let i=[`
        var v = null;
        var v2 = null;
        var t = 0;
        var index = 0;
        var name = null;
        var arrayOffset = null;
    `],n=0;for(let s=0;s<t.length;s++){let o=t[s],u=o.data.name,f=!1,l=0;for(let t=0;t<a.length;t++)if(a[t].test(o.data)){l=o.offset/4,i.push(`name = "${u}";`,`offset += ${l-n};`,a[t].ubo),f=!0;break}if(!f)if(o.data.size>1)l=o.offset/4,i.push(r(o,l-n));else{let t=e[o.data.type];l=o.offset/4,i.push(`
                    v = uv.${u};
                    offset += ${l-n};
                    ${t};
                `)}n=l}return Function("uv","data","dataInt32","offset",i.join("\n"))}],62039);let s={f32:`
        data[offset] = v;`,i32:`
        dataInt32[offset] = v;`,u32:`
        dataInt32[offset] = v;`,"vec2<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];`,"vec3<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];`,"vec4<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];`,"vec2<i32>":`
        dataInt32[offset] = v[0];
        dataInt32[offset + 1] = v[1];`,"vec3<i32>":`
        dataInt32[offset] = v[0];
        dataInt32[offset + 1] = v[1];
        dataInt32[offset + 2] = v[2];`,"vec4<i32>":`
        dataInt32[offset] = v[0];
        dataInt32[offset + 1] = v[1];
        dataInt32[offset + 2] = v[2];
        dataInt32[offset + 3] = v[3];`,"vec2<u32>":`
        dataInt32[offset] = v[0];
        dataInt32[offset + 1] = v[1];`,"vec3<u32>":`
        dataInt32[offset] = v[0];
        dataInt32[offset + 1] = v[1];
        dataInt32[offset + 2] = v[2];`,"vec4<u32>":`
        dataInt32[offset] = v[0];
        dataInt32[offset + 1] = v[1];
        dataInt32[offset + 2] = v[2];
        dataInt32[offset + 3] = v[3];`,"mat2x2<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 4] = v[2];
        data[offset + 5] = v[3];`,"mat3x3<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 4] = v[3];
        data[offset + 5] = v[4];
        data[offset + 6] = v[5];
        data[offset + 8] = v[6];
        data[offset + 9] = v[7];
        data[offset + 10] = v[8];`,"mat4x4<f32>":`
        for (let i = 0; i < 16; i++) {
            data[offset + i] = v[i];
        }`,"mat3x2<f32>":n(3,2),"mat4x2<f32>":n(4,2),"mat2x3<f32>":n(2,3),"mat4x3<f32>":n(4,3),"mat2x4<f32>":n(2,4),"mat3x4<f32>":n(3,4)},o={...s,"mat2x2<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];
    `};t.s(["E",0,s,"c",0,o],33156);var u=t.i(95932),f=t.i(24314);class l extends u.f{constructor({buffer:t,offset:e,size:r}){super(),this.uid=(0,f.f)("buffer"),this._resourceType="bufferResource",this._resourceId=(0,f.f)("resource"),this._bufferResource=!0,this.destroyed=!1,this.buffer=t,this.offset=0|e,this.size=r,this.buffer.on("change",this.onBufferChange,this)}get _gcLastUsed(){return this.buffer?._gcLastUsed??-1}set _gcLastUsed(t){this.buffer&&(this.buffer._gcLastUsed=t)}onBufferChange(){this._resourceId=(0,f.f)("resource"),this.emit("change",this)}destroy(t=!1){this.destroyed=!0,t&&this.buffer.destroy(),this.emit("change",this),this.buffer=null,this.removeAllListeners()}}t.s(["f",0,l],87784)},87567,t=>{t.s(["f",0,function(t,e,r,i,a){if((t=Math.max(0,t))>=(e=Math.min(e,r*i)))return 0;let n=Math.floor(t/r),s=t-n*r,o=Math.floor(e/r),u=e-o*r;if(n===o)return a[0].set(s,n,u-s,1),1;let f=0,l=n;return s>0&&(a[f++].set(s,n,r-s,1),l++),o>l&&a[f++].set(0,l,r,o-l),u>0&&a[f++].set(0,o,u,1),f}])},89506,t=>{t.s(["f",0,function(t,e,r){let i=(t>>24&255)/255;e[r++]=(255&t)/255*i,e[r++]=(t>>8&255)/255*i,e[r++]=(t>>16&255)/255*i,e[r++]=i}])},40766,t=>{t.s(["f",0,class{constructor(){this.batcherName="default",this.topology="triangle-list",this.attributeSize=4,this.indexSize=6,this.packAsQuad=!0,this.roundPixels=0,this._attributeStart=0,this._batcher=null,this._batch=null}get blendMode(){return this.renderable.groupBlendMode}get color(){return this.renderable.groupColorAlpha}reset(){this.renderable=null,this.texture=null,this._batcher=null,this._batch=null,this.bounds=null}destroy(){this.reset()}}])},33219,t=>{t.s(["f",0,class{constructor(t){this.items=Object.create(null);let{renderer:e,type:r,onUnload:i,priority:a,name:n}=t;this._renderer=e,e.gc.addResourceHash(this,"items",r,a??0),this._onUnload=i,this.name=n}add(t){return!this.items[t.uid]&&(this.items[t.uid]=t,t.once("unload",this.remove,this),t._gcLastUsed=this._renderer.gc.now,!0)}remove(t,...e){if(!this.items[t.uid])return;let r=t._gpuData[this._renderer.uid];r&&(this._onUnload?.(t,...e),t.off("unload",this.remove,this),r.destroy(),t._gpuData[this._renderer.uid]=null,this.items[t.uid]=null)}removeAll(...t){Object.values(this.items).forEach(e=>e&&this.remove(e,...t))}destroy(...t){this.removeAll(...t),this.items=Object.create(null),this._renderer=null,this._onUnload=null}}])}])})();