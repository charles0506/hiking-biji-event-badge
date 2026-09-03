# hiking-biji 活動任務徽章

給 [健行筆記 hiking.biji.co](https://hiking.biji.co) 用的 userscript：逛步道頁時直接標出「這條路線屬於哪個線上活動任務」，
省去自己對照活動辦法頁面的功夫。

## 這個 repo 裡有什麼

```
build_index.py       爬活動列表 + 各活動專區頁，產出 events.json / trails.json
build_overlap.py      跨區長路線用官方 GPX 軌跡點算真的路過哪些任務步道，產出 overlap.json
gen_userscript.py     把上面幾份 json 打包進 userscript.tpl.js，輸出成 userscript/biji-event-badge.user.js
userscript.tpl.js     userscript 原始模板（含 __EV__/__T__/__OV__ 佔位字串）
lookup.py             命令列查詢：這條路線屬於哪個活動、附近有哪些進行中任務
events.json           活動清單快照
trails.json           路線 → 活動反查表快照
overlap.json          GPX 精算過的長路線重疊結果快照
userscript/           實際安裝用的 .user.js 成品 + 使用說明
```

`events.json` / `trails.json` / `overlap.json` 是最近一次爬蟲結果的快照，方便直接看資料或重新打包，
不想等爬蟲跑完也可以先用這幾份。真的要更新內容才需要重爬。

## 安裝

Tampermonkey / Violentmonkey 匯入 [`userscript/biji-event-badge.user.js`](userscript/biji-event-badge.user.js)。
功能說明見 [`userscript/README.md`](userscript/README.md)。

## 重新產生索引

```bash
python build_index.py      # 重爬活動列表 + 專區頁
python build_overlap.py    # 跨區長路線的 GPX 精算（有快取，續跑不用整份重來）
python gen_userscript.py   # 打包成 userscript/biji-event-badge.user.js
```

`build_overlap.py` 會在本機另外存一份 `trail_gpx_cache.json`（GPX 原始軌跡點快取，體積較大，`.gitignore` 掉了，
不影響重新產生索引，只是重跑會重新抓一次）。

## 怎麼做到「精準比對沿途任務」

見 [`userscript/README.md`](userscript/README.md#沿途任務路線怎麼算的) 完整說明：先用行政區粗篩候選，
再抓官方 GPX 軌跡點實際算距離（250 公尺內），確認真的路過才列出來，不是單純比對縣市名稱。

## 已知限制

見 [`userscript/README.md`](userscript/README.md#已知限制)。
