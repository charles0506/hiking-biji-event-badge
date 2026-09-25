// ==UserScript==
// @name         健行筆記 活動/寶石任務提示
// @namespace    https://claudeD.local/hiking-biji
// @version      1.0.29
// @description  在 hiking.biji.co 步道頁標出「這條路線屬於哪個線上活動」，提供附近縣市進行中任務清單，並彙整寶石任務頁「去過此路線」狀態與「我的軌跡」自動比對出的已去過路線。索引產生日：2026-09-25
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
    var EV = [["克寧生醫 UC-II 健行月","2026-09-01","2026-10-31",329,"#a81818"],["2026微笑山線大縱走尋寶集章任務","2026-07-01","2027-04-30",321,"#5729e0"],["2026森遊竹縣 皮皮獅動物派對","2026-06-24","2026-10-31",323,"#941594"],["2026臺北健走趣","2026-05-25","2026-10-25",326,"#9b167a"],["2026 花蓮山海騎遇記 | Hualien Ride Journal","2026-03-20","2026-10-31",322,"#8819ae"],["2026臺北大縱走","2026-02-26","2026-12-31",318,"#1d47c8"],["山海圳・八田與一的水之路","2026-02-01","2027-12-31",316,"#0e6138"],["樟之細路｜尋寶任務","2026-03-09","2027-12-31",317,"#0e604c"],["淡蘭古道尋寶任務","2024-05-15","2026-12-31",272,"#0e630e"],["小百岳集起來","2020-04-04","2026-12-31",143,"#23610e"],["台灣百大必訪步道","2020-08-01","2026-12-31",186,"#751dcc"],["2025臺北健走趣","2025-05-19","2025-10-19",308,"#365f0e"],["2024臺北健走趣","2024-06-25","2024-10-25",285,"#155696"],["親子登山玩樂趣 親子路線推薦","","",273,"#0e6223"],["樟之細路專區","","",223,"#a5183b"],["淡蘭古道中路","","",139,"#68520f"],["淡蘭古道北路","","",50,"#7d4812"],["西班牙朝聖之路－法國之路","","",80,"#3737e2"],["南澳區","","",204,"#115c75"],["谷關區","","",132,"#0d5e5e"],["霧社能高區","","",142,"#a1175c"],["里佳達邦區","","",146,"#58580d"],["光復瑞穗","","",155,"#485c0d"]];
    var T = {"1397":["燦光寮古徑","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1397",[16]],"1398":["楊廷理古徑","新北市雙溪區,新北市貢寮區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1398",[16]],"1399":["入蘭正道","新北市瑞芳區,新北市貢寮區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1399",[16]],"1423":["淡蘭古道北路全段","新北市瑞芳區,新北市雙溪區,新北市貢寮區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1423",[16]],"1445":["苧仔潭古道(官方指南)","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1445",[16]],"1446":["琉榔路步道(官方指南)","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1446",[16]],"1447":["樹梅坪古道(官方指南)","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1447",[16]],"1448":["燦光寮古道(官方指南)","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1448",[16]],"1449":["楊廷理古道(官方指南)","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1449",[16]],"1450":["嶐嶺古道(官方指南)","新北市瑞芳區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1450",[16]],"1451":["金字碑古道(官方指南)","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1451",[16]],"1452":["草嶺古道(官方指南)","新北市貢寮區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1452",[16]],"1480":["法國之路（D1）Saint-Jean-Pied-de-Port－Roncesvalles","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1480",[17]],"1481":["法國之路（D2）Roncesvalles－Zubiri","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1481",[17]],"1482":["法國之路（D3）Zubiri－Pamplona","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1482",[17]],"1483":["法國之路（D4）Pamplona－Puente la Reina","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1483",[17]],"1531":["法國之路（D5）Puente la Reina－Estella","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1531",[17]],"1532":["法國之路（D6）Estella－Los Arcos","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1532",[17]],"1533":["法國之路（D7）Los Arcos－Logroño","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1533",[17]],"1534":["法國之路（D8）Logroño－Nàjera","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1534",[17]],"1535":["法國之路（D9）Nàjera－Santo Domingo de la Calzada","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1535",[17]],"1536":["法國之路（D10）Santo Domingo de la Calzada－Belorado","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1536",[17]],"1545":["法國之路（D11）Belorado－San Juan de Ortega","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1545",[17]],"1546":["法國之路（D12）San Juan de Ortega－Burgos","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1546",[17]],"1547":["法國之路（D13）Burgos－Hornillos del Camino","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1547",[17]],"1548":["法國之路（D14）Hornillos del Camino－Castrojeriz","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1548",[17]],"1549":["法國之路（D15）Castrojeriz－Frómista","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1549",[17]],"1550":["法國之路（D16）Frómista－Carrión de los Condes","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1550",[17]],"1551":["法國之路（D17）Carrión de los Condes－Terradillos de los Templarios","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1551",[17]],"1552":["法國之路（D18）Terradillos de los Templarios－Bercianos del Real Camino","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1552",[17]],"1553":["法國之路（D19）Bercianos del Real Camino－Mansilla de las Mulas","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1553",[17]],"1554":["法國之路（D20）Mansilla de las Mulas－León","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1554",[17]],"1555":["法國之路（D21）León－Villadangos del Páramo","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1555",[17]],"1556":["法國之路（D22）Villadangos del Páramo－Astorga","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1556",[17]],"1557":["法國之路（D23）Astorga－Rabanal del Camino","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1557",[17]],"1558":["法國之路（D24）Rabanal del Camino－Molinaseca","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1558",[17]],"1559":["法國之路（D25）Molinaseca－Villafranca del Bierzo","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1559",[17]],"1560":["法國之路（D26）Villafranca del Bierzo－O'Cebreiro","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1560",[17]],"1561":["法國之路（D27）O'Cebreiro－Triacastela","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1561",[17]],"1562":["法國之路（D28）Triacastela－Sarria","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1562",[17]],"1563":["法國之路（D29）Sarria－Portomarín","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1563",[17]],"1564":["法國之路（D30）Portomarín－Palas de Rei","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1564",[17]],"1565":["法國之路（D31）Palas do Rei－Ribadiso","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1565",[17]],"1566":["法國之路（D32）Ribadiso－Pedrouzo","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1566",[17]],"1567":["法國之路（D33）Pedrouzo－Santiago","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1567",[17]],"1652":["西班牙朝聖之路－法國之路","西班牙","https://hiking.biji.co/index.php?q=trail&act=detail&id=1652",[17]],"259":["八仙山主峰步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=259",[19]],"260":["八仙山國家森林遊樂區步道群","台中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=260",[19]],"261":["德芙蘭步道","台中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=261",[19]],"263":["唐麻丹山步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=263",[19]],"265":["東卯山步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=265",[10,19]],"266":["白毛山步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=266",[19]],"267":["馬崙山步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=267",[19]],"268":["屋我尾山步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=268",[19]],"271":["波津加山步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=271",[19]],"272":["斯可巴步道","台中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=272",[19]],"571":["阿冷山山徑","台中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=571",[19]],"1472":["捎來步道","台中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1472",[19]],"115":["五分山步道","基隆市暖暖區,新北市瑞芳區,新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=115",[9,13,15]],"122":["平湖森林步道(東段)","新北市平溪區,新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=122",[15]],"215":["北勢溪古道","新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=215",[15]],"406":["灣潭古道","新北市雙溪區,新北市坪林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=406",[15]],"407":["石空古道","宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=407",[15]],"599":["暖東峽谷步道","基隆市暖暖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=599",[10,15]],"735":["闊瀨古道","新北市坪林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=735",[15]],"874":["坪溪古道","新北市雙溪區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=874",[13,15]],"963":["暖東舊道(十分古道)","基隆市暖暖區,新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=963",[15]],"964":["崩山坑古道","新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=964",[15]],"1161":["雙溪中坑古道","新北市雙溪區,新北市坪林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1161",[15]],"1182":["枋山坑古道","新北市坪林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1182",[15]],"1183":["上內平林步道","新北市平溪區,新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1183",[15]],"1184":["大坑山稜線步道","新北市平溪區,新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1184",[15]],"1187":["番仔坑步道(千階嶺、國旗嶺)","新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1187",[15]],"1188":["平湖森林步道(西段)","新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1188",[15]],"1786":["烏山越嶺古道(越嶺保甲路)","新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1786",[15]],"1807":["十分運煤道","新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1807",[15]],"1816":["淡蘭古道中路全段","基隆市暖暖區,新北市平溪區,新北市雙溪區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1816",[15]],"291":["能高越嶺道全段","南投縣仁愛鄉,花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=291",[10,20]],"430":["奇萊南峰步道、南華山步道(奇萊南華)","南投縣仁愛鄉,花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=430",[20]],"746":["麻平暮山山徑(馬海濮富士山)","南投縣仁愛鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=746",[20]],"909":["武令山山徑","南投縣仁愛鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=909",[20]],"923":["精英溫泉步道","南投縣仁愛鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=923",[20]],"1298":["再生山山徑","南投縣仁愛鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1298",[20]],"1332":["武浪洋山山徑","南投縣仁愛鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1332",[20]],"1333":["尾上山山徑","南投縣仁愛鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1333",[20]],"1335":["母安山步道","南投縣仁愛鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1335",[20]],"1706":["史努櫻步道","南投縣仁愛鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1706",[20]],"5":["咬人狗坑登山步道(三汀山)","臺中市太平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=5",[9]],"34":["劍潭山親山步道","臺北市士林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=34",[0,9]],"35":["大崙頭尾山親山步道","臺北市士林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=35",[9]],"54":["七星山主峰、東峰步道","臺北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=54",[9,10]],"69":["大屯主峰步道","臺北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=69",[9]],"78":["南港山縱走親山步道(拇指山、南港山、象山、九五峰)","臺北市信義區,臺北市南港區","https://hiking.biji.co/index.php?q=trail&act=detail&id=78",[9]],"81":["更寮古道(土庫岳)","臺北市南港區,新北市深坑區","https://hiking.biji.co/index.php?q=trail&act=detail&id=81",[9]],"89":["鳶山登山步道","新北市三峽區","https://hiking.biji.co/index.php?q=trail&act=detail&id=89",[9]],"104":["天上山步道","新北市土城區","https://hiking.biji.co/index.php?q=trail&act=detail&id=104",[9]],"105":["烘爐地登山步道(南勢角山)","新北市中和區","https://hiking.biji.co/index.php?q=trail&act=detail&id=105",[9]],"108":["硬漢嶺步道(觀音山)","新北市五股區,新北市八里區","https://hiking.biji.co/index.php?q=trail&act=detail&id=108",[9,10]],"135":["二格山登山步道(草湳線)","新北市石碇區","https://hiking.biji.co/index.php?q=trail&act=detail&id=135",[9]],"139":["大尖山步道","新北市汐止區","https://hiking.biji.co/index.php?q=trail&act=detail&id=139",[9]],"185":["獅仔頭山登山步道","新北市新店區","https://hiking.biji.co/index.php?q=trail&act=detail&id=185",[9]],"212":["樹林大棟山、青龍嶺、大同山步道","新北市樹林區,桃園市龜山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=212",[9]],"228":["東眼山自導式步道","桃園市復興區","https://hiking.biji.co/index.php?q=trail&act=detail&id=228",[9,10]],"232":["桃園石門山步道","桃園市龍潭區","https://hiking.biji.co/index.php?q=trail&act=detail&id=232",[0,9,10]],"234":["十八尖山步道","新竹市東區","https://hiking.biji.co/index.php?q=trail&act=detail&id=234",[9]],"243":["五指山登山步道","新竹縣竹東鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=243",[9]],"247":["馬那邦山登山步道","苗栗縣大湖鄉,苗栗縣泰安鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=247",[9,10]],"249":["加里山登山步道","苗栗縣南庄鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=249",[9,10]],"256":["仙山登山步道","苗栗縣南庄鄉,苗栗縣獅潭鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=256",[9,10]],"264":["鳶嘴稍來山國家步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=264",[9,10]],"307":["蘭潭後山步道、紅毛埤山","嘉義市東區","https://hiking.biji.co/index.php?q=trail&act=detail&id=307",[9]],"308":["關仔嶺大凍山步道","嘉義縣大埔鄉,臺南市白河區","https://hiking.biji.co/index.php?q=trail&act=detail&id=308",[9,10]],"309":["奮起湖大凍山步道","嘉義縣梅山鄉,嘉義縣竹崎鄉,嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=309",[9,10]],"310":["獨立山國家步道","嘉義縣竹崎鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=310",[9,10]],"316":["塔山步道(大塔山)","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=316",[9,10]],"319":["崁頭山步道","臺南市東山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=319",[9]],"321":["尾寮山登山步道","高雄市茂林區,屏東縣三地門鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=321",[9]],"336":["里龍山自然步道","屏東縣獅子鄉,屏東縣牡丹鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=336",[9,10]],"340":["太麻里金針山木馬步道","臺東縣太麻里鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=340",[9]],"346":["都蘭山步道","臺東縣東河鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=346",[9,10]],"361":["萬人山、六十石山步道群","花蓮縣富里鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=361",[9]],"365":["花蓮鯉魚山步道群","花蓮縣壽豐鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=365",[9]],"366":["月眉山步道","花蓮縣壽豐鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=366",[9]],"385":["金門太武山步道","金門縣金沙鎮,金門縣金湖鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=385",[9]],"387":["火炎山、南鞍古道O走","苗栗縣三義鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=387",[9,10]],"399":["基隆山步道","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=399",[9]],"402":["槓子寮砲台、槓子寮山步道(龍崗步道)","基隆市信義區,基隆市中正區","https://hiking.biji.co/index.php?q=trail&act=detail&id=402",[9,10]],"404":["情人湖、大武崙砲台、大武崙山步道","基隆市安樂區","https://hiking.biji.co/index.php?q=trail&act=detail&id=404",[9]],"415":["出關古道：聖關段(關刀山步道)","苗栗縣大湖鄉,苗栗縣三義鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=415",[9]],"432":["橫山觀日步道","彰化縣社頭鄉,南投縣南投市,南投縣名間鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=432",[9,10]],"444":["李崠山步道","新竹縣尖石鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=444",[9]],"448":["貓囒山步道","南投縣魚池鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=448",[9]],"460":["灣坑頭山步道","新北市貢寮區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=460",[9]],"463":["姜子寮山步道","基隆市暖暖區,基隆市七堵區,新北市汐止區","https://hiking.biji.co/index.php?q=trail&act=detail&id=463",[9,10,13]],"473":["鵝公髻山步道","新竹縣五峰鄉,苗栗縣南庄鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=473",[2,9]],"477":["紅淡山步道","基隆市仁愛區","https://hiking.biji.co/index.php?q=trail&act=detail&id=477",[9]],"504":["大崗山步道","高雄市阿蓮區","https://hiking.biji.co/index.php?q=trail&act=detail&id=504",[9,10]],"556":["暗影山步道","臺中市太平區,臺中市新社區","https://hiking.biji.co/index.php?q=trail&act=detail&id=556",[9]],"557":["笠頂山步道","屏東縣瑪家鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=557",[9]],"562":["大坑4號步道","臺中市北屯區","https://hiking.biji.co/index.php?q=trail&act=detail&id=562",[0,9,10]],"567":["九份二山步道","南投縣中寮鄉,南投縣國姓鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=567",[9]],"568":["阿罩霧山、中心瓏步道","臺中市霧峰區","https://hiking.biji.co/index.php?q=trail&act=detail&id=568",[9]],"572":["雲嘉大尖山、二尖山步道","嘉義縣梅山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=572",[9,10]],"573":["後尖山步道","南投縣魚池鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=573",[9]],"576":["集集大山、車埕步道","南投縣中寮鄉,南投縣集集鎮,南投縣水里鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=576",[9]],"580":["石牛山步道","桃園市復興區,新竹縣關西鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=580",[2,9]],"582":["金柑樹山、忘憂森林步道","南投縣信義鄉,南投縣竹山鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=582",[9,10]],"583":["梨子腳山步道","嘉義縣梅山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=583",[9]],"592":["聚興山、新田登山步道","臺中市潭子區","https://hiking.biji.co/index.php?q=trail&act=detail&id=592",[9]],"593":["飛鳳山、觀日坪古道","新竹縣芎林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=593",[9,10]],"594":["南觀音山步道","臺中市北屯區","https://hiking.biji.co/index.php?q=trail&act=detail&id=594",[9]],"595":["鐵砧山登山步道","臺中市大甲區,臺中市外埔區","https://hiking.biji.co/index.php?q=trail&act=detail&id=595",[9]],"597":["旗尾山步道","高雄市旗山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=597",[9]],"598":["溪洲山步道(福山巖登山步道)","桃園市大溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=598",[9]],"602":["大社觀音山步道","高雄市大社區","https://hiking.biji.co/index.php?q=trail&act=detail&id=602",[9]],"607":["松柏坑山、田園茶香賞茶步道","南投縣名間鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=607",[9]],"688":["鵲子山步道","宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=688",[9]],"695":["溪頭鳳凰山步道","南投縣鹿谷鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=695",[9]],"738":["南庄向天湖山步道","苗栗縣南庄鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=738",[9,10]],"769":["立霧山登山步道","花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=769",[9]],"774":["大橫屏山步道","臺中市太平區,南投縣國姓鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=774",[9]],"780":["三腳南山登山步道","嘉義縣大埔鄉,臺南市南化區","https://hiking.biji.co/index.php?q=trail&act=detail&id=780",[9]],"781":["西阿里關山步道","臺南市南化區,高雄市甲仙區","https://hiking.biji.co/index.php?q=trail&act=detail&id=781",[9]],"783":["桃園金面山步道","桃園市大溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=783",[9]],"787":["三星山登山步道","宜蘭縣大同鄉,宜蘭縣南澳鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=787",[9]],"788":["三角崙山登山步道","新北市坪林區,宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=788",[9]],"789":["棚集山步道","屏東縣來義鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=789",[9]],"792":["大湖尖山步道","嘉義縣番路鄉,嘉義縣竹崎鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=792",[9]],"793":["獅山古道","新竹縣峨眉鄉,苗栗縣南庄鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=793",[0,9]],"796":["初音山步道","花蓮縣秀林鄉,花蓮縣吉安鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=796",[9]],"798":["巴塱衛山步道","臺東縣大武鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=798",[9]],"799":["白雲山步道","高雄市甲仙區","https://hiking.biji.co/index.php?q=trail&act=detail&id=799",[9]],"801":["嘉南雲峰、石壁山登山步道","南投縣竹山鎮,雲林縣古坑鄉,嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=801",[9]],"816":["竹子尖山步道","臺南市楠西區,臺南市南化區","https://hiking.biji.co/index.php?q=trail&act=detail&id=816",[9]],"817":["鳴海山、網子山登山步道","高雄市六龜區,高雄市茂林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=817",[9]],"819":["加奈美山步道","臺東縣大武鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=819",[9]],"820":["八里灣山登山步道","花蓮縣豐濱鄉,花蓮縣瑞穗鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=820",[9]],"822":["紅頭山步道","臺東縣蘭嶼鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=822",[9]],"825":["蛇頭山步道","澎湖縣馬公市","https://hiking.biji.co/index.php?q=trail&act=detail&id=825",[9]],"827":["雲台山步道","連江縣南竿鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=827",[9]],"835":["女仍山步道","屏東縣獅子鄉,屏東縣牡丹鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=835",[9]],"954":["卡拉寶山步道","花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=954",[9]],"1024":["大山母山步道","屏東縣恆春鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1024",[9]],"1104":["藤枝山步道","高雄市桃源區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1104",[9]],"1366":["壽山、泰國谷、一簾幽夢步道","高雄市鼓山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1366",[9]],"1695":["刣牛湖山登山步道","臺南市南化區,高雄市杉林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1695",[9]],"315":["特富野古道","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=315",[10,21]],"917":["里美避難步道、巨石板步道","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=917",[21]],"1077":["里美步道(里佳瀑布步道)","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1077",[21]],"1402":["鳥占亭步道","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1402",[21]],"1411":["里佳林間步道","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1411",[21]],"1412":["風流洞、鬼屋、密谷(情人)瀑布步道","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1412",[21]],"1413":["里佳賞楓步道","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1413",[21]],"1697":["特富野步道(特富野生態步道)","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1697",[21]],"362":["花蓮虎頭山步道","花蓮縣瑞穗鄉,花蓮縣萬榮鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=362",[22]],"363":["富興步道","花蓮縣瑞穗鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=363",[22]],"364":["富源國家森林遊樂區步道群","花蓮縣瑞穗鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=364",[22]],"860":["林田山林業文化園區、森坂步道","花蓮縣鳳林鎮,花蓮縣萬榮鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=860",[22]],"1711":["大興瀑布步道","花蓮縣光復鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1711",[22]],"1713":["南華林業文化園區","花蓮縣吉安鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1713",[22]],"1714":["大農大富平地森林園區","花蓮縣光復鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1714",[22]],"9":["錐麓古道","花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=9",[10]],"30":["忘憂谷步道","基隆市","https://hiking.biji.co/index.php?q=trail&act=detail&id=30",[10,13]],"41":["金面山親山步道","臺北市內湖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=41",[0,10]],"73":["金包里大路(擎天崗至上磺溪停車場段)","臺北市北投區,新北市金山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=73",[10]],"74":["軍艦岩、丹鳳山親山步道","臺北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=74",[10]],"76":["象山親山步道","臺北市信義區","https://hiking.biji.co/index.php?q=trail&act=detail&id=76",[0,10,12,13]],"88":["五寮尖登山步道","新北市三峽區","https://hiking.biji.co/index.php?q=trail&act=detail&id=88",[10]],"165":["內洞國家森林遊樂區步道群","新北市烏來區","https://hiking.biji.co/index.php?q=trail&act=detail&id=165",[10]],"171":["草嶺古道","新北市貢寮區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=171",[10]],"194":["鼻頭角步道","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=194",[10]],"201":["三貂嶺瀑布群步道","新北市瑞芳區,新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=201",[10]],"230":["東滿步道","桃園市復興區","https://hiking.biji.co/index.php?q=trail&act=detail&id=230",[10]],"238":["霞喀羅國家步道","新竹縣五峰鄉,新竹縣尖石鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=238",[10]],"241":["鎮西堡巨木群步道（B區）","新竹縣尖石鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=241",[10]],"242":["大霸群峰登山步道(大鹿林道線)","新竹縣尖石鄉,苗栗縣泰安鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=242",[10]],"258":["大坑9、10號步道","臺中市北屯區","https://hiking.biji.co/index.php?q=trail&act=detail&id=258",[10]],"270":["大雪山森林遊樂區森林浴步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=270",[10,13]],"276":["松柏嶺登廟步道","彰化縣二水鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=276",[10]],"278":["坑內坑森林步道","彰化縣二水鄉,南投縣名間鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=278",[10]],"283":["清水岩中央嶺造林步道","彰化縣社頭鄉,彰化縣田中鎮,南投縣名間鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=283",[10]],"284":["挑水古道","彰化縣芬園鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=284",[10]],"288":["合歡北峰步道","南投縣仁愛鄉,花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=288",[10]],"299":["玉山主峰步道","南投縣信義鄉,高雄市桃源區","https://hiking.biji.co/index.php?q=trail&act=detail&id=299",[10]],"306":["龍過脈森林步道","雲林縣林內鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=306",[10]],"325":["北柴山登山步道(北壽山)","高雄市鼓山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=325",[0,10]],"327":["阿朗壹古道(琅嶠‧卑南道)","屏東縣牡丹鄉,臺東縣達仁鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=327",[10]],"328":["墾丁龜山步道","屏東縣車城鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=328",[10]],"333":["墾丁國家森林遊樂區步道群","屏東縣恆春鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=333",[10]],"338":["北大武山步道","屏東縣瑪家鄉,屏東縣泰武鄉,臺東縣金峰鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=338",[10]],"347":["嘉明湖步道","臺東縣海端鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=347",[10]],"348":["浸水營古道","屏東縣枋寮鄉,臺東縣達仁鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=348",[10]],"350":["蘭嶼大天池步道","臺東縣蘭嶼鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=350",[10]],"355":["砂卡礑步道","花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=355",[10]],"357":["白楊步道","花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=357",[10]],"359":["瓦拉米步道","花蓮縣卓溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=359",[10]],"368":["棲蘭神木園步道","宜蘭縣大同鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=368",[10]],"370":["見晴懷古步道","宜蘭縣大同鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=370",[10]],"372":["松羅步道","宜蘭縣大同鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=372",[10]],"373":["翠峰湖環山步道","宜蘭縣大同鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=373",[10]],"382":["聖母登山步道（抹茶山）","宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=382",[10]],"386":["螺山自然步道","連江縣北竿鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=386",[10]],"389":["田寮月世界地景步道","高雄市田寮區","https://hiking.biji.co/index.php?q=trail&act=detail&id=389",[10]],"396":["梅峰古道","臺南市楠西區","https://hiking.biji.co/index.php?q=trail&act=detail&id=396",[10,13]],"400":["無耳茶壺山步道","新北市瑞芳區","https://hiking.biji.co/index.php?q=trail&act=detail&id=400",[10]],"410":["二延平步道","嘉義縣番路鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=410",[0,10,13]],"412":["北插天山登山步道","新北市烏來區,新北市三峽區,桃園市復興區","https://hiking.biji.co/index.php?q=trail&act=detail&id=412",[10]],"421":["小崗山健行步道","高雄市岡山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=421",[10]],"428":["陽明山東西大縱走","臺北市士林區,臺北市北投區,新北市萬里區,新北市淡水區,新北市三芝區","https://hiking.biji.co/index.php?q=trail&act=detail&id=428",[10]],"431":["雪山主東峰步道","苗栗縣泰安鄉,臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=431",[10]],"445":["司馬庫斯神木群步道","新竹縣尖石鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=445",[10]],"446":["拉拉山神木群步道","新北市烏來區,桃園市復興區","https://hiking.biji.co/index.php?q=trail&act=detail&id=446",[10]],"456":["小奇萊步道","南投縣仁愛鄉,花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=456",[10]],"480":["羊稠森林步道","桃園市蘆竹區","https://hiking.biji.co/index.php?q=trail&act=detail&id=480",[10]],"485":["祝山觀日步道(小笠原山)","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=485",[10]],"501":["藤山步道","彰化縣員林市","https://hiking.biji.co/index.php?q=trail&act=detail&id=501",[10]],"503":["鳴鳳古道","苗栗縣獅潭鄉,苗栗縣頭屋鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=503",[0,10]],"537":["鳳崎落日步道","新竹縣新豐鄉,新竹縣竹北市","https://hiking.biji.co/index.php?q=trail&act=detail&id=537",[10]],"540":["武陵四秀登山步道","新竹縣尖石鄉,臺中市和平區,宜蘭縣大同鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=540",[10]],"547":["南湖群峰登山步道","臺中市和平區,宜蘭縣南澳鄉,花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=547",[10]],"589":["挑筍古道(大尖山、後棟仔山步道)","雲林縣古坑鄉,嘉義縣梅山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=589",[10]],"664":["大屯主峰-連峰步道","臺北市北投區,新北市淡水區","https://hiking.biji.co/index.php?q=trail&act=detail&id=664",[10]],"672":["慕谷慕魚生態廊道","花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=672",[10]],"736":["龍頭山步道","高雄市茂林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=736",[10]],"742":["九九峰森林步道","南投縣草屯鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=742",[10]],"748":["三仙台步道(三仙台燈塔)","臺東縣成功鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=748",[10,13]],"760":["關子嶺雞籠山步道","臺南市白河區","https://hiking.biji.co/index.php?q=trail&act=detail&id=760",[10,13]],"766":["福山植物園","宜蘭縣員山鄉,新北市烏來區","https://hiking.biji.co/index.php?q=trail&act=detail&id=766",[10,13]],"775":["萬年峽谷步道","雲林縣古坑鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=775",[10]],"784":["獵鷹尖一線天步道","臺南市楠西區,臺南市南化區","https://hiking.biji.co/index.php?q=trail&act=detail&id=784",[10]],"862":["桃源谷步道(大溪線)","新北市貢寮區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=862",[10]],"1414":["基隆嶼步道","基隆市中正區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1414",[10]],"1626":["情人湖環山步道、老鷹岩","基隆市中山區,基隆市安樂區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1626",[10]],"374":["蘇花古道-大南澳越嶺段","宜蘭縣南澳鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=374",[18]],"379":["南澳古道","宜蘭縣南澳鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=379",[18]],"383":["朝陽步道","宜蘭縣蘇澳鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=383",[18]],"513":["澳花瀑布","宜蘭縣南澳鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=513",[18]],"745":["金岳瀑布步道","宜蘭縣蘇澳鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=745",[18]],"811":["東岳湧泉、蛇山步道","宜蘭縣南澳鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=811",[18]],"1289":["南澳神秘海灘步道(蘇花古道─海岸段)","宜蘭縣南澳鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1289",[18]],"1453":["金岳村楓香步道","宜蘭縣南澳鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1453",[18]],"1848":["林埤古道（RSA02）","桃園市龍潭區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1848",[14]],"1849":["伙房崎古道（RSA04）","桃園市龍潭區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1849",[14]],"1850":["打牛崎古道（RSA06）","桃園市龍潭區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1850",[14]],"1851":["小粗坑古道（RSA08）","桃園市龍潭區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1851",[7,14]],"1852":["渡南古道（RSA13）","新竹縣關西鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1852",[7,14]],"1853":["飛鳳古道（RSA17）","新竹縣關西鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1853",[7,14]],"1854":["騎龍古道（RSA21）","新竹縣橫山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1854",[7,14]],"1855":["茶亭古道（RSA23）","新竹縣橫山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1855",[7,14]],"1856":["石峎古道（RSA27）","新竹縣峨眉鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1856",[7,14]],"1857":["獅山古道（RSA29）","新竹縣峨眉鄉,苗栗縣三灣鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1857",[7,14]],"1858":["龍峎頂步道（RSA32）","苗栗縣三灣鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1858",[7,14]],"1859":["老銃櫃步道（RSA34）","苗栗縣三灣鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1859",[7,14]],"1860":["紙湖古道（RSA37）","苗栗縣獅潭鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1860",[7,14]],"1861":["水寨下古道（RSA39）","苗栗縣獅潭鄉,苗栗縣頭屋鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1861",[7,14]],"1862":["鳴鳳古道（RSA41）","苗栗縣獅潭鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1862",[7,14]],"1863":["楔隘古道（RSA43）","苗栗縣獅潭鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1863",[7,14]],"1864":["出雲古道（RSA47）","苗栗縣公館鄉,苗栗縣大湖鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1864",[7,14]],"1865":["出關古道十分崠段（RSA49）","苗栗縣大湖鄉,苗栗縣銅鑼鄉,苗栗縣三義鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1865",[7,14]],"1866":["出關古道聖關段（RSA50）","苗栗縣大湖鄉,苗栗縣三義鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1866",[7,14]],"1867":["老官道（RSA54）","苗栗縣大湖鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1867",[7,14]],"1868":["挑沙古道（RSA57）","苗栗縣卓蘭鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1868",[7,14]],"1869":["穿霧隘勇線（RSA59）","臺中市東勢區,臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1869",[7,14]],"2011":["淡蘭北路第一段：瑞芳車站至慶雲宮","新北市瑞芳區,新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2011",[8]],"2012":["淡蘭北路第二段：燦光寮至澳底","新北市雙溪區,新北市貢寮區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2012",[8]],"2013":["淡蘭北路第四段：瑞芳車站至雙溪車站","新北市瑞芳區,新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2013",[8]],"2014":["淡蘭北路第五段：雙溪車站至大里車站","新北市貢寮區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=2014",[8]],"2015":["淡蘭中路第一段：暖東峽谷至十分老街","基隆市暖暖區,新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2015",[8]],"2016":["淡蘭中路第二段：十分老街至威惠廟","新北市平溪區,新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2016",[8]],"2017":["淡蘭中路第三段：威惠廟至灣潭古道登山口(闊瀨線)","新北市雙溪區,新北市坪林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2017",[8]],"2018":["淡蘭中路第四段：威惠廟至灣潭古道登山口(崩山坑線)","新北市雙溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2018",[8]],"2019":["淡蘭中路第五段：灣潭古道登山口至外澳車站","新北市雙溪區,新北市坪林區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=2019",[8]],"2020":["淡蘭南路第一段：捷運六張犁站至樹梅古道","臺北市大安區,臺北市信義區,臺北市南港區,臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2020",[8]],"2021":["淡蘭南路第二段：保線路至烏塗溪步道","臺北市南港區,臺北市文山區,新北市深坑區,新北市石碇區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2021",[8]],"2023":["淡蘭南路第三段：四分子至𩻸魚堀溪自行車道","新北市石碇區,新北市坪林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2023",[8]],"2024":["淡蘭南路第四段：𩻸魚堀溪自行車道至縣界公園","新北市坪林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2024",[8]],"2025":["淡蘭南路第五段：縣界公園至礁溪車站","新北市坪林區,宜蘭縣頭城鎮,宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2025",[8]],"2026":["淡蘭北路第三段：澳底至石城車站","新北市貢寮區,宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=2026",[8]],"2160":["淡蘭古道：城內文化徑","臺北市中正區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2160",[8]],"2161":["淡蘭古道：大稻埕文化徑","臺北市中正區,臺北市大同區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2161",[8]],"2162":["淡蘭古道：艋舺文化徑","臺北市萬華區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2162",[8]],"2184":["淡蘭平原線：歷史路線","宜蘭縣宜蘭市,宜蘭縣頭城鎮,宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2184",[8]],"2185":["淡蘭平原線：推廣主線","宜蘭縣宜蘭市,宜蘭縣頭城鎮,宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2185",[8]],"2186":["淡蘭平原線：環山支線","宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=2186",[8]],"2187":["淡蘭平原線：水圳支線","宜蘭縣宜蘭市,宜蘭縣頭城鎮,宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2187",[8]],"2188":["淡蘭平原線：濕地支線","宜蘭縣頭城鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=2188",[8]],"2189":["淡蘭平原線：臨山支線","宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2189",[8]],"2190":["淡蘭平原線：田園支線","宜蘭縣宜蘭市,宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2190",[8]],"75":["虎山親山步道","臺北市信義區","https://hiking.biji.co/index.php?q=trail&act=detail&id=75",[13]],"86":["二子坪步道","新北市三芝區","https://hiking.biji.co/index.php?q=trail&act=detail&id=86",[0,13]],"155":["礁溪跑馬古道","新北市坪林區,宜蘭縣頭城鎮,宜蘭縣礁溪鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=155",[13]],"262":["桃山瀑布步道","臺中市和平區","https://hiking.biji.co/index.php?q=trail&act=detail&id=262",[13]],"282":["清水岩十八彎步道","彰化縣社頭鄉,彰化縣田中鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=282",[13]],"329":["鵝鑾鼻步道","屏東縣恆春鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=329",[13]],"358":["佐倉步道","花蓮縣秀林鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=358",[13]],"439":["半屏山步道","高雄市楠梓區,高雄市左營區","https://hiking.biji.co/index.php?q=trail&act=detail&id=439",[13]],"518":["七星嶺步道(七星山健康步道)","宜蘭縣蘇澳鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=518",[0,13]],"527":["旭海草原步道","屏東縣牡丹鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=527",[13]],"778":["大坑1號步道","臺中市北屯區","https://hiking.biji.co/index.php?q=trail&act=detail&id=778",[13]],"779":["大坑2號步道","臺中市北屯區","https://hiking.biji.co/index.php?q=trail&act=detail&id=779",[13]],"1156":["姜子寮古道","基隆市暖暖區,新北市汐止區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1156",[13]],"37":["台大椰林步道","臺北市大安區","https://hiking.biji.co/index.php?q=trail&act=detail&id=37",[12]],"1204":["大安森林公園","臺北市大安區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1204",[3,11,12]],"1268":["榮星花園步道","台北市中山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1268",[12]],"1279":["磺溪彩虹健康步道","台北市士林區,台北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1279",[3,11,12]],"1391":["碧湖公園步道","台北市內湖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1391",[3,11,12]],"1670":["青年公園","台北市萬華區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1670",[3,11,12]],"1671":["雙園河濱公園","台北市萬華區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1671",[12]],"1885":["大湖公園(防災公園)","臺北市內湖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1885",[3,11,12]],"1887":["台北信義商圈步道","臺北市信義區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1887",[3,11,12]],"1888":["中正紀念堂","臺北市中正區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1888",[12]],"1889":["景美河濱公園","臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1889",[3,11,12]],"1948":["臺大舟山路","臺北市大安區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1948",[3,11,12]],"1950":["師大本部","臺北市大安區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1950",[3,11,12]],"1951":["和平實驗國小校區","臺北市大安區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1951",[12]],"1952":["明美公園","臺北市內湖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1952",[12]],"1953":["大港墘公園","臺北市內湖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1953",[11,12]],"1955":["天母運動公園","臺北市士林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1955",[3,11,12]],"1956":["美崙公園","臺北市士林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1956",[3,11,12]],"1957":["芝山岩健走步道｜臺北健走趣","臺北市士林區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1957",[3,11,12]],"1958":["文山森林公園","臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1958",[3,11,12]],"1959":["國立陽明交通大學（陽明校區）","臺北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1959",[3,11,12]],"1960":["唭哩岸捷運站","臺北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1960",[3,11,12]],"1962":["林森公園","臺北市中山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1962",[3,11,12]],"1963":["花博公園圓山園區｜臺北健走趣","臺北市中山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1963",[3,11,12]],"1965":["松山文創園區","臺北市信義區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1965",[12]],"1966":["觀山河濱公園｜臺北健走趣","臺北市松山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1966",[3,11,12]],"1967":["華山大草原","臺北市中正區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1967",[12]],"1969":["淡水河邊美景飽覽步道（大稻埕碼頭、迪化跨堤景觀平臺）","臺北市大同區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1969",[3,11,12]],"1970":["二二八公園","臺北市中正區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1970",[3,11,12]],"1971":["中山-雙連捷運站線形公園","臺北市大同區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1971",[3,11,12]],"1972":["南港公園","臺北市南港區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1972",[3,11,12]],"1973":["成美左岸河濱公園","臺北市南港區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1973",[3,11,12]],"1644":["華江雁鴨自然公園步道","台北市萬華區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1644",[3,11]],"1680":["華中河濱公園","台北市萬華區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1680",[3,11]],"1683":["彩虹河濱公園","臺北市內湖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1683",[3,11]],"1961":["榮星公園","臺北市中山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1961",[3,11]],"1964":["象山公園","臺北市信義區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1964",[3,11]],"2092":["黎和生態公園","臺北市大安區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2092",[3,11]],"2093":["興隆公園","臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2093",[11]],"2094":["道南河濱公園","臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2094",[3,11]],"2095":["奇岩1號公園","臺北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2095",[3,11]],"2096":["北投溫泉步道","臺北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2096",[3,11]],"2097":["四四南村、信義國小","臺北市信義區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2097",[3,11]],"2098":["國父紀念館、中山公園","臺北市信義區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2098",[3,11]],"2099":["廣慈博愛園區","臺北市信義區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2099",[3,11]],"2100":["臺北小巨蛋","臺北市松山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2100",[3,11]],"2101":["富綠廊道（撫遠公園、敦北公園）","臺北市松山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2101",[3,11]],"2102":["松山車站（饒河夜市、交五公園）","臺北市松山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2102",[3,11]],"2103":["西門町、龍山寺","臺北市萬華區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2103",[3,11]],"2104":["中正紀念堂外圍步道","臺北市中正區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2104",[3,11]],"2105":["古亭河濱公園","臺北市中正區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2105",[3,11]],"2106":["小南門捷運站、南機場夜市","臺北市中正區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2106",[3,11]],"2108":["迪化街","臺北市大同區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2108",[3,11]],"2109":["歷史人文踏查步道（臺北孔子廟、大龍峒保安宮）","臺北市大同區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2109",[3,11]],"2110":["臺北流行音樂中心文化館","臺北市南港區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2110",[3,11]],"2111":["中國信託金融園區","臺北市南港區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2111",[3,11]],"2112":["大佳河濱公園","臺北市中山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2112",[3,11]],"2113":["關渡碼頭","臺北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2113",[3,11]],"2126":["山海圳【內海之路：第一段】台江國家公園⮕臺灣歷史博物館","臺南市安南區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2126",[6]],"2127":["山海圳【內海之路：第二段】臺灣歷史博物館⮕茄拔天后宮","臺南市安南區,臺南市善化區,臺南市新市區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2127",[6]],"2129":["山海圳【大圳之路：第一段】茄拔天后宮⮕南湖口","臺南市官田區,臺南市六甲區,臺南市善化區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2129",[6]],"2130":["山海圳【大圳之路：第二段】南湖口⮕東口工作站","臺南市東區,臺南市楠西區,臺南市六甲區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2130",[6]],"2131":["山海圳【大圳之路：第三段】東口工作站⮕大埔情人公園碼頭","嘉義縣大埔鄉,臺南市楠西區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2131",[6]],"2132":["山海圳【原鄉之路：第一段】大埔情人公園碼頭⮕新美部落","嘉義縣阿里山鄉,嘉義縣大埔鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2132",[6]],"2133":["山海圳【原鄉之路：第二段】新美部落⮕林間步道登山口","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2133",[6]],"2134":["山海圳【原鄉之路：第三段】林間步道登山口⮕達邦部落","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2134",[6]],"2135":["山海圳【原鄉之路：第四段】達邦部落⮕自忠","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2135",[6]],"2136":["山海圳【聖山之路：第一段】自忠⮕鹿林山登山口","嘉義縣阿里山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2136",[6]],"2137":["山海圳【聖山之路：第二段】鹿林山登山口⮕塔塔加鞍部登山口","南投縣信義鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2137",[6]],"2138":["山海圳【聖山之路：第三段】塔塔加鞍部登山口⮕玉山主峰","南投縣信義鄉,高雄市桃源區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2138",[6]],"2173":["十寮山→打牛崎步道（RSA10）","桃園市龍潭區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2173",[7]],"2175":["新開→壢西坪→卓蘭（RSA55）","苗栗縣大湖鄉,苗栗縣卓蘭鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=2175",[7]],"2176":["三坑老街→林埤古道（RSA01-RSA02）","桃園市龍潭區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2176",[7]],"2177":["清水坑古道→伙房崎古道→打牛崎古道（RSA05-RSA04-RSA06）","桃園市龍潭區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2177",[7]],"1465":["臺北大縱走第一段：關渡至二子坪","臺北市北投區,新北市淡水區,新北市三芝區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1465",[5]],"1466":["臺北大縱走第二段：二子坪至小油坑","臺北市北投區,新北市淡水區,新北市三芝區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1466",[5]],"1467":["臺北大縱走第三段：小油坑至風櫃口","臺北市士林區,臺北市北投區,新北市萬里區,新北市金山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1467",[5]],"1468":["臺北大縱走第四段：風櫃口至中華科技大學","臺北市士林區,臺北市內湖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1468",[5]],"1469":["臺北大縱走第五段：捷運劍潭站至碧山巖（劍潭支線）","臺北市中山區,臺北市士林區,臺北市內湖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1469",[5]],"1470":["臺北大縱走第六段：中華科技大學至捷運麟光站","臺北市大安區,臺北市信義區,臺北市南港區,臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1470",[5]],"1471":["臺北大縱走第七段：世界山莊至飛龍步道政大後山","臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1471",[5]],"1919":["臺北大縱走第八段：捷運動物園站至捷運關渡站[河濱自行車道]","臺北市中正區,臺北市大同區,臺北市萬華區,臺北市士林區,臺北市北投區,臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=1919",[5]],"2073":["微笑山線：【大棟山系】405高地段","新北市樹林區,桃園市龜山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2073",[1]],"2074":["微笑山線：【大棟山系】百年大榕樹段","新北市樹林區,新北市鶯歌區,桃園市龜山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2074",[1]],"2075":["微笑山線：【鳶山山系】鳶山彩壁段","新北市三峽區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2075",[1]],"2076":["微笑山線：【天上山系】望月亭桐花段","新北市土城區,新北市三峽區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2076",[1]],"2077":["微笑山線：【天上山系】烘爐地土地公段","新北市中和區,新北市土城區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2077",[1]],"2078":["微笑山線：【二格山系】和美山螢火蟲段","新北市新店區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2078",[1]],"2079":["微笑山線：【二格山系】銀河洞越嶺段","臺北市文山區,新北市新店區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2079",[1]],"2087":["微笑山線：【二格山系】筆架連峰段","臺北市文山區,新北市深坑區,新北市石碇區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2087",[1]],"2088":["微笑山線：【二格山系】皇帝殿稜線段","新北市石碇區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2088",[1]],"2089":["微笑山線：【五分山系】菁桐煤礦段","新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2089",[1]],"2090":["微笑山線：【五分山系】平溪小黃山段","新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2090",[1]],"2091":["微笑山線：【五分山系】望古瀑布段","新北市平溪區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2091",[1]],"2206":["微笑山線：【新北臺北登山步道】樟樹步道","臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2206",[1]],"2207":["微笑山線：【新北桃園登山步道】大湖之森步道","新北市樹林區,桃園市龜山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2207",[1]],"2116":["鯉魚潭環潭線","花蓮縣壽豐鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2116",[4]],"2117":["蔚藍兩潭曙光線","花蓮縣花蓮市","https://hiking.biji.co/index.php?q=trail&act=detail&id=2117",[4]],"2178":["光復濕地生態線","花蓮縣光復鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2178",[4]],"2179":["瑞穗田園療癒線","花蓮縣瑞穗鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2179",[4]],"2180":["玉里稻浪鐵道線","花蓮縣玉里鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=2180",[4]],"244":["騎龍古道","新竹縣橫山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=244",[2]],"544":["金龜岩、猴洞步道","新竹縣北埔鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=544",[2]],"554":["仁和步道、金獅古道","新竹縣湖口鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=554",[2]],"728":["內鳥嘴山、北得拉曼步道","桃園市復興區,新竹縣尖石鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=728",[2]],"758":["鴛鴦谷瀑布群步道","新竹縣尖石鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=758",[2]],"1038":["石光古道(老虎山步道)","新竹縣關西鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1038",[2]],"1107":["關西赤柯山、東獅頭山步道","新竹縣關西鎮","https://hiking.biji.co/index.php?q=trail&act=detail&id=1107",[2]],"1591":["寶山迴龍步道、環湖步道","新竹縣寶山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=1591",[2]],"2204":["馬胎古道、南坪古道","新竹縣尖石鄉,新竹縣橫山鄉","https://hiking.biji.co/index.php?q=trail&act=detail&id=2204",[2]],"2209":["木柵公園","臺北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2209",[3]],"2210":["瑞光公園","臺北市內湖區","https://hiking.biji.co/index.php?q=trail&act=detail&id=2210",[3]],"48":["樟樹步道","台北市文山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=48",[0]],"401":["桃園虎頭山步道","桃園市桃園區,桃園市龜山區","https://hiking.biji.co/index.php?q=trail&act=detail&id=401",[0]],"520":["冷擎步道","臺北市北投區","https://hiking.biji.co/index.php?q=trail&act=detail&id=520",[0]],"681":["關子嶺枕頭山步道","臺南市白河區","https://hiking.biji.co/index.php?q=trail&act=detail&id=681",[0]]};
    var OV = {"1398":["1450","2012","2026"],"1399":["1451","1452","171","2013","2014"],"1423":["1397","1398","1399","1445","1446","1447","1448","1450","1451","1452","171","2011","2012","2013","2014","2026"],"1450":[],"1452":["171","2014"],"115":[],"122":[],"406":[],"874":[],"963":[],"1161":[],"1183":[],"1184":[],"1816":["1161","1183","1184","1187","1188","1786","1807","2015","2016","2017","2018","2019","215","406","407","599","874","963","964"],"291":["430"],"430":[],"78":["76"],"81":[],"108":[],"212":["2073"],"247":[],"256":[],"308":["760"],"309":[],"321":[],"336":[],"385":[],"402":[],"415":["1866"],"432":[],"460":[],"463":[],"473":[],"556":[],"567":[],"576":[],"580":[],"582":[],"595":[],"774":[],"780":[],"781":[],"787":[],"788":["382"],"792":[],"793":["1857"],"796":[],"801":[],"816":[],"817":[],"820":[],"835":[],"1695":[],"362":[],"860":[],"73":[],"171":["1452","2014"],"201":[],"238":[],"242":[],"278":[],"283":["282"],"288":[],"299":["2138"],"327":[],"338":[],"348":[],"412":[],"428":["1466","1467","520","54","664","69"],"431":[],"446":[],"456":[],"503":["1862"],"537":[],"540":["262"],"547":[],"589":[],"664":["1466","69"],"766":[],"784":[],"862":[],"1857":["793"],"1861":[],"1864":[],"1866":["415"],"1869":[],"2011":["1397","1445","1446","1447","1448"],"2012":["1398"],"2013":["1399","1451"],"2014":["1452","171"],"2015":["1807","599","963"],"2016":["1183","1184","1187","1188"],"2017":["1161","1182","735"],"2019":["1786","406","407","874"],"2020":["1470","2092"],"2021":[],"2023":[],"2025":["155"],"2026":["1450"],"2161":["1969","2108"],"2184":["2185"],"2185":["2184"],"2187":[],"2190":[],"155":["2025"],"282":["283"],"439":[],"1156":[],"1279":[],"2127":[],"2129":[],"2130":[],"2131":[],"2132":[],"2138":["299"],"2175":[],"1465":["86"],"1466":["664","69","86"],"1467":["520","54"],"1468":[],"1469":["34"],"1470":["2020","2092","78"],"1919":["1644","1671","1680","1889","1969","2094","2105","2108","2113"],"2073":["212"],"2074":["2207"],"2076":["104"],"2077":["105"],"2079":["2206","48"],"2087":[],"2207":[],"728":[],"2204":[],"401":[]};
    var DC = [["南投縣中寮鄉",23.87893,120.76665],["南投縣仁愛鄉",24.02443,121.13354],["南投縣信義鄉",23.6968,120.85425],["南投縣南投市",23.90996,120.68371],["南投縣名間鄉",23.83829,120.70293],["南投縣國姓鄉",24.04143,120.85784],["南投縣水里鄉",23.81138,120.85604],["南投縣竹山鎮",23.75797,120.67277],["南投縣草屯鎮",23.97383,120.68034],["南投縣集集鎮",23.82863,120.78642],["南投縣魚池鄉",23.89636,120.93606],["南投縣鹿谷鄉",23.74585,120.75358],["台中市和平區",24.17477,120.88349],["台北市中山區",25.06436,121.53347],["台北市內湖區",25.06966,121.589],["台北市北投區",25.13242,121.50138],["台北市士林區",25.09184,121.52421],["台北市文山區",24.98979,121.57046],["台北市萬華區",25.03193,121.49933],["嘉義市東區",23.47843,120.4536],["嘉義縣大埔鄉",23.29677,120.59373],["嘉義縣梅山鄉",23.58491,120.55719],["嘉義縣番路鄉",23.46535,120.555],["嘉義縣竹崎鄉",23.52277,120.55071],["嘉義縣阿里山鄉",23.51503,120.80975],["基隆市",25.13172,121.74465],["基隆市七堵區",25.09777,121.7164],["基隆市中山區",25.15281,121.7296],["基隆市中正區",25.14103,121.75914],["基隆市仁愛區",25.12512,121.73678],["基隆市信義區",25.12953,121.75118],["基隆市安樂區",25.12098,121.72332],["基隆市暖暖區",25.10026,121.73599],["宜蘭縣南澳鄉",24.46674,121.8052],["宜蘭縣員山鄉",24.74318,121.72337],["宜蘭縣大同鄉",24.67705,121.60788],["宜蘭縣宜蘭市",24.75195,121.75333],["宜蘭縣礁溪鄉",24.82365,121.77135],["宜蘭縣蘇澳鎮",24.59462,121.84265],["宜蘭縣頭城鎮",24.85922,121.82331],["屏東縣三地門鄉",22.78841,120.68179],["屏東縣來義鄉",22.52587,120.6336],["屏東縣恆春鄉",22.5519,120.5487],["屏東縣恆春鎮",22.00266,120.74469],["屏東縣枋寮鄉",22.36683,120.59371],["屏東縣泰武鄉",22.60374,120.6921],["屏東縣牡丹鄉",22.12551,120.77092],["屏東縣獅子鄉",22.20192,120.70462],["屏東縣瑪家鄉",22.67857,120.6801],["屏東縣車城鄉",22.07395,120.71419],["彰化縣二水鄉",23.8065,120.61888],["彰化縣員林市",23.95875,120.57453],["彰化縣田中鎮",23.86127,120.58097],["彰化縣社頭鄉",23.89693,120.58577],["彰化縣芬園鄉",24.01358,120.629],["新北市三峽區",24.93434,121.3689],["新北市三芝區",25.25805,121.50087],["新北市中和區",24.9994,121.49898],["新北市五股區",25.08274,121.43816],["新北市八里區",25.14569,121.40351],["新北市土城區",24.9722,121.44335],["新北市坪林區",24.93739,121.71119],["新北市平溪區",25.0258,121.73914],["新北市新店區",24.96739,121.54194],["新北市樹林區",24.99071,121.42053],["新北市汐止區",25.06416,121.65875],["新北市淡水區",25.1813,121.45315],["新北市深坑區",25.00233,121.61567],["新北市烏來區",24.86398,121.55125],["新北市瑞芳區",25.10891,121.80977],["新北市石碇區",24.99168,121.65857],["新北市萬里區",25.18123,121.68869],["新北市貢寮區",25.02204,121.91008],["新北市金山區",25.22188,121.63619],["新北市雙溪區",25.03341,121.86568],["新北市鶯歌區",24.95994,121.35377],["新竹市東區",24.80473,120.97363],["新竹縣五峰鄉",24.63299,121.11931],["新竹縣北埔鄉",24.702,121.05668],["新竹縣寶山鄉",24.76545,120.99098],["新竹縣尖石鄉",24.705,121.20126],["新竹縣峨眉鄉",24.6887,121.01962],["新竹縣新豐鄉",24.90233,120.98663],["新竹縣橫山鄉",24.71666,121.14127],["新竹縣湖口鄉",24.9006,121.04684],["新竹縣竹北市",24.83968,121.00408],["新竹縣竹東鎮",24.73624,121.0911],["新竹縣芎林鄉",24.77486,121.07914],["新竹縣關西鎮",24.79263,121.17589],["桃園市大溪區",24.88058,121.28696],["桃園市復興區",24.81538,121.3519],["桃園市桃園區",24.99392,121.30168],["桃園市蘆竹區",25.05064,121.29173],["桃園市龍潭區",24.86385,121.21639],["桃園市龜山區",24.99252,121.33777],["澎湖縣馬公市",23.56638,119.57849],["臺中市北屯區",24.18226,120.68629],["臺中市和平區",24.17477,120.88349],["臺中市外埔區",24.33201,120.65437],["臺中市大甲區",24.34892,120.62239],["臺中市太平區",24.12647,120.71852],["臺中市新社區",24.23414,120.8095],["臺中市東勢區",24.25861,120.82777],["臺中市潭子區",24.20953,120.70516],["臺中市霧峰區",24.0617,120.70027],["臺北市中山區",25.06436,121.53347],["臺北市中正區",25.03236,121.51827],["臺北市信義區",25.03334,121.5669],["臺北市內湖區",25.06966,121.589],["臺北市北投區",25.13242,121.50138],["臺北市南港區",25.05458,121.6066],["臺北市士林區",25.09184,121.52421],["臺北市大同區",25.06599,121.51551],["臺北市大安區",25.02652,121.5344],["臺北市文山區",24.98979,121.57046],["臺北市松山區",25.04989,121.57727],["臺北市萬華區",25.03193,121.49933],["臺南市六甲區",23.2329,120.35222],["臺南市南化區",23.04125,120.47768],["臺南市善化區",23.13226,120.2969],["臺南市安南區",23.04713,120.18483],["臺南市官田區",23.192,120.31649],["臺南市新市區",23.07897,120.29514],["臺南市東區",22.98007,120.2242],["臺南市東山區",23.32667,120.40406],["臺南市楠西區",23.17384,120.4876],["臺南市白河區",23.35147,120.41375],["臺東縣大武鄉",22.34053,120.89025],["臺東縣太麻里鄉",22.61543,121.00734],["臺東縣成功鎮",23.10531,121.38044],["臺東縣東河鄉",22.9702,121.30442],["臺東縣海端鄉",23.10199,121.17663],["臺東縣蘭嶼鄉",22.0512,121.54695],["臺東縣達仁鄉",22.29487,120.88413],["臺東縣金峰鄉",22.59551,120.97129],["花蓮縣光復鄉",23.66908,121.4235],["花蓮縣卓溪鄉",23.34706,121.30361],["花蓮縣吉安鄉",23.97303,121.56342],["花蓮縣壽豐鄉",23.87067,121.50894],["花蓮縣富里鄉",23.17998,121.25012],["花蓮縣玉里鎮",23.33133,121.32145],["花蓮縣瑞穗鄉",23.49682,121.37599],["花蓮縣秀林鄉",24.12016,121.62609],["花蓮縣花蓮市",23.98207,121.60681],["花蓮縣萬榮鄉",23.71473,121.41098],["花蓮縣豐濱鄉",23.59857,121.52211],["花蓮縣鳳林鎮",23.74465,121.45169],["苗栗縣三灣鄉",24.65493,120.96016],["苗栗縣三義鄉",24.41306,120.7704],["苗栗縣公館鄉",24.50612,120.82828],["苗栗縣卓蘭鎮",24.31302,120.82456],["苗栗縣南庄鄉",24.6022,120.9991],["苗栗縣大湖鄉",24.42299,120.86599],["苗栗縣泰安鄉",24.44748,120.9077],["苗栗縣獅潭鄉",24.53978,120.9205],["苗栗縣銅鑼鄉",24.48698,120.78793],["苗栗縣頭屋鄉",24.5774,120.85085],["連江縣北竿鄉",26.22505,119.99733],["連江縣南竿鄉",26.15308,119.93863],["金門縣金沙鎮",24.48903,118.41331],["金門縣金湖鎮",24.4413,118.41707],["雲林縣古坑鄉",23.64257,120.56204],["雲林縣林內鄉",23.75591,120.61304],["高雄市六龜區",22.99791,120.63342],["高雄市大社區",22.72997,120.34664],["高雄市岡山區",22.79735,120.29513],["高雄市左營區",22.6905,120.29479],["高雄市旗山區",22.88849,120.48355],["高雄市杉林區",22.97071,120.53898],["高雄市桃源區",23.15918,120.76549],["高雄市楠梓區",22.72833,120.32624],["高雄市田寮區",22.86997,120.35945],["高雄市甲仙區",23.08519,120.59152],["高雄市茂林區",22.88625,120.66322],["高雄市阿蓮區",22.8837,120.32704],["高雄市鼓山區",22.6368,120.28115]];

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

    // ---- 步道詳細頁：這條我去過沒？----
    // 跟寶石任務頁卡片同一份資料庫（GPX 軌跡佐證才算已去過，站上「去過」按鈕是手動點的不準）。
    // 軌跡標題只對得回任務索引（T）裡的路線，索引外的步道沒辦法判斷，所以不顯示。
    function tagVisitedOnDetailPage() {
        var qs = new URLSearchParams(location.search);
        if (qs.get('q') !== 'trail' || qs.get('act') !== 'detail') return;
        var id = qs.get('id');
        if (!id || !T[id]) return;
        var h1 = document.querySelector('h1.text-3xl.font-bold') || document.querySelector('h1');
        if (!h1) return;

        var rec = loadVisitedDB()[id];
        var selfId = null, lastSync = 0;
        try { selfId = GM_getValue('hbiji_self_id', null); lastSync = GM_getValue(GPX_SYNC_TS_KEY, 0); } catch (e) {}

        var state, text, color, tip;
        if (rec && rec.doneGpx) {
            state = 'gpx'; text = '✅ 已去過（軌跡佐證）'; color = '#2e7d32';
            tip = '你上傳過符合這條路線的軌跡';
        } else if (selfId && lastSync) {
            state = 'none'; text = '⬜ 軌跡紀錄裡沒有這條'; color = '#616161';
            tip = '「我的軌跡」已同步過，沒找到符合這條路線的軌跡（去過但沒上傳，或軌跡標題被你改過，就對不到）';
        } else {
            state = 'nosync'; text = '❔ 尚未同步「我的軌跡」'; color = '#455a64';
            tip = '登入後打開一次「我的軌跡」頁，腳本會記住你的會員 id 並自動同步，之後每一頁都能判斷';
        }

        var box = document.querySelector('.hvt-detail');
        if (box && box.dataset.hvtState === state) return; // 狀態沒變就不動，避免 MutationObserver 迴圈
        if (!box) {
            box = document.createElement('div');
            box.className = 'hvt-detail';
            box.style.margin = '4px 0';
            var chip0 = document.createElement('span');
            chip0.className = 'hvt-chip';
            box.appendChild(chip0);
            h1.insertAdjacentElement('afterend', box);
        }
        box.dataset.hvtState = state;
        var chip = box.querySelector('.hvt-chip');
        chip.textContent = text;
        chip.title = tip;
        chip.style.background = color;
        chip.style.setProperty('color', '#fff', 'important');
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

    // ---- 地圖預設魯地圖 ----
    // 站上換底圖是靠 body 上的 change 事件（input[name=layer_item]），所以這裡把「魯地圖」那顆
    // radio 選起來再丟一個 change 事件，等於使用者自己點了一次。
    // 不同頁面選項順序不一樣（GPX 頁魯地圖是第 2 個、步道頁是第 5 個），所以用文字找，不寫死位置。
    // 地圖真的畫出來（有載入完的圖磚）才切，不然站上自己的切換函式會撞到還沒建好的地圖物件；
    // 只自動切一次，之後使用者自己換別的底圖就尊重他。
    var rudyApplied = false;
    function applyDefaultRudyMap() {
        if (rudyApplied) return;
        var radios = document.querySelectorAll('input[name="layer_item"]');
        if (!radios.length) return;
        if (!document.querySelector('.leaflet-container .leaflet-tile-loaded')) return;
        var target = null;
        radios.forEach(function (r) {
            var label = r.closest('label');
            if (label && label.textContent.indexOf('魯地圖') !== -1) target = r;
        });
        rudyApplied = true;
        if (!target || target.checked) return;
        target.checked = true;
        target.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function run() {
        var qs = new URLSearchParams(location.search);
        var isGpxDetail = qs.get('q') === 'trail' && qs.get('act') === 'gpx_detail';
        tagDetailPage();
        tagLinksOnPage(isGpxDetail);
        initNearbyButton();
        scanVisitedCards();
        scanMyGpxPage();
        tagVisitedOnDetailPage();
        applyDefaultRudyMap();
        initVisitedButton();
        // 背景節流同步，不管現在在站上哪一頁；沒記住 id 或還沒過節流時間就直接跳過。
        // 真的同步完才回頭刷新步道頁的「已去過」標示（同步不會動 DOM，MutationObserver 不會幫忙）。
        syncMyGpxAllPages(false).then(function (r) { if (r && r.synced) tagVisitedOnDetailPage(); });
    }

    run();
    // 站上多用 ajax 局部刷新（分頁/篩選），用 MutationObserver 補標
    var mo = new MutationObserver(function () {
        clearTimeout(window.__hbijaT);
        window.__hbijaT = setTimeout(run, 300);
    });
    mo.observe(document.body, { childList: true, subtree: true });
})();
