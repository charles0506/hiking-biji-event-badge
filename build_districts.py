# -*- coding: utf-8 -*-
"""
把 trails.json 裡出現過的行政區（鄉鎮市區）都地理編碼一次，取得實際經緯度，
取代舊版「只有 22 個縣市中心點」的粗略比對，讓「附近任務」能抓到鄉鎮層級。

用 Nominatim（OpenStreetMap）查，遵守用量規範：附識別用 User-Agent、每秒最多 1 次。
177 個行政區大約要跑 3 分鐘。有快取，中斷重跑不會整個重來。

輸出 districts.json： { "新北市三芝區": [25.xx, 121.xx], ... }
"""
import io
import json
import os
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(HERE, "districts.json")
UA = "hiking-biji-event-badge/1.0 (personal userscript; contact: lawyer413@gmail.com)"

SKIP = {"西班牙"}  # 非台灣行政區，定位功能用不到


def load_json(path, default):
    if os.path.exists(path):
        with io.open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def save_json(path, data):
    with io.open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


def geocode(name):
    q = urllib.parse.urlencode({"q": "台灣" + name, "format": "json", "limit": 1, "countrycodes": "tw"})
    url = "https://nominatim.openstreetmap.org/search?" + q
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.load(r)
    if not data:
        return None
    return [float(data[0]["lat"]), float(data[0]["lon"])]


def main():
    trails = load_json(os.path.join(HERE, "trails.json"), {})
    districts = set()
    for rec in trails.values():
        for c in rec["city"].split(","):
            c = c.strip()
            if c and c not in SKIP:
                districts.add(c)

    out = load_json(OUT_FILE, {})
    todo = sorted(d for d in districts if d not in out)
    print("共 %d 個行政區，%d 個還沒查過" % (len(districts), len(todo)))

    for i, name in enumerate(todo):
        try:
            latlon = geocode(name)
        except Exception as e:
            print("  [%d/%d] %s -> 失敗: %s" % (i + 1, len(todo), name, e))
            continue
        if latlon is None:
            print("  [%d/%d] %s -> 查無結果" % (i + 1, len(todo), name))
        else:
            out[name] = latlon
            print("  [%d/%d] %s -> %.4f, %.4f" % (i + 1, len(todo), name, latlon[0], latlon[1]))
        save_json(OUT_FILE, out)
        time.sleep(1.1)

    print("\n完成，districts.json 共 %d 筆。" % len(out))


if __name__ == "__main__":
    main()
