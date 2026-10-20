import { subscribeFrame, getQualityTier, hasCoarsePointer } from './frame-scheduler.js';

const STORAGE_KEY = 'omkar-bloom-settings';
const readSettings = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } };
const saveSettings = (settings) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* storage is optional */ } };

const initDesktopBloom = () => {
  const host = document.querySelector('#heroVisual');
  const panel = document.querySelector('[data-bloom-panel]');
  const toggle = panel?.querySelector('[data-bloom-toggle]');
  const intensityInput = panel?.querySelector('[data-bloom-intensity]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const quality = getQualityTier();
  if (!host || !quality.vanta || hasCoarsePointer() || reduced.matches || !window.WebGLRenderingContext) return () => {};

  const settings = readSettings();
  let enabled = settings.enabled !== false;
  let intensity = Math.max(0, Math.min(1, Number(settings.intensity ?? .62)));
  if (toggle) toggle.checked = enabled;
  if (intensityInput) intensityInput.value = String(Math.round(intensity * 100));

  const canvas = document.createElement('canvas');
  canvas.className = 'desktop-bloom'; canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return () => {}; }

  const vertex = `attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}`;
  const fragment = `precision mediump float; uniform vec2 r; uniform float t; uniform float dark; uniform float gain;
    float glow(vec2 p, vec2 c, float s){vec2 q=(p-c)*vec2(r.x/r.y,1.);return exp(-dot(q,q)/s);}
    void main(){vec2 p=gl_FragCoord.xy/r; float pulse=.82+.18*sin(t*.0012); float warm=glow(p,vec2(.5,.52),.018)*.32; warm+=glow(p,vec2(.34,.36),.012)*.09+glow(p,vec2(.67,.34),.012)*.09; float a=warm*pulse*gain; vec3 c=mix(vec3(.74,.46,.18),vec3(.86,.69,.38),dark); gl_FragColor=vec4(c*a,a*.42);}`;
  const compile = (type, source) => { const shader=gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); return shader; };
  const program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.remove(); return () => {}; }
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p'); const resolution = gl.getUniformLocation(program, 'r'); const time = gl.getUniformLocation(program, 't'); const dark = gl.getUniformLocation(program, 'dark'); const gain = gl.getUniformLocation(program, 'gain');
  let visible = true; let disposed = false; let last = -Infinity; let audioLevel = 0; let samples = null;
  const resize = () => { const box=host.getBoundingClientRect(); const ratio=Math.min(window.devicePixelRatio||1, .75); canvas.width=Math.max(1,Math.round(box.width*ratio)); canvas.height=Math.max(1,Math.round(box.height*ratio)); canvas.style.width=`${box.width}px`; canvas.style.height=`${box.height}px`; gl.viewport(0,0,canvas.width,canvas.height); };
  const readAudio = () => { const analyser=window.__ambientAnalyser; if (!analyser) return; if (!samples || samples.length !== analyser.fftSize) samples = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(samples); let sum=0; for (let i=0;i<samples.length;i+=4) sum+=samples[i]*samples[i]; const rms=Math.sqrt(sum/Math.max(1,Math.ceil(samples.length/4))); audioLevel += (Math.min(1, rms*13)-audioLevel)*.08; };
  const draw = (now) => { if (disposed || !visible || reduced.matches || now-last<1000/30) return; last=now; readAudio(); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); if (!enabled || intensity<=0) return; gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0); gl.uniform2f(resolution,canvas.width,canvas.height); gl.uniform1f(time,now); gl.uniform1f(dark,document.body.classList.contains('dark')?1:0); gl.uniform1f(gain,intensity*(1+audioLevel*.22)); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); };
  const onToggle = () => { enabled=Boolean(toggle.checked); saveSettings({enabled,intensity}); };
  const onIntensity = () => { intensity=Number(intensityInput.value)/100; saveSettings({enabled,intensity}); };
  toggle?.addEventListener('change', onToggle); intensityInput?.addEventListener('input', onIntensity);
  const observer = new IntersectionObserver(([entry]) => { visible=entry.isIntersecting; if(visible) draw(performance.now()); }, { threshold:.02 }); observer.observe(host);
  const unsubscribe = subscribeFrame(draw, { label: 'desktop-bloom', fps: 30 }); window.addEventListener('resize',resize,{passive:true}); resize();
  const analyser=window.__ambientAnalyser; if (analyser) { samples=new Float32Array(analyser.fftSize); }
  host.dataset.bloom='desktop-webgl';
  return () => { disposed=true; unsubscribe(); observer.disconnect(); window.removeEventListener('resize',resize); toggle?.removeEventListener('change',onToggle); intensityInput?.removeEventListener('input',onIntensity); canvas.remove(); delete host.dataset.bloom; };
};

export { initDesktopBloom };
