import math, wave
from pathlib import Path
import numpy as np

SR = 44100
DURATION = 28.88
N = int(SR * DURATION)
rng = np.random.default_rng(42)
t = np.arange(N, dtype=np.float64) / SR
L = np.zeros(N, dtype=np.float64)
R = np.zeros(N, dtype=np.float64)

def add(signal, start=0.0, gain=1.0, pan=0.0):
    i = int(max(0, start) * SR)
    j = min(N, i + len(signal))
    if j <= i: return
    s = signal[:j-i] * gain
    left = math.sqrt((1-pan) * 0.5)
    right = math.sqrt((1+pan) * 0.5)
    L[i:j] += s * left
    R[i:j] += s * right

def exp_env(length, attack=0.005, release=0.08):
    x = np.arange(length) / SR
    e = np.ones(length)
    a = max(1, int(attack*SR)); r = max(1, int(release*SR))
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e

def tone(freq, dur, kind='sine', attack=.01, release=.12):
    m = int(dur*SR); tt = np.arange(m)/SR
    phase = 2*np.pi*freq*tt
    if kind == 'triangle':
        sig = 2*np.abs(2*((freq*tt) % 1)-1)-1
    elif kind == 'square':
        sig = np.sign(np.sin(phase))
    else:
        sig = np.sin(phase)
    return sig * exp_env(m, attack, release)

def kick():
    m=int(.18*SR); tt=np.arange(m)/SR
    f=105*np.exp(-tt*22)+46
    phase=2*np.pi*np.cumsum(f)/SR
    return np.sin(phase)*np.exp(-tt*22)

def hat():
    m=int(.055*SR); tt=np.arange(m)/SR
    noise=rng.normal(0,1,m)
    return noise*np.exp(-tt*75)

def snare():
    m=int(.13*SR); tt=np.arange(m)/SR
    noise=rng.normal(0,1,m)
    body=np.sin(2*np.pi*190*tt)*np.exp(-tt*28)
    return (noise*.65+body*.35)*np.exp(-tt*24)

def whoosh(dur=.38):
    m=int(dur*SR); tt=np.arange(m)/SR
    noise=rng.normal(0,1,m)
    # Gentle bright sweep: broad noise plus high harmonic shimmer.
    shimmer=np.sin(2*np.pi*(300+1800*tt/dur)*tt)
    env=np.sin(np.pi*np.clip(tt/dur,0,1))**1.4
    return (noise*.55+shimmer*.45)*env

def chime(root=660):
    a=tone(root,.52,'sine',.008,.35)
    b=tone(root*1.5,.46,'sine',.008,.30)
    c=tone(root*2,.34,'sine',.008,.25)
    out=np.zeros(max(len(a),len(b),len(c)))
    out[:len(a)]+=a*.55; out[:len(b)]+=b*.32; out[:len(c)]+=c*.16
    return out

# Warm, forward-moving four-chord pulse: Em / C / G / D.
chords=[82.41,65.41,98.00,73.42]
for bar,start in enumerate(np.arange(0, DURATION, 2.0)):
    root=chords[bar%4]
    pad=np.zeros(int(2.0*SR))
    for ratio,amp in [(1,.16),(1.5,.10),(2,.06)]:
        s=tone(root*ratio,2.05,'sine',.18,.45)
        m = min(len(pad), len(s))
        pad[:m] += s[:m]*amp
    add(pad,start,gain=.58,pan=-.08 if bar%2==0 else .08)

# 120 BPM kick/hat groove plus small syncopated claps.
beat=.5
for k,start in enumerate(np.arange(0,DURATION,beat)):
    add(kick(),start,gain=.18,pan=0)
    add(hat(),start+beat*.5,gain=.055,pan=-.2 if k%2 else .2)
    if k%4 in (1,3): add(snare(),start,gain=.08,pan=0)

# Arpeggio makes section content feel like a designed marketing sequence.
arp=[329.63,392.00,493.88,587.33,493.88,392.00,329.63,246.94]
step=.25
for k,start in enumerate(np.arange(0,DURATION,step)):
    add(tone(arp[k%len(arp)],.20,'triangle',.004,.08),start,gain=.075,pan=-.35 if k%2==0 else .35)

# Section transition accents match the caption beats and visible chapter changes.
sections=[0.0,5.2,10.2,15.4,22.3,25.0]
for i,start in enumerate(sections):
    add(whoosh(.42), max(0,start-.18), gain=.30, pan=(-.35 if i%2==0 else .35))
    add(chime(587.33 if i%2==0 else 659.25), start+.04, gain=.52, pan=.16 if i%2 else -.16)
    add(tone(110, .10, 'sine', .002, .07), start, gain=.18, pan=0)

# Final CTA lift and soft resolve.
add(chime(783.99),21.0,gain=.22,pan=.1)
for start in [25.0,26.0,27.0]:
    add(tone(659.25,.18,'triangle',.004,.12),start,gain=.07,pan=.2)

# Gentle master fade, normalize conservatively, and write stereo PCM.
master=np.max(np.abs(np.concatenate([L,R])))
peak=max(1e-9,float(master.max()))
L=np.tanh(L*.92/peak)*0.92
R=np.tanh(R*.92/peak)*0.92
fade=int(.5*SR); L[-fade:]*=np.linspace(1,0,fade); R[-fade:]*=np.linspace(1,0,fade)
inter=np.empty(N*2,dtype=np.float32); inter[0::2]=L.astype(np.float32); inter[1::2]=R.astype(np.float32)
pcm=np.clip(inter,-1,1)
out=Path('/tmp/website-marketing-bed.wav')
with wave.open(str(out),'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((pcm*32767).astype('<i2').tobytes())
print(out)
