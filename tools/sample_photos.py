#!/usr/bin/env python3
"""Fetch freely licensed Wikimedia Commons photos for the prototype's sample pins.

    python3 tools/sample_photos.py

For each (name, query) below, takes the first freely licensed landscape result and
saves sample/img/<name>.jpg at 1200 px, and writes sample/credits.json.
Sample data only: real Pins photos will live on Dropbox.
"""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'PinsPrototype/0.1 (personal, non-commercial)'}
FREE = re.compile(r'^(CC0|CC BY(-SA)? [\d.]+|Public domain|PD.*)', re.I)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

WANT = [
    ('mplus', 'M+ West Kowloon museum'),
    ('taikwun', 'Tai Kwun'),
    ('starferry', 'Star Ferry Victoria Harbour'),
    ('ryoanji', 'Ryoan-ji rock garden'),
    ('fushimi', 'Fushimi Inari torii'),
    ('chichu', 'Naoshima pumpkin'),
    ('kenrokuen', 'Kenroku-en garden Kanazawa'),
    ('hoian', 'Hoi An ancient town lanterns'),
    ('halong', 'Ha Long Bay karst boats'),
    ('vanmieu', 'Temple of Literature Hanoi'),
    ('hue', 'Hue imperial city gate'),
    ('belem', 'Belem Tower Lisbon'),
    ('gulbenkian', 'Gulbenkian garden Lisbon'),
    ('louisiana', 'Louisiana Museum of Modern Art Humlebaek'),
    ('nyhavn', 'Nyhavn Copenhagen'),
    ('highline', 'High Line park New York'),
    ('guggenheim', 'Solomon R. Guggenheim Museum exterior'),
    ('jokulsarlon', 'Jokulsarlon glacier lagoon'),
    ('thingvellir', 'Thingvellir rift'),
    ('pantheon', 'Pantheon Rome interior oculus'),
    ('skye', 'Old Man of Storr Skye'),
    ('orsay', 'Musee d Orsay clock'),
    ('rijks', 'Rijksmuseum Amsterdam facade'),
    ('beyeler', 'Fondation Beyeler Riehen'),
    ('papes', 'Palais des Papes Avignon'),
    ('ser-lion', 'Serengeti male lion mane'),
    ('ser-kopje', 'Serengeti kopje lions'),
    ('ser-plains', 'Serengeti sunset'),
    ('ser-camp', 'Serengeti tented camp'),
    ('ser-pride', 'Serengeti lion pride'),
]


def call(**params):
    q = urllib.parse.urlencode({'format': 'json', 'formatversion': 2, **params})
    for wait in (5, 15, 45, 0):
        try:
            with urllib.request.urlopen(urllib.request.Request(f'{API}?{q}', headers=UA)) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429 or not wait:
                raise
            time.sleep(wait)


def strip(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()


credits_path = os.path.join(ROOT, 'sample', 'credits.json')
credits = json.load(open(credits_path)) if os.path.exists(credits_path) else {}
os.makedirs(os.path.join(ROOT, 'sample', 'img'), exist_ok=True)

for name, query in WANT:
    dest = os.path.join(ROOT, 'sample', 'img', f'{name}.jpg')
    if os.path.exists(dest):
        continue
    hits = call(action='query', list='search', srnamespace=6, srlimit=10,
                srsearch=f'{query} filetype:bitmap filew:>1600')['query']['search']
    if not hits:
        print('no hits', name); continue
    d = call(action='query', titles='|'.join(h['title'] for h in hits), prop='imageinfo',
             iiprop='url|size|extmetadata|mime', iiurlwidth=1200)
    pages = {p['title']: p for p in d['query']['pages']}
    for h in hits:
        ii = (pages.get(h['title'], {}).get('imageinfo') or [{}])[0]
        m = ii.get('extmetadata', {})
        lic = m.get('LicenseShortName', {}).get('value', '')
        if not FREE.match(lic) or ii.get('mime') != 'image/jpeg' or ii.get('width', 0) < ii.get('height', 1):
            continue
        with urllib.request.urlopen(urllib.request.Request(ii['thumburl'], headers=UA)) as r, open(dest, 'wb') as fh:
            fh.write(r.read())
        credits[name] = {'author': strip(m.get('Artist', {}).get('value'))[:80], 'license': lic, 'source': ii['descriptionurl']}
        print('ok', name, h['title'])
        break
    else:
        print('none free', name)
    time.sleep(1)

json.dump(credits, open(credits_path, 'w'), indent=1, ensure_ascii=False)
