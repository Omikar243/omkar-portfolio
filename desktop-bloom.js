import { subscribeFrame, getQualityTier, hasCoarsePointer } from './frame-scheduler.js';

const initDesktopBloom = () => {
  const host = document.querySelector('#heroVisual');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const quality = getQualityTier();
  if (!host || !quality.vanta || hasCoarsePointer() || reduced.matches || !window.WebGLRenderingContext) return () => {};

  const canvas = document.createElement('canvas');
  canvas.className = 'desktop-bloom';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return () => {}; }

  const vertex = `attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}`;
  const fragment = `precision mediump float; uniform vec2 r; uniform float t; uniform float dark;
    float glow(vec2 p, vec2 c, float s){vec2 q=(p-c)*vec2(r.x/r.y,1.);return exp(-dot(q,q)/s);}
    void main(){vec2 p=gl_FragCoord.xy/r; float pulse=.82+.18*sin(t*.0012); float warm=glow(p,vec2(.5,.52),.018)*.32; warm+=glow(p,vec2(.34,.36),.012)*.09+glow(p,vec2(.67,.34),.012)*.09; float a=warm*pulse; vec3 c=mix(vec3(.74,.46,.18),vec3(.86,.69,.38),dark); gl_FragColor=vec4(c*a,a*.42);}`;
  const compile = (type, source) => { const shader=gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); return shader; };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.remove(); return () => {}; }
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p'); const resolution = gl.getUniformLocation(program, 'r'); const time = gl.getUniformLocation(program, 't'); const dark = gl.getUniformLocation(program, 'dark');
  let visible = true; let disposed = false; let last = -Infinity;
  const resize = () => { const box=host.getBoundingClientRect(); const ratio=Math.min(window.devicePixelRatio||1, .75); canvas.width=Math.max(1,Math.round(box.width*ratio)); canvas.height=Math.max(1,Math.round(box.height*ratio)); canvas.style.width=`${box.width}px`; canvas.style.height=`${box.height}px`; gl.viewport(0,0,canvas.width,canvas.height); };
  const draw = (now) => { if (disposed || !visible || reduced.matches || now-last<1000/30) return; last=now; gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0); gl.uniform2f(resolution,canvas.width,canvas.height); gl.uniform1f(time,now); gl.uniform1f(dark,document.body.classList.contains('dark')?1:0); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); };
  const observer = new IntersectionObserver(([entry]) => { visible=entry.isIntersecting; if(visible) draw(performance.now()); }, { threshold:.02 }); observer.observe(host);
  const unsubscribe = subscribeFrame(draw); window.addEventListener('resize',resize,{passive:true}); resize(); host.dataset.bloom='desktop-webgl';
  return () => { disposed=true; unsubscribe(); observer.disconnect(); window.removeEventListener('resize',resize); canvas.remove(); delete host.dataset.bloom; };
};

export { initDesktopBloom };
