// ==UserScript==
// @name         健行筆記 活動/寶石任務提示
// @namespace    https://claudeD.local/hiking-biji
// @version      __VERSION__
// @description  在 hiking.biji.co 步道頁標出「這條路線屬於哪個線上活動」，提供附近縣市進行中任務清單，並彙整寶石任務頁「去過此路線」狀態與「我的軌跡」自動比對出的已去過路線。索引產生日：__STAMP__
// @author       lawyer413
// @match        https://hiking.biji.co/*
// @updateURL    https://raw.githubusercontent.com/charles0506/hiking-biji-event-badge/master/userscript/biji-event-badge.user.js
// @downloadURL  https://raw.githubusercontent.com/charles0506/hiking-biji-event-badge/master/userscript/biji-event-badge.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ---- 索引資料（由 D:\claudeD\hiking-biji\build_index.py + gen_userscript.py 產生）----
    // EV: [活動名, 起日, 迄日, 活動id, 顏色][]　顏色固定配給該活動 id，不同任務類型一眼看出來
    // T : { trailId: [名稱, 縣市, 連結, [EV索引,...]] }
    // OV: { 長路線trailId: [實際用GPX軌跡點比對確認過、真的路過的候選trailId,...] }
    //     由 build_overlap.py 抓官方GPX算距離產生，比單純比對行政區準；
    //     沒出現在 OV 裡的長路線代表還沒算過（新爬到的、或它自己沒有官方GPX），前端退回行政區猜測法。
    // DC: [鄉鎮市區名, 緯度, 經度][]　由 build_districts.py 查 Nominatim 產生，查不到的退回縣市中心點。
    var EV = __EV__;
    var T = __T__;
    var OV = __OV__;
    var DC = __DC__;

    var TODAY = new Date().toISOString().slice(0, 10);

    // 顏色＝哪個活動（任務類型），狀態改用透明度/邊框表示，兩種資訊不互相蓋掉。
    function evStatus(ev) {
        var start = ev[1], end = ev[2];
        if (!start || !end) return { label: '長期', cls: 'hst-long' };
        if (TODAY < start) return { label: '未開始 ' + start, cls: 'hst-soon' };
        if (TODAY > end) return { label: '已結束 ' + end, cls: 'hst-done' };
        return { label: '進行中 至' + end, cls: 'hst-live' };
    }

    // ---- 附近任務用的地點比對：鄉鎮市區層級（DC），僅本機比對，不外傳 ----
    function norm(s) { return s.replace(/臺/g, '台'); }

    function nearestDistrict(lat, lng) {
        var best = null, bestD = Infinity;
        DC.forEach(function (d) {
            var dLat = d[1] - lat, dLng = d[2] - lng;
            var dist = dLat * dLat + dLng * dLng;
            if (dist < bestD) { bestD = dist; best = d[0]; }
        });
        return best;
    }

    // 下拉選單照縣市分組（縣市名前 3 字一定固定），組內選項只顯示鄉鎮部分，短一點好選。
    function districtGroups() {
        var groups = {}, order = [];
        DC.forEach(function (d) {
            var name = d[0];
            var county = norm(name).slice(0, 3);
            if (!groups[county]) { groups[county] = []; order.push(county); }
            groups[county].push(name);
        });
        return order.map(function (county) { return [county, groups[county]]; });
    }

    // ---- CSS ----
    var style = document.createElement('style');
    style.textContent =
        '.hbadge-wrap{display:flex;flex-wrap:wrap;align-items:flex-start;' +
        'align-content:flex-start;gap:4px;margin:4px 0;min-height:0}' +
        '.hbadge{display:inline-block;align-self:flex-start;flex:0 0 auto;' +
        'font-size:11px;line-height:1.6;padding:1px 6px;height:auto;' +
        'border-radius:10px;color:#fff;white-space:nowrap;cursor:pointer;' +
        'text-decoration:none}' +
        '.hbadge:hover{filter:brightness(1.15);text-decoration:underline}' +
        // 徽章是 <a>，站上跟面板自己的「連結藍色」規則（例如 #hpanel-nearby a{color:#1a6fd1}）
        // 優先級比 .hbadge 高，會把白字蓋成藍字，深色底上根本看不到。文字色強制白色。
        'a.hbadge,a.hbadge:link,a.hbadge:visited,a.hbadge:hover,a.hbadge:active{color:#fff !important;text-shadow:0 1px 1px rgba(0,0,0,.35)}' +
        // 背景色＝哪個活動（inline style 直接指定，見 makeBadgeWrap）。
        // 這裡的 hst-* 只調狀態的「視覺份量」，不蓋掉顏色，兩種資訊分開看：
        '.hst-soon{opacity:.8;border:1px dashed rgba(255,255,255,.75)}' +
        '.hst-done{opacity:.45;filter:grayscale(55%)}' +
        '.hst-live{box-shadow:0 0 0 1px rgba(255,255,255,.5) inset}' +
        '#hbtn-nearby{position:fixed;right:18px;bottom:18px;z-index:99999;' +
        'background:#2e9e5b;color:#fff;border:none;border-radius:24px;' +
        'padding:10px 16px;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer}' +
        '#hpanel-nearby{position:fixed;right:18px;bottom:70px;z-index:99999;width:320px;' +
        'max-height:70vh;overflow:auto;background:#fff;color:#222;border-radius:8px;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.35);padding:10px;font-size:13px}' +
        '#hpanel-nearby h3{margin:0 0 6px;font-size:14px}' +
        '#hpanel-nearby .hp-item{padding:6px 0;border-top:1px solid #eee}' +
        '#hpanel-nearby a{color:#1a6fd1;text-decoration:none}' +
        '#hpanel-nearby a:hover{text-decoration:underline}' +
        '#hpanel-nearby .hp-close{float:right;cursor:pointer;color:#888}' +
        '#hpanel-nearby .hp-controls{display:flex;gap:6px;margin:6px 0 8px}' +
        '#hpanel-nearby .hp-note{display:block;color:#666;font-size:11px;line-height:1.5;margin:2px 0}' +
        '#hpanel-nearby .hp-more{width:100%;margin:8px 0 2px;padding:5px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#f5f5f5}' +
        '#hp-county-select{flex:1;padding:4px 6px;font-size:13px}' +
        '#hp-locate{flex:0 0 auto;padding:4px 8px;cursor:pointer;' +
        'border:1px solid #ccc;border-radius:4px;background:#f5f5f5}' +
        '#hp-locate:hover{background:#eee}' +
        '.hoverlap{margin:6px 0;font-size:13px;border:1px solid #e0e0e0;' +
        'border-radius:6px;padding:4px 8px;max-width:640px}' +
        '.hoverlap summary{cursor:pointer;color:#555;padding:4px 0}' +
        '.hoverlap-list{margin-top:4px;padding-top:4px;border-top:1px solid #eee}' +
        '.hoverlap-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:3px 0}' +
        '.hoverlap-row>a{color:#1a6fd1;text-decoration:none;flex:0 0 auto}' +
        '.hoverlap-row>a:hover{text-decoration:underline}' +
        // ---- 寶石任務頁「去過此路線」狀態彙整（hvt = hiking visited tracker）----
        // 浮動按鈕放左下角，跟右下角的「附近任務」分開，兩個面板不會疊在一起。
        '.hvt-chip{display:inline-block;font-size:11px;font-weight:bold;padding:1px 7px;' +
        'border-radius:9px;margin-bottom:3px;color:#fff}' +
        '#hbtn-visited{position:fixed;left:18px;bottom:18px;z-index:99999;' +
        'background:#1a6fd1;color:#fff;border:none;border-radius:24px;' +
        'padding:10px 16px;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer}' +
        '#hpanel-visited{position:fixed;left:18px;bottom:70px;z-index:99999;width:340px;' +
        'max-height:70vh;overflow:auto;background:#fff;color:#222;border-radius:8px;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.35);padding:10px;font-size:13px}' +
        '#hpanel-visited h3{margin:0 0 6px;font-size:14px}' +
        '#hpanel-visited .hp-close{float:right;cursor:pointer;color:#888}' +
        '#hpanel-visited .hv-tools{display:flex;gap:6px;margin:6px 0 8px;flex-wrap:wrap}' +
        '#hpanel-visited .hv-tools button{padding:4px 8px;cursor:pointer;' +
        'border:1px solid #ccc;border-radius:4px;background:#f5f5f5;font-size:12px}' +
        '#hpanel-visited .hv-tools button.active{background:#1a6fd1;color:#fff;border-color:#1a6fd1}' +
        '#hpanel-visited .hv-tools input{flex:1;min-width:110px;padding:4px 6px;' +
        'border:1px solid #ccc;border-radius:4px}' +
        '#hv-summary{color:#666;margin-bottom:6px}' +
        '.hv-row{padding:5px 0;border-top:1px solid #eee}' +
        '.hv-row a{color:#1a6fd1;text-decoration:none}' +
        '.hv-row a:hover{text-decoration:underline}' +
        '.hv-row small{color:#888}';
    document.head.appendChild(style);

    // trailUrl 給了：徽章直接連去「這條步道」本身（列表頁用，點了不用再往下滑找）。
    // 沒給（步道詳細頁自己標自己時）：徽章連去「活動專區」，方便看任務規則。
    function makeBadgeWrap(idxList, trailUrl) {
        var wrap = document.createElement('div');
        wrap.className = 'hbadge-wrap';
        idxList.forEach(function (i) {
            var ev = EV[i];
            if (!ev) return;
            var st = evStatus(ev);
            var b = document.createElement('a');
            b.className = 'hbadge ' + st.cls;
            b.style.background = ev[4]; // 每個活動固定一色，不同任務類型一眼分出來
            // 文字色直接寫在元素上（inline !important），站上/面板任何「連結藍色」樣式規則都蓋不掉，
            // 不靠樣式表優先級。深色底＋藍字看不到字就是被那種規則蓋的。
            b.style.setProperty('color', '#fff', 'important');
            b.dataset.hbadgeDone = '1'; // 防呆：別讓自己插的徽章又被當成步道連結重標一次
            b.href = trailUrl || ('https://hiking.biji.co/index.php?q=minisite&id=' + ev[3]);
            b.target = '_blank';
            b.rel = 'noopener noreferrer';
            b.title = ev[0] + '（' + (ev[1] || '長期') + ' ~ ' + (ev[2] || '') + '）' +
                (trailUrl ? '點開這條步道任務頁' : '點開活動專區頁');
            b.textContent = ev[0] + ' · ' + st.label;
            // 卡片本身通常包在另一個連結/可點區塊裡，點徽章要單獨開新分頁，別觸發外層導頁
            b.addEventListener('click', function (e) { e.stopPropagation(); });
            wrap.appendChild(b);
        });
        return wrap.childNodes.length ? wrap : null;
    }

    // ---- 沿途行政區推測 ----
    // 「陽明山東西大縱走」這種跨多區的長路線，官網只掛一個 trail id，
    // 個別掛在小百岳/百大底下的是七星山、大屯山、劍潭山…等各自獨立的 trail id，
    // 站上沒有「這條大路線＝由哪些小百岳組成」的關聯資料可以查。
    // 退而求其次：路過的行政區跟那些小百岳步道同一區，用行政區重疊抓出候選名單。
    // 純文字比對，不是真的路線疊圖，只在跨 2 個行政區以上的長路線才顯示，僅供參考。
    function districtOverlap(selfId) {
        var self = T[selfId];
        if (!self) return [];
        var districts = self[1].split(',').map(function (s) { return norm(s.trim()); }).filter(Boolean);
        if (districts.length < 2) return [];
        var out = [];
        Object.keys(T).forEach(function (tid) {
            if (tid === selfId) return;
            var rec = T[tid];
            var rd = rec[1].split(',').map(function (s) { return norm(s.trim()); });
            var hasHit = rd.some(function (d) { return districts.indexOf(d) !== -1; });
            if (hasHit) out.push(rec);
        });
        return out;
    }

    function renderOverlapPanel(selfId) {
        var precise = OV[selfId]; // 算過 GPX 的話這裡是陣列（可能是空陣列＝真的沒有）
        var list, summaryText;
        if (precise) {
            list = precise.map(function (id) { return T[id]; }).filter(Boolean);
            if (!list.length) return null; // GPX 精算過，確認真的沒有其他重疊，不用顯示
            summaryText = '🔍 沿途 GPX 軌跡比對，這些任務路線也在路上（' + list.length + ' 條）';
        } else {
            list = districtOverlap(selfId);
            if (!list.length) return null;
            summaryText = '🔍 沿途行政區可能還有這些任務路線（' + list.length + ' 條，還沒抓 GPX 精算，用行政區推測、非精確路線比對）';
        }
        var det = document.createElement('details');
        det.className = 'hoverlap';
        var sum = document.createElement('summary');
        sum.textContent = summaryText;
        det.appendChild(sum);
        var box = document.createElement('div');
        box.className = 'hoverlap-list';
        list.slice(0, 30).forEach(function (rec) {
            var row = document.createElement('div');
            row.className = 'hoverlap-row';
            var a = document.createElement('a');
            a.href = rec[2]; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.textContent = rec[0];
            // 這個連結也符合 tagLinksOnPage 的選擇器（步道詳細頁網址），旁邊的徽章已經
            // 手動掛好了，先標記掉，別讓它又被 tagLinksOnPage 當成新連結重複處理一次。
            a.dataset.hbadgeDone = '1';
            row.appendChild(a);
            var wrap = makeBadgeWrap(rec[3], rec[2]);
            if (wrap) row.appendChild(wrap);
            box.appendChild(row);
        });
        det.appendChild(box);
        return det;
    }

    // ---- 步道詳細頁：q=trail&act=detail&id=NNN ----
    function tagDetailPage() {
        var qs = new URLSearchParams(location.search);
        if (qs.get('q') !== 'trail' || qs.get('act') !== 'detail') return;
        var id = qs.get('id');
        if (!id || !T[id]) return;
        var h1 = document.querySelector('h1.text-3xl.font-bold') || document.querySelector('h1');
        if (!h1 || h1.dataset.hbadgeDone) return;
        h1.dataset.hbadgeDone = '1';
        var last = h1;
        var wrap = makeBadgeWrap(T[id][3]); // 已經在這條步道頁上了，連去活動專區
        if (wrap) { h1.insertAdjacentElement('afterend', wrap); last = wrap; }
        var overlap = renderOverlapPanel(id);
        if (overlap) last.insertAdjacentElement('afterend', overlap);
    }

    // ---- 任何頁面裡的步道卡片/連結（列表、搜尋、活動推薦區、GPX 軌跡頁引用的步道…）----
    // 同一張卡常見 2~3 個連結指到同一 id：包圖片的 photo-link（無文字）、
    // 標題文字連結（class="title" 或 "text-current"）、還有「路線資訊」按鈕（class 含 func-btn）。
    // 用黑名單排除圖片/按鈕連結，而不是白名單只認固定 class：
    // 站上很多地方（GPX 軌跡頁內文提到的步道、文章內連結…）連去步道頁的 <a> 根本沒 class，
    // 只用白名單會漏標這些地方。
    var SKIP_LINK_CLASSES = ['photo-link', 'func-btn', 'hbadge'];
    function tagLinksOnPage(withOverlap) {
        var anchors = document.querySelectorAll('a[href*="q=trail&act=detail&id="]');
        anchors.forEach(function (a) {
            if (a.dataset.hbadgeDone) return;
            // 徽章本身在「列表頁模式」下 href 也是步道詳細頁網址，會被同一個
            // querySelectorAll 選到 → 又幫徽章插徽章 → MutationObserver 偵測到新節點
            // 又觸發一輪 → 無限增生。用 class（hbadge）+ 祖先容器雙重擋掉。
            if (a.closest('.hbadge-wrap')) return;
            if (!a.textContent || !a.textContent.trim()) return; // 圖片連結，跳過
            var skip = SKIP_LINK_CLASSES.some(function (c) { return a.classList.contains(c); });
            if (skip) return;
            var m = a.getAttribute('href').match(/[?&]id=(\d+)/);
            if (!m) return;
            var id = m[1];
            if (!T[id]) return;
            a.dataset.hbadgeDone = '1';
            // 用站上這條連結本身的網址（不用 T 裡存的，跟頁面上顯示的完全一致）
            var wrap = makeBadgeWrap(T[id][3], a.href);
            var last = a;
            if (wrap) { a.insertAdjacentElement('afterend', wrap); last = wrap; }
            // GPX 軌跡頁通常只引用 1、2 條步道，順便列沿途行政區候選任務點；
            // 一般列表頁卡片很多，不開這個，不然每張卡都掛一大包，太吵。
            if (withOverlap) {
                var overlap = renderOverlapPanel(id);
                if (overlap) last.insertAdjacentElement('afterend', overlap);
            }
        });
    }

    // ---- 附近任務浮動按鈕 ----
    // 預設看「當下這一頁的步道」附近有哪些進行中的任務：
    //   步道詳細頁 → 直接讀該頁「所在縣市」；GPX 軌跡頁 → 用它引用的那條步道。
    // 沒有步道可參考的頁面（首頁、活動專區…）才退回下拉選單自己選鄉鎮市區。
    // 「附近」＝鄉鎮市區中心點距離 NEARBY_KM 以內（同鄉鎮優先），不是步道實際座標，僅供參考；
    // 該步道若有 GPX 精算過的「沿途任務路線」（OV），那幾條排最前面。
    var NEARBY_KM = 10;
    var DCMAP = {};
    DC.forEach(function (d) { DCMAP[norm(d[0])] = [d[1], d[2]]; });

    function activeEvIdx(idxList) {
        return idxList.filter(function (i) {
            var ev = EV[i];
            if (!ev) return false;
            var start = ev[1], end = ev[2];
            if (!start || !end) return true; // 長期任務
            return TODAY >= start && TODAY <= end;
        });
    }

    function splitDistricts(s) {
        return s.split(/[,，、]/).map(function (x) { return norm(x.trim()); }).filter(Boolean);
    }

    // 鄉鎮沒座標（DC 只收任務步道出現過的鄉鎮）就用同縣市已知鄉鎮的平均位置湊合。
    function centerOf(name) {
        var n = norm(name);
        if (DCMAP[n]) return DCMAP[n];
        var county = n.slice(0, 3), sx = 0, sy = 0, c = 0;
        DC.forEach(function (d) {
            if (norm(d[0]).slice(0, 3) === county) { sx += d[1]; sy += d[2]; c++; }
        });
        return c ? [sx / c, sy / c] : null;
    }

    function distKm(a, b) {
        var R = 6371, rad = Math.PI / 180;
        var dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
        var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.sqrt(h));
    }

    // 手動選鄉鎮市區：城市字串裡有這個鄉鎮名就算。
    function findNearbyTrails(district) {
        var nd = norm(district);
        var rows = [];
        Object.keys(T).forEach(function (tid) {
            var rec = T[tid]; // [名稱, 縣市, 連結, [EV索引,...]]
            if (norm(rec[1]).indexOf(nd) === -1) return;
            var idx = activeEvIdx(rec[3]);
            if (!idx.length) return;
            rows.push({ id: tid, name: rec[0], url: rec[2], idx: idx });
        });
        return rows;
    }

    // 以當下頁面的步道為中心找附近任務。km：-1＝GPX 確認路線上、0＝同鄉鎮、其餘＝鄉鎮中心點距離。
    function findNearPageTrails(ctx) {
        var mine = ctx.districts.map(function (d) { return { name: d, c: centerOf(d) }; });
        var confirmed = (ctx.id && OV[ctx.id]) ? OV[ctx.id] : [];
        var rows = [];
        Object.keys(T).forEach(function (tid) {
            if (tid === ctx.id) return;
            var rec = T[tid];
            var idx = activeEvIdx(rec[3]);
            if (!idx.length) return;
            var best = Infinity;
            splitDistricts(rec[1]).forEach(function (d) {
                var c = centerOf(d);
                mine.forEach(function (m) {
                    if (m.name === d) { best = 0; return; }
                    if (c && m.c) { var k = distKm(c, m.c); if (k < best) best = k; }
                });
            });
            var onRoute = confirmed.indexOf(tid) !== -1;
            if (!onRoute && best > NEARBY_KM) return;
            rows.push({ id: tid, name: rec[0], url: rec[2], idx: idx, km: onRoute ? -1 : best });
        });
        rows.sort(function (a, b) { return a.km - b.km || a.name.localeCompare(b.name); });
        return rows;
    }

    // 步道詳細頁有一行 <dt>所在縣市</dt><dd>臺北市士林區,新北市…</dd>
    function readLocationDd(root) {
        var dts = root.querySelectorAll('dt');
        for (var i = 0; i < dts.length; i++) {
            if (dts[i].textContent.trim() === '所在縣市') {
                var dd = dts[i].nextElementSibling;
                if (dd) return dd.textContent.trim();
            }
        }
        return '';
    }

    // 取得當下頁面對應的步道（名稱、id、所在鄉鎮）；不是步道相關頁面就給 null。
    function getPageContext(cb) {
        var qs = new URLSearchParams(location.search);
        if (qs.get('q') !== 'trail') { cb(null); return; }
        var act = qs.get('act'), id = null, name = '';
        if (act === 'detail') {
            id = qs.get('id');
            var h1 = document.querySelector('h1.text-3xl.font-bold') || document.querySelector('h1');
            name = h1 ? h1.textContent.trim() : '';
            var loc = readLocationDd(document);
            if (loc) { cb({ id: id, name: name, districts: splitDistricts(loc) }); return; }
        } else if (act === 'gpx_detail') {
            var links = document.querySelectorAll('a[href*="q=trail&act=detail&id="]');
            for (var i = 0; i < links.length; i++) {
                var a = links[i];
                if (a.closest('.hbadge-wrap, .hoverlap, #hpanel-nearby')) continue;
                var m = a.getAttribute('href').match(/[?&]id=(\d+)/);
                if (m) { id = m[1]; name = a.textContent.trim(); break; }
            }
        }
        if (!id) { cb(null); return; }
        if (T[id]) { cb({ id: id, name: name || T[id][0], districts: splitDistricts(T[id][1]) }); return; }
        // 不在任務索引裡的步道：同源抓那一頁，讀它的「所在縣市」
        fetch('/index.php?q=trail&act=detail&id=' + id, { credentials: 'same-origin' })
            .then(function (r) { return r.text(); })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var loc2 = readLocationDd(doc);
                cb(loc2 ? { id: id, name: name, districts: splitDistricts(loc2) } : null);
            })
            .catch(function () { cb(null); });
    }

    // 下拉選單照縣市分組、組內是鄉鎮；定位按鈕按了才問權限，不會一開面板就跳定位提示。
    function buildDistrictOptions(selected) {
        return districtGroups().map(function (g) {
            var county = g[0], names = g[1];
            var opts = names.map(function (name) {
                var label = name.indexOf(county) === 0 ? name.slice(county.length) : name;
                if (!label) label = name; // 純縣市層級（沒有鄉鎮後綴）的條目
                var sel = name === selected ? ' selected' : '';
                return '<option value="' + name + '"' + sel + '>' + label + '</option>';
            }).join('');
            return '<optgroup label="' + county + '">' + opts + '</optgroup>';
        }).join('');
    }

    // 列表用 DOM 組，標題連結先標記「已處理」、徽章自己掛，
    // 不然 tagLinksOnPage 會在面板裡的標題連結後面再多掛一排徽章。
    function renderRows(body, rows, noteFn) {
        body.textContent = '';
        rows.forEach(function (r) {
            var div = document.createElement('div');
            div.className = 'hp-item';
            var a = document.createElement('a');
            a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.textContent = r.name;
            a.dataset.hbadgeDone = '1';
            div.appendChild(a);
            if (noteFn) {
                var s = document.createElement('small');
                s.className = 'hp-note';
                s.textContent = noteFn(r);
                div.appendChild(s);
            }
            var wrap = makeBadgeWrap(r.idx, r.url);
            if (wrap) div.appendChild(wrap);
            body.appendChild(div);
        });
    }

    function showNearbyPanel() {
        var old = document.getElementById('hpanel-nearby');
        if (old) old.remove();
        var panel = document.createElement('div');
        panel.id = 'hpanel-nearby';
        panel.innerHTML =
            '<span class="hp-close">✕</span><h3>附近任務</h3>' +
            '<div class="hp-controls">' +
            '<select id="hp-district-select"></select>' +
            '<button type="button" id="hp-locate" title="用瀏覽器定位自動選地區">📍</button>' +
            '</div>' +
            '<div id="hp-body"><div>讀取本頁資訊…</div></div>';
        document.body.appendChild(panel);
        panel.querySelector('.hp-close').addEventListener('click', function () { panel.remove(); });

        var body = panel.querySelector('#hp-body');
        var select = panel.querySelector('#hp-district-select');

        getPageContext(function (ctx) {
            if (!panel.isConnected) return;
            var last = null;
            try { last = GM_getValue('hbiji_last_place', null); } catch (e) {}

            var head = ctx
                ? '<option value="__page__">本頁附近：' +
                  (ctx.name.length > 14 ? ctx.name.slice(0, 14) + '…' : ctx.name) + '</option>' +
                  '<option value="">── 改選其他鄉鎮市區 ──</option>'
                : '<option value="">請選擇鄉鎮市區…</option>';
            select.innerHTML = head + buildDistrictOptions(ctx ? '' : last);

            function renderFor(value) {
                if (value === '__page__') {
                    var rows = findNearPageTrails(ctx);
                    if (!rows.length) {
                        body.innerHTML = '<div>「' + ctx.name + '」' + NEARBY_KM + ' 公里內沒有進行中的任務。</div>';
                        return;
                    }
                    var noteFn = function (r) {
                        return r.km < 0 ? '🥾 路線上（GPX 比對）' : (r.km === 0 ? '同鄉鎮' : '約 ' + Math.round(r.km) + ' 公里');
                    };
                    var PAGE_SIZE = 20;
                    var paint = function (n) {
                        renderRows(body, rows.slice(0, n), noteFn);
                        var tip = document.createElement('div');
                        tip.className = 'hp-note';
                        tip.textContent = '以「' + ctx.name + '」所在鄉鎮（' + ctx.districts.join('、') + '）為準，' +
                            NEARBY_KM + ' 公里內共 ' + rows.length + ' 條，由近到遠；距離為鄉鎮中心點，僅供參考。';
                        body.insertBefore(tip, body.firstChild);
                        if (rows.length > n) {
                            var more = document.createElement('button');
                            more.type = 'button';
                            more.className = 'hp-more';
                            more.textContent = '顯示更多（還有 ' + (rows.length - n) + ' 條）';
                            more.addEventListener('click', function () { paint(n + PAGE_SIZE); });
                            body.appendChild(more);
                        }
                    };
                    paint(PAGE_SIZE);
                    return;
                }
                if (!value) {
                    body.innerHTML = '<div>選個鄉鎮市區，或按右邊 📍 用目前位置。</div>';
                    return;
                }
                var list = findNearbyTrails(value);
                if (!list.length) {
                    body.innerHTML = '<div>' + value + ' 目前沒有進行中的活動路線。</div>';
                    return;
                }
                renderRows(body, list, null);
            }

            select.addEventListener('change', function () {
                if (select.value && select.value !== '__page__') {
                    try { GM_setValue('hbiji_last_place', select.value); } catch (e) {}
                }
                renderFor(select.value);
            });

            panel.querySelector('#hp-locate').addEventListener('click', function () {
                if (!navigator.geolocation) {
                    body.innerHTML = '<div>瀏覽器不支援定位，手動選地區即可。</div>';
                    return;
                }
                body.innerHTML = '<div>定位中…</div>';
                navigator.geolocation.getCurrentPosition(function (pos) {
                    var district = nearestDistrict(pos.coords.latitude, pos.coords.longitude);
                    select.value = district;
                    try { GM_setValue('hbiji_last_place', district); } catch (e) {}
                    renderFor(district);
                }, function (err) {
                    body.innerHTML = '<div>定位失敗（' + err.message + '），手動選地區即可。</div>';
                }, { timeout: 8000 });
            });

            if (ctx) { select.value = '__page__'; renderFor('__page__'); }
            else { select.value = last || ''; renderFor(select.value); }
        });
    }

    function initNearbyButton() {
        if (document.getElementById('hbtn-nearby')) return;
        var btn = document.createElement('button');
        btn.id = 'hbtn-nearby';
        btn.textContent = '📍 附近任務';
        btn.addEventListener('click', function () {
            var open = document.getElementById('hpanel-nearby');
            if (open) { open.remove(); return; }
            showNearbyPanel();
        });
        document.body.appendChild(btn);
    }

    // ---- 寶石任務頁「去過此路線」狀態彙整 ----
    // 這個按鈕只出現在寶石任務頁（q=minisite&id=NNN）的路線清單上，未登入點下去
    // 是導去登入頁；登入後真正點擊會由站上自己的 AJAX 處理，這裡完全不碰那個
    // 請求，只讀 DOM 目前顯示的文字/圖示狀態，彙整成清單方便跨頁查看。
    var VISITED_DB_KEY = 'hbiji_visited_db';
    var VISITED_DONE_HINTS = ['已去過', '已完成', '已走過'];

    function loadVisitedDB() {
        try { return GM_getValue(VISITED_DB_KEY, {}); } catch (e) { return {}; }
    }
    function saveVisitedDB(db) {
        try { GM_setValue(VISITED_DB_KEY, db); } catch (e) {}
    }

    function isVisitedNode(span, icon) {
        var text = (span && span.textContent || '').trim();
        if (VISITED_DONE_HINTS.some(function (h) { return text.indexOf(h) !== -1; })) return true;
        var iconText = (icon && icon.textContent || '').trim();
        // 未去過固定用 flag 圖示；換成別的圖示（打勾之類）視為已去過
        if (iconText && iconText !== 'flag') return true;
        return false;
    }

    function scanVisitedCards() {
        var wraps = document.querySelectorAll('.func-wrap');
        if (!wraps.length) return;
        var qs = new URLSearchParams(location.search);
        var minisiteId = qs.get('id');
        var minisiteTitle = document.title.replace(/\s*-\s*健行筆記\s*$/, '').trim();
        var db = loadVisitedDB();
        var changed = false;

        wraps.forEach(function (wrap) {
            var btn = wrap.querySelector('.func_btn[data-id]');
            if (!btn) return;
            var trailId = btn.getAttribute('data-id');
            var span = btn.querySelector('span');
            var icon = btn.querySelector('i');
            var buttonDone = isVisitedNode(span, icon);

            var itemInfo = wrap.closest('.item-info') || wrap.parentElement;
            var titleLink = itemInfo ? itemInfo.querySelector('a.title') : null;
            var title = titleLink ? titleLink.textContent.trim() : (span ? span.textContent.trim() : trailId);
            var url = titleLink ? new URL(titleLink.getAttribute('href'), location.origin).href : null;
            var cityEl = itemInfo ? itemInfo.querySelector('.city') : null;
            var city = cityEl ? cityEl.textContent.trim() : '';

            var prev = db[trailId] || {};
            // GPX 軌跡才是準的——「去過此路線」按鈕是自己手動點的，點過不代表真的去過、
            // 沒點也不代表沒去過，不能當作真正的「已去過」依據，只能當參考/提醒用。
            var gpxDone = !!prev.doneGpx;
            var done = gpxDone;
            var mss = {};
            (prev.minisites || []).forEach(function (m) { mss[m] = true; });
            if (minisiteId) mss[minisiteId + ':' + minisiteTitle] = true;
            db[trailId] = {
                title: title || prev.title,
                url: url || prev.url,
                city: city || prev.city,
                done: done,
                doneGpx: gpxDone,
                doneButton: buttonDone,
                lastSeen: new Date().toISOString(),
                minisites: Object.keys(mss)
            };
            changed = true;

            if (!itemInfo) return;
            var stateKey = gpxDone ? 'gpx' : (buttonDone ? 'btn-only' : 'none');
            if (itemInfo.dataset.hvtDone === stateKey) return; // 狀態沒變就不重插 chip，避免 MutationObserver 迴圈
            itemInfo.dataset.hvtDone = stateKey;
            itemInfo.style.borderLeft = gpxDone ? '4px solid #2e9e5b' : (buttonDone ? '4px dashed #e0a300' : '4px solid #c62828');
            itemInfo.style.paddingLeft = '8px';
            var chip = itemInfo.querySelector('.hvt-chip');
            if (!chip) {
                chip = document.createElement('span');
                chip.className = 'hvt-chip';
                itemInfo.insertBefore(chip, itemInfo.firstChild);
            }
            chip.title = gpxDone ? '你上傳過符合這條路線的軌跡' :
                (buttonDone ? '站上按鈕顯示已去過，但目前掃不到對應的軌跡紀錄（可能沒上傳，或還沒開過「我的軌跡」頁讓腳本掃過）' : '');
            chip.textContent = gpxDone ? '✅ 已去過（軌跡佐證）' : (buttonDone ? '⚠️ 按鈕標記，無軌跡' : '⬜ 未去過');
            chip.style.background = gpxDone ? '#2e9e5b' : (buttonDone ? '#e0a300' : '#9e9e9e');
        });

        if (changed) saveVisitedDB(db);
    }

    // ---- 「我的軌跡」頁：用自己上傳過的 GPX 記錄反推「已去過」----
    // 軌跡標題是站上自動組出來的「（縣市－）活動名+路線名+時間戳」，中間沒有分隔符，
    // 縣市字首有沒有不一定（例如「基隆－台灣百大必訪步道...」），所以找活動名不能限定在
    // 開頭，整串裡找得到最長的已知活動名就切開來看；再去掉結尾 12 碼時間戳，剩下拿去對
    // T 的路線名清單找 id。兩邊都先用 norm() 把「臺」轉成「台」再比——站上同一個活動名，
    // 個人軌跡標題跟寶石任務頁用的是不同的字（「臺」/「台」），不轉的話對不起來。
    // 只在看得到「刪除」按鈕（.btn_remove）時才掃——代表在看自己的軌跡列表，
    // 不會把別人分享頁上的軌跡誤算成自己去過。
    var EV_BY_NAME_DESC = EV.map(function (ev, i) { return { name: norm(ev[0]), idx: i }; })
        .sort(function (a, b) { return b.name.length - a.name.length; });
    var T_NAME_INDEX = null;
    function trailIdByName(name) {
        if (!T_NAME_INDEX) {
            T_NAME_INDEX = {};
            Object.keys(T).forEach(function (id) { T_NAME_INDEX[norm(T[id][0])] = id; });
        }
        return T_NAME_INDEX[name];
    }

    // full 是一筆軌跡的標題文字（（縣市－）活動名+路線名+時間戳，或使用者自己改過的任意名稱）。
    // 解析失敗（找不到任何已知活動名、或路線名對不到 T）就安靜跳過，不影響其他筆。
    // 回傳 true 代表這筆讓資料庫多標了一條「已去過」（用來決定要不要 saveVisitedDB）。
    function applyGpxTitleToDB(full, db) {
        var remainder = norm(full.replace(/\d{12}$/, ''));
        var evName = null, evAt = -1;
        for (var i = 0; i < EV_BY_NAME_DESC.length; i++) {
            var pos = remainder.indexOf(EV_BY_NAME_DESC[i].name);
            if (pos !== -1) { evName = EV_BY_NAME_DESC[i].name; evAt = pos; break; }
        }
        if (!evName) return false;
        var routeName = remainder.slice(evAt + evName.length);
        var trailId = trailIdByName(routeName);
        if (!trailId) return false;

        var prev = db[trailId] || {};
        if (prev.doneGpx) return false; // 已經標過，不用重存
        db[trailId] = {
            title: prev.title || routeName,
            url: prev.url || (T[trailId] ? T[trailId][2] : null),
            city: prev.city || (T[trailId] ? T[trailId][1] : ''),
            done: true,
            doneGpx: true,
            doneButton: prev.doneButton || false,
            lastSeen: prev.lastSeen || new Date().toISOString(),
            minisites: prev.minisites || []
        };
        return true;
    }

    function scanMyGpxPage() {
        var qs = new URLSearchParams(location.search);
        if (qs.get('q') !== 'member' || qs.get('act') !== 'gpx') return;
        if (!document.querySelector('.btn_remove')) return; // 不是自己的軌跡列表，不猜

        // 記住自己的會員 id：之後在站上任何一頁都能背景同步「我的軌跡」，
        // 不用每次都手動跑回這頁翻頁。
        var selfId = qs.get('member');
        if (selfId) { try { GM_setValue('hbiji_self_id', selfId); } catch (e) {} }

        var items = document.querySelectorAll('li.member-ugc-item');
        if (!items.length) return;
        var db = loadVisitedDB();
        var changed = false;
        items.forEach(function (li) {
            var titleLink = li.querySelector('a.truncate');
            if (titleLink && applyGpxTitleToDB(titleLink.textContent.trim(), db)) changed = true;
        });
        if (changed) saveVisitedDB(db);
    }

    // ---- 背景同步「我的軌跡」全部分頁，上傳新軌跡後不用手動翻頁 ----
    // 用 fetch 直接打站上同一支頁面（同網域、帶登入 cookie，跟手動點分頁沒兩樣，
    // 不是另開一個帳號操作），解析回傳 HTML 抓標題，一頁一頁翻到抓不到資料為止。
    var GPX_SYNC_TS_KEY = 'hbiji_gpx_sync_ts';
    var GPX_SYNC_THROTTLE_MS = 30 * 60 * 1000; // 30 分鐘內背景同步過就不重打，避免每頁都發一輪請求

    function fetchGpxPageTitles(selfId, page) {
        return fetch('/index.php?q=member&act=gpx&member=' + selfId + '&page=' + page, { credentials: 'same-origin' })
            .then(function (res) { return res.ok ? res.text() : ''; })
            .then(function (html) {
                if (!html) return [];
                var doc = new DOMParser().parseFromString(html, 'text/html');
                if (!doc.querySelector('.btn_remove')) return []; // 保險：抓回來的不是自己看得到刪除鈕的頁面就不採用
                var links = doc.querySelectorAll('li.member-ugc-item a.truncate');
                return Array.prototype.map.call(links, function (a) { return a.textContent.trim(); });
            })
            .catch(function () { return []; });
    }

    function syncMyGpxAllPages(force) {
        var selfId = null;
        try { selfId = GM_getValue('hbiji_self_id', null); } catch (e) {}
        if (!selfId) return Promise.resolve({ synced: false, reason: 'unknown-self' });

        if (!force) {
            var lastTs = 0;
            try { lastTs = GM_getValue(GPX_SYNC_TS_KEY, 0); } catch (e) {}
            if (Date.now() - lastTs < GPX_SYNC_THROTTLE_MS) return Promise.resolve({ synced: false, reason: 'throttled' });
        }
        try { GM_setValue(GPX_SYNC_TS_KEY, Date.now()); } catch (e) {}

        var db = loadVisitedDB();
        var changed = false;
        var newlyMatched = 0;
        var MAX_PAGES = 40; // 安全上限，正常帳號用不到這麼多分頁

        function nextPage(page) {
            return fetchGpxPageTitles(selfId, page).then(function (titles) {
                if (!titles.length || page > MAX_PAGES) return page - 1;
                titles.forEach(function (t) {
                    if (applyGpxTitleToDB(t, db)) { changed = true; newlyMatched++; }
                });
                return nextPage(page + 1);
            });
        }

        return nextPage(1).then(function (lastPage) {
            if (changed) saveVisitedDB(db);
            return { synced: true, pages: lastPage, newlyMatched: newlyMatched };
        });
    }

    function showVisitedPanel() {
        var old = document.getElementById('hpanel-visited');
        if (old) { old.remove(); return; }
        var panel = document.createElement('div');
        panel.id = 'hpanel-visited';
        panel.innerHTML =
            '<span class="hp-close">✕</span><h3>去過紀錄（以軌跡為準）</h3>' +
            '<div id="hv-summary"></div>' +
            '<div class="hv-tools">' +
            '<button type="button" data-f="all" class="active">全部</button>' +
            '<button type="button" data-f="done">✅ 已去過</button>' +
            '<button type="button" data-f="flag">⚠️ 按鈕標記無軌跡</button>' +
            '<button type="button" data-f="todo">⬜ 未去過</button>' +
            '<input id="hv-search" placeholder="搜尋路線名稱…">' +
            '<button type="button" id="hv-sync">🔄 立即同步軌跡</button>' +
            '<button type="button" id="hv-export">匯出 JSON</button>' +
            '</div>' +
            '<div id="hv-list"></div>';
        document.body.appendChild(panel);
        panel.querySelector('.hp-close').addEventListener('click', function () { panel.remove(); });
        panel.querySelector('#hv-export').addEventListener('click', function () {
            var blob = new Blob([JSON.stringify(loadVisitedDB(), null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'hiking-biji-visited.json';
            a.click();
        });
        panel.querySelector('#hv-sync').addEventListener('click', function () {
            var syncBtn = panel.querySelector('#hv-sync');
            syncBtn.disabled = true;
            syncBtn.textContent = '同步中…';
            syncMyGpxAllPages(true).then(function (result) {
                syncBtn.disabled = false;
                syncBtn.textContent = '🔄 立即同步軌跡';
                if (!result.synced && result.reason === 'unknown-self') {
                    alert('還沒記住你的會員 id，先打開一次「我的軌跡」頁面（q=member&act=gpx）讓腳本認出來，之後才能在任何頁面按這顆按鈕同步。');
                    return;
                }
                render();
            });
        });

        var filter = 'all', keyword = '';
        panel.querySelectorAll('.hv-tools button[data-f]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                filter = btn.getAttribute('data-f');
                panel.querySelectorAll('.hv-tools button[data-f]').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                render();
            });
        });
        panel.querySelector('#hv-search').addEventListener('input', function (e) {
            keyword = e.target.value.trim();
            render();
        });

        function render() {
            var db = loadVisitedDB();
            var rows = Object.keys(db).map(function (id) {
                var r = db[id]; r.id = id; return r;
            }).sort(function (a, b) { return (a.title || '').localeCompare(b.title || '', 'zh-Hant'); });
            var doneCount = rows.filter(function (r) { return r.done; }).length;
            var flagCount = rows.filter(function (r) { return !r.done && r.doneButton; }).length;
            panel.querySelector('#hv-summary').textContent =
                '收錄 ' + rows.length + ' 條路線，✅ 軌跡確認已去過 ' + doneCount + ' 條' +
                (flagCount ? '，⚠️ 按鈕標記但沒軌跡 ' + flagCount + ' 條' : '');
            var list = panel.querySelector('#hv-list');
            list.innerHTML = '';
            rows
                .filter(function (r) {
                    if (filter === 'done') return r.done;
                    if (filter === 'flag') return !r.done && r.doneButton;
                    if (filter === 'todo') return !r.done && !r.doneButton;
                    return true;
                })
                .filter(function (r) { return !keyword || (r.title || '').indexOf(keyword) !== -1; })
                .forEach(function (r) {
                    var row = document.createElement('div');
                    row.className = 'hv-row';
                    var msNames = (r.minisites || []).map(function (m) { return m.split(':').slice(1).join(':'); }).join('、');
                    var mark = r.done ? '✅' : (r.doneButton ? '⚠️' : '⬜');
                    row.innerHTML =
                        mark + ' <a href="' + (r.url || '#') + '" target="_blank" rel="noopener">' +
                        r.title + '</a><br><small>' + (r.city || '') +
                        (msNames ? '｜來自：' + msNames : '') + '</small>';
                    list.appendChild(row);
                });
        }
        render();
    }

    function initVisitedButton() {
        if (document.getElementById('hbtn-visited')) return;
        var btn = document.createElement('button');
        btn.id = 'hbtn-visited';
        btn.textContent = '✅ 去過紀錄';
        btn.addEventListener('click', showVisitedPanel);
        document.body.appendChild(btn);
    }

    function run() {
        var qs = new URLSearchParams(location.search);
        var isGpxDetail = qs.get('q') === 'trail' && qs.get('act') === 'gpx_detail';
        tagDetailPage();
        tagLinksOnPage(isGpxDetail);
        initNearbyButton();
        scanVisitedCards();
        scanMyGpxPage();
        initVisitedButton();
        syncMyGpxAllPages(false); // 背景節流同步，不管現在在站上哪一頁；沒記住 id 或還沒過節流時間就直接跳過
    }

    run();
    // 站上多用 ajax 局部刷新（分頁/篩選），用 MutationObserver 補標
    var mo = new MutationObserver(function () {
        clearTimeout(window.__hbijaT);
        window.__hbijaT = setTimeout(run, 300);
    });
    mo.observe(document.body, { childList: true, subtree: true });
})();
