"""Optional Chromium/Playwright real-touch test. No contact emails sent."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:3000/'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.add_init_script("""(() => {
      window.feedbackTest={haptics:[],tones:0,contexts:0};
      Object.defineProperty(navigator,'vibrate',{value:ms=>{feedbackTest.haptics.push(ms);return true;},configurable:true});
      const Native=window.AudioContext;
      if(Native)window.AudioContext=class extends Native{
        constructor(...args){super(...args);feedbackTest.contexts++;}
        createOscillator(){feedbackTest.tones++;return super.createOscillator();}
      };
    })()""")
    page.goto(BASE,wait_until='networkidle')
    page.wait_for_selector('#loader.is-done',state='attached')
    page.locator('#heroVisual').scroll_into_view_if_needed()
    page.wait_for_timeout(700)
    assert page.locator('#treeSoundToggle').get_attribute('aria-pressed')=='false'
    box=page.locator('#signatureGlyph').bounding_box()
    page.touchscreen.tap(box['x']+box['width']*.5,box['y']+box['height']*.55)
    page.wait_for_timeout(150)
    silent=page.evaluate('feedbackTest')
    assert silent['tones']==0 and silent['contexts']==0
    assert silent['haptics']==[8]
    state=page.locator('#signatureGlyph').get_attribute('data-state')
    page.locator('#treeSoundToggle').tap()
    assert page.locator('#signatureGlyph').get_attribute('data-state')==state
    assert page.locator('#treeSoundToggle').get_attribute('aria-pressed')=='true'
    page.touchscreen.tap(box['x']+box['width']*.5,box['y']+box['height']*.55)
    page.wait_for_timeout(250)
    sounding=page.evaluate('feedbackTest')
    assert sounding['tones']==1
    page.locator('#treeThemeToggle').tap()
    page.wait_for_timeout(100)
    assert page.evaluate('feedbackTest.tones')==1
    page.locator('#treeSoundToggle').tap()
    page.touchscreen.tap(box['x']+box['width']*.5,box['y']+box['height']*.55)
    page.wait_for_timeout(150)
    assert page.evaluate('feedbackTest.tones')==1
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(150)
    pulses=page.evaluate('feedbackTest.haptics.length')
    page.touchscreen.tap(box['x']+box['width']*.5,box['y']+box['height']*.55)
    assert page.evaluate('feedbackTest.haptics.length')==pulses
    styles=[]
    for dark in [False,True]:
        current=page.evaluate("document.body.classList.contains('dark')")
        if current!=dark:page.locator('#themeToggle').tap()
        for i in range(3):
            toggle=page.locator('.timeline-toggle').nth(i)
            toggle.scroll_into_view_if_needed()
            page.wait_for_timeout(100)
            style=toggle.evaluate("b=>({background:getComputedStyle(b).backgroundColor,color:getComputedStyle(b).color,font:getComputedStyle(b).fontFamily,height:b.getBoundingClientRect().height})")
            assert style['background']=='rgba(0, 0, 0, 0)'
            assert 'DM Sans' in style['font']
            assert style['height']>=44
            toggle.tap()
            assert toggle.get_attribute('aria-expanded')=='true'
            assert toggle.locator('.chapter-label').inner_text().lower()=='close chapter'
            detail=page.locator('#'+toggle.get_attribute('aria-controls'))
            assert detail.is_visible()
            toggle.tap()
            assert toggle.get_attribute('aria-expanded')=='false'
            assert detail.is_hidden()
            styles.append({'dark':dark,'chapter':i,'style':style})
    Path('/tmp/omkar-feedback-timeline').mkdir(exist_ok=True)
    page.locator('#experience').screenshot(path='/tmp/omkar-feedback-timeline/timeline.png')
    assert not errors, errors
    print(json.dumps({'muted_initially':True,'haptics_on_real_tap':True,'opt_in_tone':True,'theme_does_not_play_sound':True,'reduced_motion_no_vibration':True,'timeline_controls':styles,'errors':errors},indent=2))
    browser.close()
