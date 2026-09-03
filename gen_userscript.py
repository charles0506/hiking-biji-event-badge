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
# ——活動清單改順序、增減都不會讓既有活動的顏色跳來跳去。挑的都是白字看得清楚的中彩度色。
COLOR_PALETTE = [
    "#2e9e5b", "#3577c9", "#d35400", "#8e44ad", "#c0392b",
    "#16a085", "#b7950b", "#34495e", "#2980b9", "#27ae60",
    "#a04000", "#6c3483", "#117864", "#922b21", "#7d6608",
    "#1a5276", "#af601a", "#4a235a", "#0e6655", "#78281f",
    "#1e8449", "#2471a3", "#ca6f1e", "#7d3c98", "#b03a2e",
    "#138d75", "#9a7d0a", "#5d6d7e", "#1f618d", "#229954",
    "#873600", "#5b2c6f", "#0b5345", "#943126", "#7e5109",
]  # 35 色，35 個活動以內都能拿到獨一無二的顏色


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

    js_ev = json.dumps(EV, ensure_ascii=False, separators=(",", ":"))
    js_t = json.dumps(T, ensure_ascii=False, separators=(",", ":"))
    js_ov = json.dumps(OV, ensure_ascii=False, separators=(",", ":"))
    stamp = datetime.date.today().isoformat()
    ver = bump_version()

    tpl = io.open(os.path.join(HERE, "userscript.tpl.js"), encoding="utf-8").read()
    out = (tpl.replace("__VERSION__", ver)
              .replace("__STAMP__", stamp)
              .replace("__EV__", js_ev)
              .replace("__T__", js_t)
              .replace("__OV__", js_ov))
    os.makedirs(os.path.dirname(OUT_REPO), exist_ok=True)
    for path in (OUT_LIVE, OUT_REPO):
        io.open(path, "w", encoding="utf-8", newline="\n").write(out)
    print("寫出 %s\n     %s\n  版本 %s / 活動 %d 個 / 路線 %d 條 / GPX精算長路線 %d 條 / %.1f KB"
          % (OUT_LIVE, OUT_REPO, ver, len(EV), len(T), len(OV), len(out) / 1024.0))


if __name__ == "__main__":
    main()
