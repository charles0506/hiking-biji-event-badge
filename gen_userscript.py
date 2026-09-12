# -*- coding: utf-8 -*-
"""
把 trails.json / events.json 打包進 userscript。
改完索引就重跑這支，然後在 Tampermonkey 重新匯入（記得 @version 會自動 +1）。
"""
import io
import json
import os
import re
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
# 兩份輸出：Tampermonkey 常駐讀的那份（照 D:\claudeD 的「每個程式一個資料夾」慣例放 firefox/ 下），
# 跟這個 repo 自己 userscript/ 底下的鏡像（給 GitHub 上的人看，repo 自己要完整能跑）。
OUT_LIVE = r"D:\claudeD\firefox\biji-event-badge\biji-event-badge.user.js"
OUT_REPO = os.path.join(HERE, "userscript", "biji-event-badge.user.js")

# 每個「活動」（任務類型）固定配一個顏色，用活動 id 取模決定，不用陣列位置
# ——活動清單改順序、增減都不會讓既有活動的顏色跳來跳去。
#
# 第一版手挑一堆深棕/暗紅色系 hex，好幾個看起來像同一種「暗紅棕」。
# 第二版改成固定 HSL 明度、色相平均分布——結果同樣的明度在不同色相下人眼感受到的
# 「亮度」差很多（黃/紅/綠天生看起來比藍/紫亮，WCAG 對比公式抓得出來），
# 於是黃綠紅那幾色配白字看起來就是不夠深、字看不清楚，藍紫色系才夠深。
# 這版改成每個色相各自二分搜尋明度，讓每個顏色的 WCAG 相對亮度都逼近同一個目標值，
# 直接保證每一色配白字的對比度都一樣好，不會有些深有些淺。
def _hsl_to_rgb(h, s, l):
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60.0) % 2 - 1))
    m = l - c / 2
    if h < 60:
        r, g, b = c, x, 0
    elif h < 120:
        r, g, b = x, c, 0
    elif h < 180:
        r, g, b = 0, c, x
    elif h < 240:
        r, g, b = 0, x, c
    elif h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    return (r + m) * 255, (g + m) * 255, (b + m) * 255


def _rel_luminance(r, g, b):
    def chan(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = chan(r), chan(g), chan(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


TARGET_LUMINANCE = 0.09  # 對白字(亮度1.0)算出來對比度約 8:1，AAA 等級還有餘裕


def _hex_for_hue(h, s=0.75):
    lo, hi = 0.05, 0.65
    for _ in range(30):
        mid = (lo + hi) / 2
        lum = _rel_luminance(*_hsl_to_rgb(h, s, mid))
        if lum > TARGET_LUMINANCE:
            hi = mid
        else:
            lo = mid
    r, g, b = _hsl_to_rgb(h, s, lo)
    return "#%02x%02x%02x" % (round(r), round(g), round(b))


def _make_palette(n=24):
    return [_hex_for_hue((360.0 * i) / n) for i in range(n)]


COLOR_PALETTE = _make_palette()


def assign_colors(activity_ids):
    """活動 id → 顏色，盡量每個活動都拿到不同顏色。
    活動 id 本身間距常常剛好是 20 的倍數（146/186/326 全部 mod20==6），
    直接 id % len(palette) 會系統性撞色；先用 Knuth 乘法雜湊打散，
    再遇到撞色就往後找下一個空位（開放定址），只要活動數 <= 調色盤大小就不會撞。
    依 id 排序處理，同一批索引重跑時配色穩定。
    """
    n = len(COLOR_PALETTE)
    used = set()
    out = {}
    for aid in sorted(activity_ids):
        h = (aid * 2654435761) & 0xFFFFFFFF
        slot = h % n
        for _ in range(n):
            if slot not in used:
                break
            slot = (slot + 1) % n
        used.add(slot)
        out[aid] = COLOR_PALETTE[slot]
    return out


# 22 縣市概略中心點，當某個鄉鎮市區沒查到座標時的退路（寧可粗一點也要讓它能被選/被定位到）。
COUNTY_FALLBACK = {
    "台北市": (25.0330, 121.5654), "新北市": (25.0169, 121.4628),
    "基隆市": (25.1276, 121.7392), "宜蘭縣": (24.7021, 121.7378),
    "桃園市": (24.9936, 121.3010), "新竹市": (24.8138, 120.9675),
    "新竹縣": (24.8387, 121.0177), "苗栗縣": (24.5602, 120.8214),
    "台中市": (24.1477, 120.6736), "彰化縣": (24.0518, 120.5161),
    "南投縣": (23.9609, 120.9718), "雲林縣": (23.7092, 120.4313),
    "嘉義市": (23.4801, 120.4491), "嘉義縣": (23.4518, 120.2555),
    "台南市": (22.9998, 120.2269), "高雄市": (22.6273, 120.3014),
    "屏東縣": (22.5519, 120.5487), "台東縣": (22.7583, 121.1444),
    "花蓮縣": (23.9871, 121.6015), "澎湖縣": (23.5711, 119.5793),
    "金門縣": (24.4491, 118.3766), "連江縣": (26.1505, 119.9297),
}


def _norm(s):
    return s.replace("臺", "台")


def build_district_centers(trails):
    """鄉鎮市區中心點：build_districts.py 抓到的用真實座標，抓不到/沒跑過的退回縣市座標。"""
    geocoded = load("districts.json") if os.path.exists(os.path.join(HERE, "districts.json")) else {}
    names = set()
    for rec in trails.values():
        for c in rec["city"].split(","):
            c = c.strip()
            if c:
                names.add(c)
    dc = []
    missing = []
    for name in sorted(names):
        if name in geocoded:
            dc.append([name, geocoded[name][0], geocoded[name][1]])
            continue
        county = _norm(name)[:3]
        if county in COUNTY_FALLBACK:
            lat, lon = COUNTY_FALLBACK[county]
            dc.append([name, lat, lon])
        else:
            missing.append(name)  # 既沒查到座標，也認不出是哪個縣市（例如「西班牙」）——不放進去
    if missing:
        print("  沒有座標也無法歸類縣市，略過：%s" % "、".join(missing))
    return dc


def load(n):
    with io.open(os.path.join(HERE, n), encoding="utf-8") as f:
        return json.load(f)


def bump_version():
    if os.path.exists(OUT_LIVE):
        s = io.open(OUT_LIVE, encoding="utf-8").read()
        m = re.search(r"@version\s+(\d+)\.(\d+)\.(\d+)", s)
        if m:
            a, b, c = map(int, m.groups())
            return "%d.%d.%d" % (a, b, c + 1)
    return "1.0.0"


def main():
    events = load("events.json")
    trails = load("trails.json")
    try:
        overlap = load("overlap.json")
    except FileNotFoundError:
        overlap = {}

    # 只留有路線的活動
    ev_list = [e for e in events if e.get("trails")]
    idx = {e["id"]: i for i, e in enumerate(ev_list)}
    colors = assign_colors([e["id"] for e in ev_list])
    EV = [[e["name"],
           (e["period"].split("~")[0].strip() if "~" in (e["period"] or "") else ""),
           (e["period"].split("~")[1].strip() if "~" in (e["period"] or "") else ""),
           e["id"],
           colors[e["id"]]] for e in ev_list]

    T = {}
    for tid, rec in trails.items():
        ids = sorted({idx[ev["id"]] for ev in rec["events"] if ev["id"] in idx})
        if ids:
            T[tid] = [rec["name"], rec["city"], rec["url"], ids]

    # OV：GPX 軌跡實際比對過、確認真的路過的候選（build_overlap.py 產生）。
    # 只留 no_gpx=false（有算過）且候選本身也在 T 裡（本身要屬於某個任務活動才有標的意義）的。
    OV = {}
    for rid, info in overlap.items():
        if info.get("no_gpx") or rid not in T:
            continue
        confirmed = [cid for cid in info.get("confirmed", []) if cid in T]
        OV[rid] = confirmed  # 空陣列也留著：代表「算過了，真的沒有其他重疊」

    # DC：鄉鎮市區中心點，給「附近任務」用，比舊版只有 22 縣市細很多。
    DC = build_district_centers(trails)

    js_ev = json.dumps(EV, ensure_ascii=False, separators=(",", ":"))
    js_t = json.dumps(T, ensure_ascii=False, separators=(",", ":"))
    js_ov = json.dumps(OV, ensure_ascii=False, separators=(",", ":"))
    js_dc = json.dumps(DC, ensure_ascii=False, separators=(",", ":"))
    stamp = datetime.date.today().isoformat()
    ver = bump_version()

    tpl = io.open(os.path.join(HERE, "userscript.tpl.js"), encoding="utf-8").read()
    out = (tpl.replace("__VERSION__", ver)
              .replace("__STAMP__", stamp)
              .replace("__EV__", js_ev)
              .replace("__T__", js_t)
              .replace("__OV__", js_ov)
              .replace("__DC__", js_dc))
    os.makedirs(os.path.dirname(OUT_REPO), exist_ok=True)
    for path in (OUT_LIVE, OUT_REPO):
        io.open(path, "w", encoding="utf-8", newline="\n").write(out)
    print("寫出 %s\n     %s\n  版本 %s / 活動 %d 個 / 路線 %d 條 / GPX精算長路線 %d 條 / 鄉鎮座標 %d 個 / %.1f KB"
          % (OUT_LIVE, OUT_REPO, ver, len(EV), len(T), len(OV), len(DC), len(out) / 1024.0))


if __name__ == "__main__":
    main()
