# -*- coding: utf-8 -*-
"""
把「行政區重疊」升級成「GPX 軌跡實際重疊」。

跨多個行政區的長路線（東西大縱走、淡蘭古道各段、台北大縱走各段…），
原本用行政區字串比對抓候選，噪音很大（同區但沒真的路過的健走趣打卡點也會混進來）。

這支改用官方 GPX 軌跡點實際距離判斷：
1. 找出 trails.json 裡跨 2 個以上行政區的「長路線」。
2. 每條長路線先用行政區重疊抓候選（跟之前一樣，當粗篩）。
3. 對每個候選，抓它自己的官方 GPX，取樣後跟長路線的 GPX 算最近距離，
   250 公尺內算「同一點」，候選取樣點裡有 >=50% 落在長路線 250 公尺內才算真的有重疊。
4. GPX 開一次快取一次（trail_gpx_cache.json），同一條步道被很多條長路線候選到也只抓一次。

輸出 overlap.json： { 長路線trail_id: { "confirmed": [候選trail_id,...], "no_gpx": bool } }
"no_gpx": true 表示這條長路線自己沒有官方 GPX 可比對，前端該退回舊的行政區提示並加註「未精算」。

跑一次要抓不少步道頁 + GPX（可能 4~500 條），會花幾分鐘，有做快取，中斷重跑不會整個重來。
"""
import io
import json
import math
import os
import re
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
BASE = "https://hiking.biji.co"
CACHE_FILE = os.path.join(HERE, "trail_gpx_cache.json")
OUT_FILE = os.path.join(HERE, "overlap.json")
THRESH_M = 250        # 幾公尺內算「同一點」
HIT_RATIO = 0.5        # 候選取樣點裡至少要有這個比例落在門檻內
SAMPLE_EVERY = 8       # GPX 每隔幾個 trkpt 取一點（原始通常上千點，取樣夠用又省時間）
MIN_SAMPLE_PTS = 3     # 候選取樣點太少（極短步道）不可靠，至少要有這麼多點才判定


def get(url, timeout=25):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


def norm(s):
    return s.replace("臺", "台")


def load_json(path, default):
    if os.path.exists(path):
        with io.open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def save_json(path, data):
    with io.open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


def gpx_url_for_trail(trail_id):
    html = get("%s/index.php?q=trail&act=detail&id=%s" % (BASE, trail_id)).decode("utf-8", "replace")
    m = re.search(r'data-value="(https://cdntwrunning\.biji\.co/hiking_gpx/[^"]+\.gpx)"', html)
    return m.group(1) if m else None


def parse_trkpts(gpx_bytes, sample_every=SAMPLE_EVERY):
    text = gpx_bytes.decode("utf-8", "replace")
    pts = []
    for i, m in enumerate(re.finditer(r'<trkpt lat="([\d.\-]+)" lon="([\d.\-]+)"', text)):
        if i % sample_every == 0:
            pts.append((float(m.group(1)), float(m.group(2))))
    return pts


def haversine_m(p1, p2):
    lat1, lon1 = p1
    lat2, lon2 = p2
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def min_dist_under(pt, route_pts, cutoff):
    for rp in route_pts:
        if haversine_m(pt, rp) < cutoff:
            return True
    return False


class GpxCache(object):
    """trail_id -> {"url": str|None, "pts": [[lat,lon],...]|None}；None 代表試過但沒有。"""

    def __init__(self):
        self.data = load_json(CACHE_FILE, {})
        self.dirty = 0

    def get_points(self, trail_id):
        entry = self.data.get(trail_id)
        if entry is not None:
            return entry.get("pts")
        url = None
        pts = None
        try:
            url = gpx_url_for_trail(trail_id)
            if url:
                pts = parse_trkpts(get(url))
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            print("    [%s] 抓失敗: %s" % (trail_id, e))
        self.data[trail_id] = {"url": url, "pts": pts}
        self.dirty += 1
        if self.dirty % 10 == 0:
            save_json(CACHE_FILE, self.data)
        time.sleep(0.15)
        return pts

    def flush(self):
        save_json(CACHE_FILE, self.data)


def main():
    trails = load_json(os.path.join(HERE, "trails.json"), {})
    routes = {tid: rec for tid, rec in trails.items() if len(rec["city"].split(",")) >= 2}
    print("跨區長路線候選數:", len(routes))

    cache = GpxCache()
    overlap = load_json(OUT_FILE, {})

    # 預先算每個行政區有哪些 trail_id（避免每條長路線都整個 dict 掃一輪）
    district_index = {}
    for tid, rec in trails.items():
        for c in rec["city"].split(","):
            c = norm(c.strip())
            if c:
                district_index.setdefault(c, set()).add(tid)

    done = 0
    for rid, rrec in routes.items():
        done += 1
        if rid in overlap:
            continue  # 已經算過，跳過（可重跑續算）
        print("[%d/%d] %s %s" % (done, len(routes), rid, rrec["name"]))
        r_pts = cache.get_points(rid)
        if not r_pts:
            overlap[rid] = {"confirmed": [], "no_gpx": True}
            save_json(OUT_FILE, overlap)
            continue

        r_districts = set(norm(c.strip()) for c in rrec["city"].split(","))
        candidate_ids = set()
        for d in r_districts:
            candidate_ids |= district_index.get(d, set())
        candidate_ids.discard(rid)

        confirmed = []
        for cid in sorted(candidate_ids):
            c_pts = cache.get_points(cid)
            if not c_pts or len(c_pts) < MIN_SAMPLE_PTS:
                continue
            hit = sum(1 for p in c_pts if min_dist_under(p, r_pts, THRESH_M))
            ratio = hit / float(len(c_pts))
            if ratio >= HIT_RATIO:
                confirmed.append(cid)
        overlap[rid] = {"confirmed": confirmed, "no_gpx": False}
        print("   -> 確認 %d / 候選 %d" % (len(confirmed), len(candidate_ids)))
        save_json(OUT_FILE, overlap)

    cache.flush()
    print("\n完成。overlap.json 共 %d 條長路線的結果。" % len(overlap))


if __name__ == "__main__":
    main()
