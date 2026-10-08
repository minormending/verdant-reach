// Minimal recording Canvas for sandboxed review only. Python replays these
// real scene calls with nearest-neighbour pixels; the browser HTML is the
// authoritative review when Chromium is available.
import { runInNewContext } from 'node:vm';
import { writeFileSync } from 'node:fs';
const multiply = (a,b) => [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
export async function softwareReview(code, files, output) {
  const canvases=[];
  class Canvas {
    width=300; height=150; style={}; ops=[];
    constructor(){this.id=canvases.length;canvases.push(this);}
    getContext(){return this.g??=new Context(this);}
    toDataURL(){return 'data:image/png;base64,';}
  }
  class Context {
    constructor(canvas){this.canvas=canvas;}
    fillStyle='#000000';globalAlpha=1;globalCompositeOperation='source-over';imageSmoothingEnabled=false;
    matrix=[1,0,0,1,0,0];clips=[];stack=[];path=[];
    op(kind,args){this.canvas.ops.push({kind,args,color:this.fillStyle,alpha:this.globalAlpha,matrix:[...this.matrix],clips:this.clips.map(c=>[...c]),composite:this.globalCompositeOperation});}
    createPattern(canvas){return {pattern:canvas.id};}
    fillRect(...args){this.op('fill',args);}
    clearRect(...args){this.op('clear',args);}
    strokeRect(){} // Preview-only reachability annotations are not enabled.
    fillText(...args){this.op('text',args);}
    drawImage(image,...args){this.op('image',[image instanceof Canvas?{canvas:image.id}:{src:image.src},...args]);}
    save(){this.stack.push({matrix:[...this.matrix],clips:this.clips.map(c=>[...c]),fillStyle:this.fillStyle,globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation});}
    restore(){Object.assign(this,this.stack.pop());}
    translate(x,y){this.matrix=multiply(this.matrix,[1,0,0,1,x,y]);}
    scale(x,y){this.matrix=multiply(this.matrix,[x,0,0,y,0,0]);}
    rotate(a){this.matrix=multiply(this.matrix,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);}
    setTransform(...a){this.matrix=a;}
    resetTransform(){this.matrix=[1,0,0,1,0,0];}
    moveTo(){} lineTo(){} stroke(){} closePath(){} fill(){}
    beginPath(){this.path=[];}
    rect(x,y,w,h){const m=this.matrix;this.path.push([x*m[0]+y*m[2]+m[4],x*m[1]+y*m[3]+m[5],w*m[0],h*m[3]]);}
    clip(){this.clips.push(...this.path);}
    getImageData(){throw new Error('software review does not inspect pixels');}
  }
  class Png {
    async decode(){}
    set src(value){this._src=value;const bytes=Buffer.from(value.split(',')[1]??'','base64');this.width=bytes.readUInt32BE(16);this.height=bytes.readUInt32BE(20);}
    get src(){return this._src;}
  }
  const document={body:{append(){},prepend(){},textContent:''},createElement:k=>k==='canvas'?new Canvas():{},title:''};
  let resolve,reject;const done=new Promise((ok,no)=>{resolve=ok;reject=no;});
  const window={__files:files,__reviewDone:(sheet,labels)=>{writeFileSync(output,JSON.stringify({canvases:canvases.map(c=>({width:c.width,height:c.height,ops:c.ops})),sheet:sheet.id,labels}));resolve();}};
  const log={...console,error:(...a)=>{console.error(...a);reject(new Error(a.join(' ')));}};
  Object.defineProperty(document,'title',{set:value=>{if(value.includes('ERROR'))reject(new Error(document.body.textContent));}});
  runInNewContext(code,{window,document,Image:Png,HTMLCanvasElement:Canvas,HTMLImageElement:Png,fetch:(...a)=>window.fetch(...a),location:{search:''},localStorage:{getItem(){return null;}},console:log,performance,setTimeout,clearTimeout,URLSearchParams,structuredClone});
  return done;
}
