"""Optional Playwright + Chromium test. No contact messages are sent.
Validates WebAudio noise sources and instrumented haptic requests, not physical phone vibration.
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:3000/'
OUT=Path('/tmp/omkar-leaves-about')
OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=3)
    page.add_init_script("""(() => {
      window.audioProof={buffers:0,sources:0,oscillators:0,pulses:[],starts:[],filters:[]};
      Object.defineProperty(navigator,'vibrate',{configurable:true,value:ms=>{audioProof.pulses.push(ms);return true;}});
      const Native=window.AudioContext;
      window.AudioContext=class extends Native {
        constructor(...args){super(...args);window.testAudioContext=this;}
        createBuffer(...args){audioProof.buffers++;return super.createBuffer(...args);}
        createOscillator(){audioProof.oscillators++;return super.createOscillator();}
        createBiquadFilter(){const f=super.createBiquadFilter();audioProof.filters.push(f);return f;}
        createBufferSource(){const s=super.createBufferSource();audioProof.sources++;
          const start=s.start.bind(s);s.start=(...args)=>{audioProof.starts.push({state:document.querySelector('#signatureGlyph').dataset.state,rate:s.playbackRate.value});return start(...args);};return s;
        }
      };
    })()""")
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE,wait_until='networkidle')
    page.wait_for_selector('#loader.is-done',state='attached')
    page.locator('#heroVisual').scroll_into_view_if_needed()
    page.wait_for_timeout(700)
    assert page.evaluate('audioProof.sources')==0
    page.locator('#treeSoundToggle').tap()
    box=page.locator('#signatureGlyph').bounding_box()
    x,y=box['x']+box['width']*.5,box['y']+box['height']*.55
    for i in range(5):
        page.touchscreen.tap(x,y)
        page.wait_for_timeout(1050)
        assert page.evaluate('audioProof.sources')==i+1
    proof=page.evaluate("""() => ({buffers:audioProof.buffers,sources:audioProof.sources,oscillators:audioProof.oscillators,pulses:audioProof.pulses,starts:audioProof.starts,filters:audioProof.filters.map(f=>f.type)})""")
    assert proof['buffers']==1 and proof['sources']==5 and proof['oscillators']==0
    assert proof['pulses']==[8]*5
    assert sorted(int(s['state']) for s in proof['starts'])==list(range(5))
    assert proof['filters'].count('highpass')==5 and proof['filters'].count('lowpass')==5
    # Safari/iOS often provides no vibration API. Artwork and sound must still work.
    page.evaluate("Object.defineProperty(navigator,'vibrate',{value:undefined,configurable:true})")
    page.touchscreen.tap(x,y)
    page.wait_for_timeout(1050)
    assert page.evaluate('audioProof.sources')==6
    assert len(page.evaluate('audioProof.pulses'))==5
    page.evaluate('testAudioContext.close()')
    page.touchscreen.tap(x,y)
    page.wait_for_timeout(1050)
    assert page.evaluate('audioProof.sources')==7
    assert page.evaluate('audioProof.buffers')==2
    assert page.locator('#treeSoundToggle').get_attribute('aria-pressed')=='true'
    page.locator('#treeSoundToggle').tap()
    before=page.evaluate('audioProof.sources')
    page.touchscreen.tap(x,y)
    page.wait_for_timeout(150)
    assert page.evaluate('audioProof.sources')==before
    layouts=[]
    for width,height in [(390,844),(768,1024),(1440,1000)]:
        page.set_viewport_size({'width':width,'height':height})
        page.locator('#about').scroll_into_view_if_needed()
        image=page.locator('.about-portrait img')
        image.scroll_into_view_if_needed()
        page.wait_for_function("document.querySelector('.about-portrait img').complete && document.querySelector('.about-portrait img').naturalWidth > 0")
        size=image.evaluate("i=>({w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height,nw:i.naturalWidth,nh:i.naturalHeight,fit:getComputedStyle(i).objectFit})")
        assert abs(size['w']/size['h']-.75)<.005
        assert size['nw']==900 and size['nh']==1200 and size['fit']=='contain'
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        assert page.locator('.about-chapter').count()==3
        for dark in [False,True]:
            if page.evaluate("document.body.classList.contains('dark')")!=dark:
                page.locator('#themeToggle').tap()
            page.locator('#about').scroll_into_view_if_needed()
            page.wait_for_timeout(350)
            page.locator('#about').screenshot(path=str(OUT/f'about-{width}-{"dark" if dark else "light"}.png'))
        layouts.append({'width':width,'portrait':size,'no_overflow':True})
    assert not errors,errors
    result={'base':BASE,'five_state_leaf_rustle':proof,'unsupported_vibration_safe':True,'closed_audio_context_recovers':True,'muting_prevents_new_rustles':True,'layouts':layouts,'errors':errors,'limitations':'Real touch input in emulated mobile Chromium; vibration API instrumented, no physical actuator verified.'}
    print(json.dumps(result,indent=2))
    (OUT/'results.json').write_text(json.dumps(result,indent=2)+'\n')
    browser.close()
