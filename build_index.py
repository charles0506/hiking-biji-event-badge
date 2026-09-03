# -*- coding: utf-8 -*-
"""
健行筆記 線上活動 <-> 路線 對照表建立器

抓 https://hiking.biji.co/index.php?q=minisite&act=list (含 page=2 / category=theme)
逐一進入每個活動專區頁，解析 #trail_list 裡的路線，
輸出 events.json / trails.json 兩份索引。
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

BASE = "https://hiking.biji.co"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
HERE = os.path.dirname(os.path.abspath(__file__))

LIST_URLS = [
    "/index.php?q=minisite&act=list",
    "/index.php?q=minisite&act=list&page=2",
    "/index.php?q=minisite&act=list&category=theme",
]


def get(path):
    url = path if path.startswith("http") else BASE + path
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def unescape(s):
    import html
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()


def collect_event_ids():
    events = {}
    for lu in LIST_URLS:
        h = get(lu)
        for m in re.finditer(r'href="/index\.php\?q=minisite&id=(\d+)"(.{0,900}?)</a>', h, re.S):
            eid = int(m.group(1))
            blob = unescape(m.group(2))
            period = ""
            pm = re.search(r"(\d{4}-\d{2}-\d{2}) ~ (\d{4}-\d{2}-\d{2})", blob)
            if pm:
                period = pm.group(0)
                blob = blob.replace("活動期間：", "").replace(period, "")
            name = re.sub(r'^class="block">\s*', "", blob).strip()
            if eid not in events or (not events[eid]["name"] and name):
                events[eid] = {"id": eid, "name": name, "period": period,
                               "url": "%s/index.php?q=minisite&id=%d" % (BASE, eid)}
        time.sleep(0.3)
    return events


TRAIL_RE = re.compile(
    r'href="/index\.php\?q=trail&act=detail&id=(\d+)" class="title"[^>]*>(.*?)</a>.*?'
    r'<div class="city">(.*?)</div>.*?<div class="detail-info">(.*?)</div>',
    re.S)


def parse_trails(html_text):
    m = re.search(r'<ul id="trail_list".*?</ul>', html_text, re.S)
    if not m:
        return []
    block = m.group(0)
    out = []
    for t in TRAIL_RE.finditer(block):
        out.append({
            "trail_id": int(t.group(1)),
            "name": unescape(t.group(2)),
            "city": unescape(t.group(3)),
            "info": unescape(t.group(4)),
        })
    return out


def nav_ids(html_text):
    return sorted(set(int(x) for x in re.findall(r'href="[^"]*[?&]nav=(\d+)"', html_text)))


def main():
    events = collect_event_ids()
    trails = {}
    for eid, ev in sorted(events.items()):
        page = get(ev["url"])
        found = {}
        for tr in parse_trails(page):
            found[tr["trail_id"]] = tr
        # 路線清單常藏在子頁籤(nav)裡，逐一掃過
        for nav in nav_ids(page):
            try:
                sub = get("%s&nav=%d" % (ev["url"], nav))
            except Exception as e:
                print("  nav=%d 失敗: %s" % (nav, e))
                continue
            for tr in parse_trails(sub):
                found.setdefault(tr["trail_id"], tr)
            time.sleep(0.3)
        ev["trails"] = [found[k] for k in sorted(found)]
        print("[%s] %s -> %d 條路線" % (eid, ev["name"], len(ev["trails"])))
        for tr in ev["trails"]:
            rec = trails.setdefault(str(tr["trail_id"]), {
                "trail_id": tr["trail_id"], "name": tr["name"],
                "city": tr["city"], "info": tr["info"],
                "url": "%s/index.php?q=trail&act=detail&id=%d" % (BASE, tr["trail_id"]),
                "events": [],
            })
            rec["events"].append({"id": eid, "name": ev["name"], "period": ev["period"]})
        time.sleep(0.5)

    with open(os.path.join(HERE, "events.json"), "w", encoding="utf-8") as f:
        json.dump(list(events.values()), f, ensure_ascii=False, indent=1)
    with open(os.path.join(HERE, "trails.json"), "w", encoding="utf-8") as f:
        json.dump(trails, f, ensure_ascii=False, indent=1)
    print("\n活動 %d 個，路線 %d 條 -> events.json / trails.json" % (len(events), len(trails)))


if __name__ == "__main__":
    main()
