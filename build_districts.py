# -*- coding: utf-8 -*-
"""
把 trails.json 裡出現過的行政區（鄉鎮市區）都地理編碼一次，取得實際經緯度，
給「附近任務」用（前端 DC 陣列）。

用 Nominatim（OpenStreetMap）查，遵守用量規範：附識別用 User-Agent、每秒最多 1 次。
有快取，中斷重跑不會整個重來。

輸出 districts.json： { "新北市三芝區": [25.xx, 121.xx], ... }（台/臺 兩種寫法都各存一筆）

踩過的雷：第一版用「台灣」+名稱自由文字查，而且名稱有「台中市」「臺中市」兩種寫法，
結果台中市和平區被配到新北市、好幾個鄉鎮拿到同一個座標，前端「附近」全歪。
現在：一律換成正式寫法（臺北/臺中/臺南/臺東）再查、只接受 OSM 的行政區界（boundary/administrative）、
查完檢查有沒有不同鄉鎮拿到同座標，有就直接報錯不存檔。
"""
import io
import json
import os
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(HERE, "districts.json")
CACHE_FILE = os.path.join(HERE, "districts_cache.json")  # 以正式寫法為 key，只留本機（.gitignore）
UA = "hiking-biji-event-badge/1.0 (personal userscript; contact: lawyer413@gmail.com)"

SKIP = {"西班牙"}  # 非台灣行政區，定位功能用不到
BBOX = (21.5, 26.6, 118.0, 122.5)  # 台澎金馬大致範圍，跑出這範圍的結果一律不收


def canonical(name):
    """「台中市和平區」→「臺中市和平區」：只換縣市那 3 個字，鄉鎮名不動。"""
    return name[:3].replace("台", "臺") + name[3:]


def load_json(path, default):
    if os.path.exists(path):
        with io.open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def save_json(path, data):
    with io.open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


def geocode(name):
    q = urllib.parse.urlencode({
        "q": name, "format": "json", "limit": 5,
        "countrycodes": "tw", "accept-language": "zh-TW",
    })
    req = urllib.request.Request("https://nominatim.openstreetmap.org/search?" + q, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.load(r)
    for x in data:
        if x.get("class") != "boundary" or x.get("type") != "administrative":
            continue
        lat, lon = float(x["lat"]), float(x["lon"])
        if not (BBOX[0] <= lat <= BBOX[1] and BBOX[2] <= lon <= BBOX[3]):
            continue
        return [round(lat, 5), round(lon, 5)]
    return None


def main():
    trails = load_json(os.path.join(HERE, "trails.json"), {})
    raw_names = set()
    for rec in trails.values():
        for c in rec["city"].split(","):
            c = c.strip()
            if c and c not in SKIP:
                raw_names.add(c)

    canon = sorted(set(canonical(n) for n in raw_names))
    cache = load_json(CACHE_FILE, {})
    todo = [c for c in canon if c not in cache]
    print("共 %d 個行政區（台/臺合併後），%d 個還沒查過" % (len(canon), len(todo)))

    for i, name in enumerate(todo):
        try:
            latlon = geocode(name)
        except Exception as e:
            print("  [%d/%d] %s -> 失敗: %s" % (i + 1, len(todo), name, e))
            time.sleep(1.1)
            continue
        cache[name] = latlon  # None 也存：查過、查不到，別每次重查
        print("  [%d/%d] %s -> %s" % (i + 1, len(todo), name, latlon if latlon else "查無行政區界結果"))
        save_json(CACHE_FILE, cache)
        time.sleep(1.1)

    # 同座標檢查：不同鄉鎮不可能同一個中心點，有就是配錯了
    seen = {}
    for name, ll in cache.items():
        if ll:
            seen.setdefault(tuple(ll), []).append(name)
    dups = {k: v for k, v in seen.items() if len(v) > 1}
    if dups:
        for k, v in dups.items():
            print("  座標重複 %s：%s" % (list(k), "、".join(v)))
        raise SystemExit("有不同行政區拿到同一個座標，資料不可信，沒有輸出 districts.json。")

    out = {}
    for n in sorted(raw_names):
        ll = cache.get(canonical(n))
        if ll:
            out[n] = ll
    save_json(OUT_FILE, out)
    missing = [n for n in sorted(raw_names) if n not in out]
    print("\n完成，districts.json 共 %d 筆；沒座標（前端退回縣市中心點）：%s" % (len(out), "、".join(missing) or "無"))


if __name__ == "__main__":
    main()
