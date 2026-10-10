"""Focused live checks; no contact messages are sent.
Touch is real browser input in emulation; haptics are instrumented API requests.
PCM evidence verifies the audio graph, not playback through a physical phone speaker.
Run: python3 tests/live-portfolio.test.py [website origin]
"""
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3000/'
OUT = Path(os.environ.get('PORTFOLIO_TEST_OUTPUT', '/tmp/omkar-live-portfolio'))
OUT.mkdir(parents=True, exist_ok=True)
INSTRUMENT = """(() => {
  window.feedbackProof = {sources:0, pulses:[], rms:[]};
  Object.defineProperty(navigator, 'vibrate', {configurable:true,
    value:ms => {feedbackProof.pulses.push(ms);return true;}});
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    createBufferSource(){feedbackProof.sources++;return super.createBufferSource();}
    createGain(){
      const gain = super.createGain(), connect = gain.connect.bind(gain), context = this;
      gain.connect = function(target, ...args){
        if(target === context.destination){
          const analyser = context.createAnalyser();analyser.fftSize = 2048;
          connect(analyser);analyser.connect(target);window.rustleAnalyser = analyser;
          return target;
        }
        return connect(target, ...args);
      };
      return gain;
    }
  };
})()"""
PIXELS = """() => {
  const c = document.querySelector('#fractalCanvas'), ctx = c.getContext('2d');
  const positions = [[2,2],[c.width-3,2],[2,c.height-3],[c.width-3,c.height-3]];
  return {attributes:ctx.getContextAttributes(), surface:c.dataset.surface,
    theme:c.dataset.theme, corners:positions.map(([x,y])=>[...ctx.getImageData(x,y,1,1).data]),
    css:getComputedStyle(c).backgroundColor,
    grain:getComputedStyle(document.querySelector('.grain')).backgroundImage};
}"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=3,
                                  has_touch=True, is_mobile=True,
                                  user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36')
    context.add_init_script(INSTRUMENT)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_selector('#loader.is-done', state='attached')
    page.locator('#heroVisual').scroll_into_view_if_needed()
    page.wait_for_timeout(800)
    themes = []
    for dark in [False,True,False]:
        if page.evaluate("document.body.classList.contains('dark')") != dark:
            page.locator('#treeThemeToggle').tap()
        page.wait_for_timeout(550)
        pixels = page.evaluate(PIXELS)
        expected = [33,26,21,255] if dark else [243,234,220,255]
        assert pixels['attributes']['alpha'] is False
        assert pixels['attributes']['desynchronized'] is False
        assert all(color == expected for color in pixels['corners']), pixels
        assert pixels['surface'] == 'opaque-synchronized'
        assert 'svg' not in pixels['grain'] and 'feTurbulence' not in pixels['grain']
        themes.append(pixels)
        page.locator('#heroVisual').screenshot(path=str(OUT/f'tree-{"dark" if dark else "light"}.png'))
    assert page.evaluate('feedbackProof.sources') == 0
    page.locator('#treeSoundToggle').tap()
    box = page.locator('#signatureGlyph').bounding_box()
    x, y = box['x'] + box['width']*.5, box['y'] + box['height']*.55
    states = []
    for step in range(1,6):
        page.touchscreen.tap(x,y)
        assert page.locator('#signatureGlyph').get_attribute('data-state') == str(step%5)
        assert page.locator('#heroVisual').get_attribute('data-morphing') == 'true'
        page.wait_for_timeout(210)
        rms = page.evaluate("""() => {
          const samples = new Float32Array(rustleAnalyser.fftSize);
          rustleAnalyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length);
          feedbackProof.rms.push(rms);return rms;
        }""")
        assert 0.0001 < rms < 0.1, f'Unexpected leaf-rustle audio level: {rms}'
        assert page.evaluate('feedbackProof.sources') == step
        assert page.evaluate('feedbackProof.pulses.at(-1)') == 8
        states.append({'state':step%5,'leaf_rms':rms,'haptic_request_ms':8})
        page.wait_for_timeout(1050)
    page.touchscreen.tap(x,y)
    page.wait_for_timeout(180)
    page.locator('#about').scroll_into_view_if_needed()
    page.wait_for_timeout(350)
    silent_rms = page.evaluate("""() => {
      const samples=new Float32Array(rustleAnalyser.fftSize);
      rustleAnalyser.getFloatTimeDomainData(samples);
      return Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length);
    }""")
    assert silent_rms < 0.0001, f'Offscreen rustle did not stop: {silent_rms}'
    page.locator('#heroVisual').scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    page.locator('#treeSoundToggle').tap()
    before = page.evaluate('feedbackProof.sources')
    box = page.locator('#signatureGlyph').bounding_box()
    x,y = box['x']+box['width']*.5,box['y']+box['height']*.55
    page.touchscreen.tap(x,y)
    page.wait_for_timeout(200)
    assert page.evaluate('feedbackProof.sources') == before
    page.emulate_media(reduced_motion='reduce')
    page.touchscreen.tap(x,y)
    assert page.locator('#heroVisual').get_attribute('data-morphing') == 'false'
    page.emulate_media(reduced_motion='no-preference')
    # Exercise renderer recovery without accessing browser internals or a real GPU.
    page.evaluate("document.querySelector('#fractalCanvas').dispatchEvent(new Event('contextlost',{cancelable:true}))")
    page.evaluate("document.querySelector('#fractalCanvas').dispatchEvent(new Event('contextrestored'))")
    page.wait_for_timeout(100)
    assert page.evaluate(PIXELS)['corners'][0] == [243,234,220,255]
    layouts = []
    for width,height in [(320,800),(390,844),(768,1024),(900,1024),(1440,1000)]:
        page.set_viewport_size({'width':width,'height':height})
        page.locator('.about-portrait').scroll_into_view_if_needed()
        page.wait_for_timeout(650)
        page.wait_for_function("document.querySelector('.about-portrait img').complete && document.querySelector('.about-portrait img').naturalWidth > 0")
        about = page.evaluate("""() => {
          const img=document.querySelector('.about-portrait img'),figure=img.closest('figure');
          const label=figure.querySelector('figcaption>span'),name=figure.querySelector('.portrait-signature');
          const i=img.getBoundingClientRect(),f=figure.getBoundingClientRect(),l=label.getBoundingClientRect(),n=name.getBoundingClientRect();
          const body=document.querySelector('.about-body').getBoundingClientRect();
          const metrics=[...document.querySelectorAll('.about-grid .stat')].map(s=>s.getBoundingClientRect());
          return {width:innerWidth,image:[img.naturalWidth,img.naturalHeight],ratio:i.width/i.height,
            gap:n.left-l.right,caption_inside:n.right<=f.right+1&&l.left>=f.left-1,
            metrics_inside:metrics.every(m=>m.right<=body.right+1&&m.left>=body.left-1),
            overflow:document.documentElement.scrollWidth>innerWidth};
        }""")
        assert about['image'] == [900,1200] and abs(about['ratio']-.75) < .005
        assert abs(about['gap']-12) < .5 and about['caption_inside'] and about['metrics_inside']
        assert not about['overflow'],about
        layouts.append(about)
        if width in [390,768,1440]:
            page.locator('#about').screenshot(path=str(OUT/f'about-{width}.png'))
    page.set_viewport_size({'width':390,'height':844})
    projects = []
    for card, destination in [('[data-project="ancient-modern"]','https://ancient-modern-apparel-six.vercel.app/'),
                              ('[data-project="knee-osteoarthritis"]','https://github.com/Ramachandra-2k96/Kneeosteoarthritits')]:
        link = page.locator(f'{card} a.project-link')
        link.scroll_into_view_if_needed()
        assert link.get_attribute('href') == destination and link.get_attribute('target') == '_blank'
        page.wait_for_timeout(800)
        print('Checking project tap:',destination,flush=True)
        with page.expect_popup(timeout=15000) as popup_info:
            link.tap()
        popup = popup_info.value
        popup.wait_for_load_state('domcontentloaded', timeout=45000)
        assert popup.url.rstrip('/') == destination.rstrip('/'),popup.url
        projects.append({'button':link.inner_text(),'opened_url':popup.url,'title':popup.title()})
        popup.close()
    with page.expect_download(timeout=15000) as download_info:
        page.locator('a[download]').tap()
    download = download_info.value
    assert download.failure() is None
    assert download.suggested_filename == 'Omkar_Shettigar_Resume.pdf'
    original = Path('public/Omkar_Shettigar_Resume.pdf').read_bytes()
    assert Path(download.path()).read_bytes() == original
    assert not errors,errors
    result = {'base':BASE,'opaque_themes':themes,'five_states_audio_and_haptic_requests':states,
              'muting_works':True,'offscreen_rustle_stopped':True,'reduced_motion_immediate':True,'recovery_handler_repaints':True,
              'portrait_layouts':layouts,'project_actions':projects,'original_resume_bytes_match':True,
              'browser_errors':errors,
              'limitations':'Android UA and real touch in mobile Chromium emulation; PCM graph analysed, physical handset GPU/speakers/vibration not verified.'}
    (OUT/'results.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
    browser.close()
