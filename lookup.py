# -*- coding: utf-8 -*-
"""
查某條路線屬於哪些健行筆記線上活動。

用法:
  python lookup.py 大屯山
  python lookup.py 臺北大縱走第二段
  python lookup.py --id 1466
  python lookup.py --events            # 列出所有活動 + 路線數
"""
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TODAY = datetime.date.today().isoformat()


def load(n):
    with open(os.path.join(HERE, n), encoding="utf-8") as f:
        return json.load(f)


def active(period):
    if not period or "~" not in period:
        return True  # 長期專區，視為有效
    a, b = [x.strip() for x in period.split("~")]
    return a <= TODAY <= b


def show(rec):
    print("\n%s  (trail id %s)" % (rec["name"], rec["trail_id"]))
    print("  %s | %s" % (rec["city"], rec["info"]))
    print("  %s" % rec["url"])
    for ev in rec["events"]:
        flag = "進行中" if active(ev["period"]) else "已結束"
        print("  -> [%s] %s  %s" % (flag, ev["name"], ev["period"] or "長期"))


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    if args[0] == "--events":
        for ev in sorted(load("events.json"), key=lambda e: -len(e["trails"])):
            print("%3d 條  %-40s %s" % (len(ev["trails"]), ev["name"], ev["period"] or "長期"))
        return

    trails = load("trails.json")
    if args[0] == "--id":
        rec = trails.get(args[1])
        if rec:
            show(rec)
        else:
            print("查無 trail id %s（可能不在任何活動裡）" % args[1])
        return

    kw = " ".join(args)
    hits = [r for r in trails.values() if kw in r["name"] or kw in r["city"]]
    if not hits:
        print("沒有活動路線名稱包含「%s」" % kw)
        return
    for r in sorted(hits, key=lambda r: r["trail_id"]):
        show(r)


if __name__ == "__main__":
    main()
