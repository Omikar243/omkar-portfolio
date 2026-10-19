"""Optional browser checks: pip install playwright; requires Chromium.
Run: python3 tests/mobile-tree.test.py [website origin]
Uses actual browser touch input, not synthetic click events; no contact emails sent.
"""
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000/"
NAMES = ["rounded growth", "squared growth", "wide asymmetric growth", "botanical growth", "compact geometric growth"]
OUTPUT = Path(os.environ.get("TREE_TEST_OUTPUT", "/tmp/omkar-mobile-tree"))
OUTPUT.mkdir(parents=True, exist_ok=True)
INSTRUMENT = """(() => {
  window.treePaints = [];
  window.hapticRequests = [];
  window.touchUpAt = 0;
  document.addEventListener('pointerup', event => {
    if (event.target.closest?.('#signatureGlyph')) window.touchUpAt = performance.now();
  }, true);
  Object.defineProperty(navigator, 'vibrate', { configurable: true,
    value: ms => { window.hapticRequests.push({ms, state:document.querySelector('#signatureGlyph')?.dataset.state}); return true; }
  });
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  const clear = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.fillRect = function(...args) {
    if(this.canvas.id === 'fractalCanvas' && args[0] === 0 && args[1] === 0 && args[2] === this.canvas.width && args[3] === this.canvas.height) {
      window.treePaints.push(performance.now());
      if(window.treePaints.length > 240)window.treePaints.shift();
    }
    return fill.apply(this,args);
  };
  CanvasRenderingContext2D.prototype.clearRect = function(...args) {
    if(this.canvas.id === 'fractalCanvas' && args[0] === 0 && args[1] === 0 && args[2] === this.canvas.width && args[3] === this.canvas.height) {
      window.treePaints.push(performance.now());
      if(window.treePaints.length > 240)window.treePaints.shift();
    }
    return clear.apply(this,args);
  };
})()"""

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, has_touch=True, is_mobile=True)
    context.add_init_script(INSTRUMENT)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_selector("#loader.is-done", state="attached")
    page.locator("#heroVisual").scroll_into_view_if_needed()
    page.wait_for_timeout(800)
    assert page.locator(".model-panel, .game-panel, #rulesRange, #gameOptions, #gameReset").count() == 0
    assert page.locator("[data-orbit-game]").count() == 1
    box = page.locator("#signatureGlyph").bounding_box()
    x, y = box["x"] + box["width"] * .5, box["y"] + box["height"] * .55

    def snapshot():
        return page.evaluate("""() => ({state: Number(document.querySelector('#signatureGlyph').dataset.state),
          label: document.querySelector('#signatureGlyph').getAttribute('aria-label'),
          status: document.querySelector('#treeStatus').textContent,
          pixels: document.querySelector('#fractalCanvas').toDataURL(),
          dark:document.body.classList.contains('dark'),
          theme:document.querySelector('#fractalCanvas').dataset.theme,
          background:getComputedStyle(document.body).backgroundColor,
          buttons:[...document.querySelectorAll('[data-theme-toggle]')].map(b=>b.getAttribute('aria-pressed')),
          overflow:document.documentElement.scrollWidth > innerWidth})""")

    forms = []
    seen = set()
    for expected in range(6):
        latency = None
        if expected:
            page.touchscreen.tap(x, y)
            assert page.locator("#signatureGlyph").get_attribute("data-state") == str(expected % 5)
            latency = round(page.evaluate("performance.now() - touchUpAt"), 1)
            assert page.evaluate("hapticRequests.at(-1).ms") == 8
            assert page.evaluate("Number(hapticRequests.at(-1).state)") == expected % 5
            assert latency < 300, f"Touch state response too slow: {latency}ms"
            page.wait_for_function("document.querySelector('#heroVisual').dataset.morphing === 'false'", timeout=4000)
        view = snapshot()
        state = expected % 5
        assert NAMES[state] in view["label"]
        assert NAMES[state] in view["status"]
        assert not view["overflow"]
        if state not in seen:
            forms.append({"state": state, "name": NAMES[state], "touch_response_ms": latency})
            seen.add(state)
            page.locator("#heroVisual").screenshot(path=str(OUTPUT / f"form-{state}.png"))
    assert len(seen) == 5
    assert len(page.evaluate("hapticRequests")) == 5
    assert sorted(int(h["state"]) for h in page.evaluate("hapticRequests")) == list(range(5))

    page.evaluate("window.treePaints=[]")
    page.wait_for_timeout(1100)
    paints = page.evaluate("window.treePaints")
    frames = len(paints)
    assert 12 <= frames <= 38, f"Mobile frame budget unexpected: {frames} paints / 1.1s"
    budget = page.evaluate("""() => {const c=document.querySelector('#fractalCanvas'),r=c.getBoundingClientRect();return {tier:c.dataset.renderTier,branches:Number(c.dataset.branchCount),dpr:c.width/r.width}}""")
    assert budget["tier"] == "mobile-30fps"
    assert budget["branches"] == 273
    assert budget["dpr"] <= 1.51

    # Both real theme buttons must coordinate the canvas and saved global theme.
    theme_changes = []
    for selector in ["#treeThemeToggle", "#themeToggle"]:
        page.locator(selector).scroll_into_view_if_needed()
        before = snapshot()
        page.locator(selector).tap()
        page.wait_for_timeout(550)
        after = snapshot()
        assert before["state"] == after["state"]
        assert before["dark"] != after["dark"]
        assert before["pixels"] != after["pixels"]
        assert before["background"] != after["background"]
        assert after["theme"] == ("dark" if after["dark"] else "light")
        assert after["buttons"] == [str(after["dark"]).lower()] * 2
        theme_changes.append({"control": selector, "theme": after["theme"], "signature_unchanged": True})

    page.locator("#heroVisual").scroll_into_view_if_needed()
    box = page.locator("#signatureGlyph").bounding_box()
    x,y = box["x"]+box["width"]*.5, box["y"]+box["height"]*.55
    initial = snapshot()["state"]
    for i in range(3):
        page.touchscreen.tap(x,y)
        page.wait_for_timeout(90)
    assert snapshot()["state"] == (initial+3)%5
    page.wait_for_function("document.querySelector('#heroVisual').dataset.morphing === 'false'", timeout=4000)

    page.emulate_media(reduced_motion="reduce")
    page.wait_for_timeout(100)
    page.touchscreen.tap(x,y)
    assert page.locator("#heroVisual").get_attribute("data-morphing") == "false"
    before = snapshot()
    page.locator("#treeThemeToggle").tap()
    after = snapshot()
    assert before["pixels"] != after["pixels"]
    assert before["state"] == after["state"]
    remembered = after["theme"]
    page.reload(wait_until="networkidle")
    assert snapshot()["theme"] == remembered
    assert snapshot()["buttons"] == ["true" if remembered == "dark" else "false"]*2
    # Remaining game still initializes after the old demos are removed.
    page.locator('[data-orbit-start]').tap()
    page.wait_for_timeout(200)
    assert page.locator('[data-orbit-state]').inner_text() == 'LIVE'
    page.locator('[data-orbit-pause]').tap()
    assert not errors, errors
    report={"base":BASE,"touch_enabled":True,"viewport":[390,844],"device_pixel_ratio":3,
      "forms":forms,"haptic_requests_all_five":True,"haptics_method":"instrumented API requests; not physical vibration measurement","mobile_budget":budget,"paint_frames_per_1_1_seconds":frames,
      "themes":theme_changes,"rapid_retarget":True,"reduced_motion_immediate_repaint":True,
      "theme_persistence":True,"removed_demos_absent":True,"orbit_still_playable":True,"browser_errors":errors}
    print(json.dumps(report, indent=2))
    (OUTPUT / "results.json").write_text(json.dumps(report,indent=2)+"\n")
    browser.close()
