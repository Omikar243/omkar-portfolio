"""Private download regression checks; provider calls are intercepted, no emails sent.
Run: python3 tests/resume-download.test.py [website origin]
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:3000/'
ORIGINAL = Path('public/Omkar_Shettigar_Resume.pdf').read_bytes()

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    results = []
    for mode in ['accepted','provider-failure','pdf-failure','do-not-track','gpc','native-safari','server-rejected','no-storage']:
        context = browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36')
        if mode == 'do-not-track':
            context.add_init_script("Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});")
        if mode == 'no-storage':
            context.add_init_script("Storage.prototype.getItem=function(){throw Error('blocked')};Storage.prototype.setItem=function(){throw Error('blocked')};")
        if mode == 'gpc':
            context.add_init_script("Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});")
        if mode == 'native-safari':
            context.add_init_script("Object.defineProperty(navigator,'userAgent',{get:()=> 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});")
        if mode == 'server-rejected':
            context.route('**/api/resume-event',lambda route:route.fulfill(status=429,content_type='application/json',body='{}'))
        payloads = []
        def provider(route):
            payloads.append(route.request.post_data_json)
            route.fulfill(status=503 if mode=='provider-failure' else 200,
                          content_type='application/json',body=json.dumps({'success':mode!='provider-failure'}))
        context.route('https://formsubmit.co/ajax/**',provider)
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        if mode=='pdf-failure':
            def pdf(route):
                if route.request.resource_type == 'fetch': route.fulfill(status=503,body='temporary error')
                else: route.continue_()
            context.route('**/Omkar_Shettigar_Resume.pdf',pdf)
        page.goto(BASE+'?utm_source=linkedin&utm_medium=profile&utm_campaign=ai-portfolio&email=private',wait_until='networkidle',referer='https://www.linkedin.com/in/someone?private=secret')
        page.wait_for_selector('#loader.is-done',state='attached')
        with page.expect_download(timeout=25000) as info:
            page.locator('a[download]').tap()
        download=info.value
        assert download.failure() is None and Path(download.path()).read_bytes()==ORIGINAL
        assert download.suggested_filename=='Omkar_Shettigar_Resume.pdf'
        if mode in ['accepted','provider-failure','no-storage']:
            page.wait_for_timeout(700)
            assert len(payloads)==1,payloads
            payload=payloads[0]
            assert payload['Traffic source']=='linkedin'
            assert payload['Referrer hostname']=='www.linkedin.com'
            assert payload['UTM medium']=='profile' and payload['UTM campaign']=='ai-portfolio'
            assert payload['Device category']=='mobile'
            assert not any(key in payload for key in ['email','_cc','_replyto','_autoresponse'])
            assert 'secret' not in json.dumps(payload) and 'someone' not in json.dumps(payload)
            with page.expect_download(timeout=25000): page.locator('a[download]').tap()
            page.wait_for_timeout(400)
            assert len(payloads)==1,'Duplicate alert cooldown failed'
        else:
            page.wait_for_timeout(700)
            assert not payloads,payloads
        assert not errors,errors
        assert page.locator('#toast').inner_text()==''
        results.append({'case':mode,'original_pdf_bytes':True,'alerts':len(payloads),'no_public_notification':True,'errors':errors})
        context.close()
    print(json.dumps({'base':BASE,'cases':results,'real_emails_sent':0},indent=2))
    browser.close()
