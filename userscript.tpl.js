// ==UserScript==
// @name         健行筆記 活動/寶石任務提示
// @namespace    https://claudeD.local/hiking-biji
// @version      __VERSION__
// @description  在 hiking.biji.co 步道頁標出「這條路線屬於哪個線上活動」，並提供附近縣市進行中任務清單。索引產生日：__STAMP__
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
    var EV = __EV__;
    var T = __T__;
    var OV = __OV__;

    var TODAY = new Date().toISOString().slice(0, 10);

    // 顏色＝哪個活動（任務類型），狀態改用透明度/邊框表示，兩種資訊不互相蓋掉。
    function evStatus(ev) {
        var start = ev[1], end = ev[2];
        if (!start || !end) return { label: '長期', cls: 'hst-long' };
        if (TODAY < start) return { label: '未開始 ' + start, cls: 'hst-soon' };
        if (TODAY > end) return { label: '已結束 ' + end, cls: 'hst-done' };
        return { label: '進行中 至' + end, cls: 'hst-live' };
    }

    // ---- 台灣縣市概略中心點（給「附近任務」粗略比對用，僅本機比對，不外傳）----
    var COUNTY_CENTER = [
        ['台北市', 25.0330, 121.5654], ['新北市', 25.0169, 121.4628],
        ['基隆市', 25.1276, 121.7392], ['宜蘭縣', 24.7021, 121.7378],
        ['桃園市', 24.9936, 121.3010], ['新竹市', 24.8138, 120.9675],
        ['新竹縣', 24.8387, 121.0177], ['苗栗縣', 24.5602, 120.8214],
        ['台中市', 24.1477, 120.6736], ['彰化縣', 24.0518, 120.5161],
        ['南投縣', 23.9609, 120.9718], ['雲林縣', 23.7092, 120.4313],
        ['嘉義市', 23.4801, 120.4491], ['嘉義縣', 23.4518, 120.2555],
        ['台南市', 22.9998, 120.2269], ['高雄市', 22.6273, 120.3014],
        ['屏東縣', 22.5519, 120.5487], ['台東縣', 22.7583, 121.1444],
        ['花蓮縣', 23.9871, 121.6015], ['澎湖縣', 23.5711, 119.5793],
        ['金門縣', 24.4491, 118.3766], ['連江縣', 26.1505, 119.9297]
    ];

    function norm(s) { return s.replace(/臺/g, '台'); }

    function nearestCounty(lat, lng) {
        var best = null, bestD = Infinity;
        COUNTY_CENTER.forEach(function (c) {
            var dLat = c[1] - lat, dLng = c[2] - lng;
            var d = dLat * dLat + dLng * dLng;
            if (d < bestD) { bestD = d; best = c[0]; }
        });
        return best;
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
        '.hoverlap{margin:6px 0;font-size:13px;border:1px solid #e0e0e0;' +
        'border-radius:6px;padding:4px 8px;max-width:640px}' +
        '.hoverlap summary{cursor:pointer;color:#555;padding:4px 0}' +
        '.hoverlap-list{margin-top:4px;padding-top:4px;border-top:1px solid #eee}' +
        '.hoverlap-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:3px 0}' +
        '.hoverlap-row>a{color:#1a6fd1;text-decoration:none;flex:0 0 auto}' +
        '.hoverlap-row>a:hover{text-decoration:underline}';
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

    // ---- 附近任務浮動按鈕：直接查索引，跟目前在哪一頁無關 ----
    function activeEvIdx(idxList) {
        return idxList.filter(function (i) {
            var ev = EV[i];
            if (!ev) return false;
            var start = ev[1], end = ev[2];
            if (!start || !end) return true; // 長期任務
            return TODAY >= start && TODAY <= end;
        });
    }

    function findNearbyTrails(county) {
        var nc = norm(county);
        var rows = [];
        Object.keys(T).forEach(function (tid) {
            var rec = T[tid]; // [名稱, 縣市, 連結, [EV索引,...]]
            if (norm(rec[1]).indexOf(nc) === -1) return;
            var idx = activeEvIdx(rec[3]);
            if (!idx.length) return;
            rows.push({ name: rec[0], url: rec[2], evs: idx.map(function (i) { return EV[i][0]; }) });
        });
        return rows;
    }

    function showNearbyPanel(county, statusMsg) {
        var old = document.getElementById('hpanel-nearby');
        if (old) old.remove();
        var panel = document.createElement('div');
        panel.id = 'hpanel-nearby';
        var html = '<span class="hp-close">✕</span><h3>附近任務：' + (county || '未知') + '</h3>';
        if (statusMsg) {
            html += '<div>' + statusMsg + '</div>';
        } else {
            var list = findNearbyTrails(county);
            if (!list.length) {
                html += '<div>' + county + ' 目前沒有進行中的活動路線。</div>';
            } else {
                list.forEach(function (r) {
                    html += '<div class="hp-item"><a href="' + r.url + '" target="_blank" rel="noopener">' + r.name + '</a><br><small>' + r.evs.join('、') + '</small></div>';
                });
            }
        }
        panel.innerHTML = html;
        document.body.appendChild(panel);
        panel.querySelector('.hp-close').addEventListener('click', function () { panel.remove(); });
    }

    function initNearbyButton() {
        if (document.getElementById('hbtn-nearby')) return;
        var btn = document.createElement('button');
        btn.id = 'hbtn-nearby';
        btn.textContent = '📍 附近任務';
        btn.addEventListener('click', function () {
            if (!navigator.geolocation) {
                showNearbyPanel('', '瀏覽器不支援定位。');
                return;
            }
            showNearbyPanel('', '定位中…');
            navigator.geolocation.getCurrentPosition(function (pos) {
                var county = nearestCounty(pos.coords.latitude, pos.coords.longitude);
                try { GM_setValue('hbiji_last_county', county); } catch (e) {}
                showNearbyPanel(county);
            }, function (err) {
                var last = null;
                try { last = GM_getValue('hbiji_last_county', null); } catch (e) {}
                showNearbyPanel(last || '', '定位失敗（' + err.message + '）。已標出頁面上有活動的路線，自行比對縣市。');
            }, { timeout: 8000 });
        });
        document.body.appendChild(btn);
    }

    function run() {
        var qs = new URLSearchParams(location.search);
        var isGpxDetail = qs.get('q') === 'trail' && qs.get('act') === 'gpx_detail';
        tagDetailPage();
        tagLinksOnPage(isGpxDetail);
        initNearbyButton();
    }

    run();
    // 站上多用 ajax 局部刷新（分頁/篩選），用 MutationObserver 補標
    var mo = new MutationObserver(function () {
        clearTimeout(window.__hbijaT);
        window.__hbijaT = setTimeout(run, 300);
    });
    mo.observe(document.body, { childList: true, subtree: true });
})();
