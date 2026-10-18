/* 共用编辑器：工具条 / 本机自动保存 / 照片替换 / 版块显隐 / 配色与字体 / 撤销重做 / 导入导出
   约定：页面含 <div class="page" id="resume" contenteditable="true">，
         且 window.QMT_TPL = {id,name,cat,photo}
   设计基线：工具条字号/按钮规格/提示语 = 原版（53c6784），窄屏换行不裁切；
             面板与配色遵循白 + 蓝主题，色盘只提供蓝色系。 */
(function () {
  var TPL = window.QMT_TPL || { id: 'untitled', name: '未命名', photo: false };
  var EMBED = window.self !== window.top;
  var THUMB = /[?&]thumb=1(?:&|$)/.test(location.search);
  var page = document.getElementById('resume');
  if (!page) return;
  var SITE = 'https://hzhuan717.github.io/resume-templates/';
  if (!THUMB && !EMBED) {
    /* 每个模板页补一条可被搜索引擎/分享卡片读取的摘要，不改变页面内容 */
    try {
      var md = document.querySelector('meta[name="description"]');
      if (!md) { md = document.createElement('meta'); md.setAttribute('name', 'description'); document.head.appendChild(md); }
      md.setAttribute('content', (TPL.name || '可编辑简历模板') + '，免费下载、免注册，打开即可在线修改文字与证件照，支持打印/导出 PDF。');
      var can = document.querySelector('link[rel="canonical"]');
      if (!can) { can = document.createElement('link'); can.setAttribute('rel', 'canonical'); document.head.appendChild(can); }
      can.setAttribute('href', SITE + 'templates/' + encodeURIComponent(TPL.id) + '.html');
      [['og:title', (TPL.name || '可编辑简历模板') + ' · 简历模板库'], ['og:description', '免费中文简历模板，打开就能改；支持证件照替换、打印/PDF 与 JSON 备份。'], ['og:url', SITE + 'templates/' + encodeURIComponent(TPL.id) + '.html']].forEach(function (pair) {
        var m = document.querySelector('meta[property="' + pair[0] + '"]');
        if (!m) { m = document.createElement('meta'); m.setAttribute('property', pair[0]); document.head.appendChild(m); }
        m.setAttribute('content', pair[1]);
      });
    } catch (e) {}
  }
  if (THUMB) {
    /* 缩略图模式：不注入工具条、不读写本机数据，只渲染模板原件 */
    page.setAttribute('contenteditable', 'false');
  }

  var HTML_KEY = 'qmt:html:' + TPL.id;
  var PHOTO_KEY = 'qmt:photo:' + TPL.id;
  var THEME_KEY = 'qmt:theme:' + TPL.id;
  var FONT_KEY = 'qmt:font:' + TPL.id;
  var PHOTO_POS_KEY = 'qmt:photoPos:' + TPL.id;
  var PHOTO_ZOOM_KEY = 'qmt:photoZoom:' + TPL.id;
  var AVATAR = '../assets/avatar.svg';
  var FONT = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif';

  /* ---- 注入样式：工具条（沿用原版规格）+ 面板（白蓝主题） ---- */
  var css = document.createElement('style');
  css.textContent = [
    /* ===== 工具条：与原版逐字节一致 ===== */
    '.qmt-toolbar{position:fixed;left:50%;transform:translateX(-50%);top:0;z-index:9999;display:flex;flex-wrap:nowrap;align-items:center;gap:10px;max-width:100vw;padding:8px 14px;background:rgba(38,74,90,.96);color:#fff;font-size:12.5px;border-radius:0 0 10px 10px;box-shadow:0 4px 16px rgba(0,0,0,.22);font-family:' + FONT + ';white-space:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}',
    '.qmt-toolbar::-webkit-scrollbar{display:none}',
    '.qmt-toolbar .qmt-hint{opacity:.8;font-size:12.5px;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}',
    '.qmt-toolbar button,.qmt-toolbar a.qmt-link{font-family:inherit;font-size:12.5px;cursor:pointer;text-decoration:none;border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;padding:4px 12px;border-radius:6px;transition:.15s;white-space:nowrap;flex:0 0 auto}',
    '.qmt-toolbar button:hover,.qmt-toolbar a.qmt-link:hover{background:#fff;color:#264A5A}',
    '.qmt-badge{display:none;background:#c0392b;color:#fff;border-radius:10px;padding:2px 10px;font-size:12px;flex:0 0 auto}',
    '.qmt-toolbar .qmt-sep{width:1px;height:15px;background:rgba(255,255,255,.28);flex:0 0 auto}',
    /* 窄屏：先压缩间距，仍不够则换行，并让提示语独占一行（保证可读 + 按钮不被裁） */
    '@media (max-width:1180px){.qmt-toolbar{gap:6px;padding:7px 10px}.qmt-toolbar button,.qmt-toolbar a.qmt-link{padding:4px 9px;font-size:12px}}',
    '@media (max-width:1020px){.qmt-toolbar{flex-wrap:wrap;justify-content:center;overflow:visible}.qmt-toolbar .qmt-hint{order:99;flex:1 0 100%;text-align:center;min-width:100%}}',
    '@media (max-width:700px){.qmt-toolbar{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;overflow-y:hidden;padding:8px 10px}.qmt-toolbar button{flex:0 0 auto}.qmt-toolbar .qmt-hint{display:none!important}}',
    '@media screen and (max-width:1020px){body{padding-top:var(--qmt-tb,56px)!important}}',
    /* 右侧「简历结构」常驻栏：只在大屏显示，不改变纸面布局 */
    '.qmt-rail{position:fixed;right:18px;top:80px;width:214px;max-height:calc(100vh - 104px);overflow:auto;z-index:9998;background:#fff;border:1px solid #e3e9ee;border-radius:12px;box-shadow:0 10px 30px rgba(16,40,52,.14);padding:12px;font-family:' + FONT + ';color:#264a5a}',
    '.qmt-rail-head{display:flex;align-items:baseline;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:8px}',
    '.qmt-rail-head small{font-weight:400;color:#7a8a93;font-size:11px}',
    '.qmt-rail-row{display:flex;align-items:center;gap:6px;margin:4px 0}',
    '.qmt-rail-name{flex:1;min-width:0;text-align:left;border:0;border-radius:7px;background:#f4f7f9;color:#264a5a;padding:7px 8px;font-size:12px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.qmt-rail-name:hover{background:#e9f2f4}',
    '.qmt-rail-name.on{background:#e3f1f3;color:#0e7c86;font-weight:700;box-shadow:inset 3px 0 0 #0e7c86}',
    '.qmt-rail-eye{border:0;background:transparent;color:#7a8a93;font-size:11px;cursor:pointer;padding:4px 2px;white-space:nowrap}',
    '.qmt-rail-eye:hover{color:#264a5a}',
    '.qmt-rail-eye.off{color:#b45309}',
    '.qmt-rail-foot{border-top:1px solid #eef2f4;margin-top:9px;padding-top:8px;color:#7a8a93;font-size:11px;line-height:1.5}',
    '@media (max-width:1360px){.qmt-rail{display:none}}',
    '@media print{.qmt-rail{display:none!important}}',
    /* ===== 面板：白底 + 蓝色系 ===== */
    '.qmt-panel{position:fixed;z-index:2147483100;background:#fff;color:#264A5A;border:1px solid #d7e3ea;border-radius:10px;box-shadow:0 6px 20px rgba(38,74,90,.18);padding:12px 14px;font-family:' + FONT + ';font-size:13px;min-width:220px;max-width:min(78vw,340px)}',
    '.qmt-panel-title{font-weight:700;margin:0 0 8px;font-size:12.5px;color:#264A5A}',
    '.qmt-panel-sub{font-weight:400;font-size:11.5px;color:#7a8a93;margin:12px 0 7px;padding-top:9px;border-top:1px solid #eef2f4}',
    '.qmt-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid #eef2f4}',
    '.qmt-row:first-of-type{border-top:0}',
    '.qmt-row-name{color:#2b3a42;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.qmt-mini{font-family:inherit;font-size:12px;cursor:pointer;border:1px solid #4E7282;background:#fff;color:#264A5A;padding:3px 10px;border-radius:6px;white-space:nowrap;flex:0 0 auto;transition:.15s}',
    '.qmt-mini:hover{background:#264A5A;border-color:#264A5A;color:#fff}',
    '.qmt-mini.on{background:#264A5A;border-color:#264A5A;color:#fff}',
    '.qmt-mini.wide{flex:1 1 auto;text-align:center}',
    '.qmt-empty{color:#7a8a93;font-size:12.5px;line-height:1.75;padding:2px}',
    '.qmt-swatches{display:flex;flex-wrap:wrap;gap:8px;padding:2px}',
    '.qmt-swatch{width:26px;height:26px;border-radius:50%;border:2px solid rgba(38,74,90,.2);cursor:pointer;padding:0;flex:0 0 auto;transition:.12s}',
    '.qmt-swatch:hover{transform:scale(1.12);border-color:#264A5A}',
    '.qmt-swatch.on{border-color:#264A5A;box-shadow:0 0 0 2px rgba(38,74,90,.18)}',
    '.qmt-hide{display:none!important}',
    /* ===== 打印前说明（减少边距/背景设置错误） ===== */
    '.qmt-mask{position:fixed;inset:0;z-index:2147483000;background:rgba(16,40,52,.46);display:grid;place-items:center;padding:18px}',
    '.qmt-modal{width:min(92vw,430px);background:#fff;color:#264A5A;border-radius:14px;box-shadow:0 24px 60px rgba(10,30,40,.3);padding:20px 22px;font-family:' + FONT + '}',
    '.qmt-modal h2{margin:0 0 6px;font-size:18px;letter-spacing:-.01em}',
    '.qmt-modal p{margin:0 0 12px;color:#65777f;font-size:12.5px;line-height:1.65}',
    '.qmt-modal ol{margin:0;padding-left:20px;font-size:13px;line-height:1.9;color:#2b3a42}',
    '.qmt-modal b{color:#0e7c86}',
    '.qmt-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}',
    '.qmt-modal-actions button{font-family:inherit;font-size:13px;border-radius:8px;padding:8px 15px;cursor:pointer;border:1px solid #cfdde3;background:#fff;color:#264A5A}',
    '.qmt-modal-actions button.primary{background:#0e7c86;border-color:#0e7c86;color:#fff;font-weight:700}',
    '@media print{.qmt-mask{display:none!important}}',
    /* ===== 打印基线：所有模板统一 A4，@page 负责每页页边距，.page 只负责内容 ===== */
    '@page{size:A4;margin:10mm}',
    '@media print{',
    '  html,body{background:#fff!important;margin:0!important;padding:0!important}',
    '  .qmt-toolbar,.qmt-panel,.qmt-badge{display:none!important}',
    '  .page{width:190mm!important;min-height:0!important;margin:0!important;padding:0!important;',
    '        box-shadow:none!important;border-radius:0!important;transform:none!important;overflow:visible!important}',
    '  .sec,.entry,tr{break-inside:avoid}',
    '  h1,h2,h3,.sec-title{break-after:avoid}',
    '  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---- 载入本机保存的内容（文件原件即示例内容）；缩略图模式永远用原件 ---- */
  if (!THUMB) {
    try {
      var saved = localStorage.getItem(HTML_KEY);
      if (saved) page.innerHTML = saved;
    } catch (e) {}
  }

  /* ---- toast ---- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (EMBED || THUMB) return;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:rgba(38,74,90,.95);color:#fff;padding:9px 18px;border-radius:8px;font-size:13px;z-index:10000;font-family:' + FONT + ';max-width:80vw;text-align:center;box-shadow:0 6px 20px rgba(38,74,90,.25)';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.style.display = 'none'; }, 2800);
  }

  /* ---- 照片 ---- */
  function photoImgs() { return page.querySelectorAll('img.qmt-photo'); }
  function applyPhoto(dataUrl) {
    Array.prototype.forEach.call(photoImgs(), function (im) { im.src = dataUrl; });
  }
  function applyPhotoPos(pos) {
    Array.prototype.forEach.call(photoImgs(), function (im) {
      im.style.objectFit = 'cover';
      im.style.objectPosition = pos;
    });
  }
  function currentPhotoPos() {
    try { return localStorage.getItem(PHOTO_POS_KEY) || ''; } catch (e) { return ''; }
  }
  function applyPhotoZoom(z) {
    var pct = Math.max(100, Math.min(180, parseInt(z, 10) || 100));
    Array.prototype.forEach.call(photoImgs(), function (im) {
      im.style.transformOrigin = '50% 50%';
      im.style.transform = pct > 100 ? 'scale(' + (pct / 100) + ')' : '';
      if (im.parentElement) im.parentElement.style.overflow = 'hidden';
    });
    return pct;
  }
  function currentPhotoZoom() {
    try { return parseInt(localStorage.getItem(PHOTO_ZOOM_KEY), 10) || 100; } catch (e) { return 100; }
  }
  if (!THUMB) {
    try {
      var ph = localStorage.getItem(PHOTO_KEY);
      if (ph) applyPhoto(ph);
      var pp = currentPhotoPos();
      if (pp) applyPhotoPos(pp);
      applyPhotoZoom(currentPhotoZoom());
    } catch (e) {}
  }
  Array.prototype.forEach.call(photoImgs(), function (im) {
    im.addEventListener('error', function h() {
      im.removeEventListener('error', h);
      if (im.src.indexOf('avatar.svg') < 0) im.src = AVATAR;
    });
  });

  function pickPhoto() {
    if (!photoImgs().length) { toast('这个模板没有照片位，直接编辑文字即可'); return; }
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var r = Math.min(1, 480 / img.width, 640 / img.height);
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(img.width * r));
          cv.height = Math.max(1, Math.round(img.height * r));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          var url = cv.toDataURL('image/jpeg', 0.85);
          try { localStorage.setItem(PHOTO_KEY, url); } catch (e) { toast('存储空间不足，照片未保存'); }
          applyPhoto(url);
          save();
          toast('照片已更新（仅保存在你的浏览器里）');
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  }

  /* ---- 自动保存 ---- */
  var timer = null, saveEl = null, pageEl = null;
  function save() {
    if (THUMB) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      try {
        localStorage.setItem(HTML_KEY, page.innerHTML);
        try {
          localStorage.setItem('qmt:meta:' + TPL.id, JSON.stringify({
            id: TPL.id, name: TPL.name, cat: TPL.cat, updated: Date.now()
          }));
        } catch (e) {}
        var se = document.getElementById('qmtSaveState');
        if (se) {
          var d = new Date();
          se.textContent = '已保存 ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        }
      }
      catch (e) { toast('存储空间不足：请用「备份JSON」或「下载HTML」保存到文件'); }
    }, 400);
  }

  /* ---- 撤销 / 重做（对齐全民简历的 HIST 栈；Ctrl+Z / Ctrl+Y） ---- */
  var HIST = [], HP = -1, hTimer = null, hLock = false, HIST_MAX = 60;
  function snap() {
    if (hLock) return;
    var h = page.innerHTML;
    if (HIST[HP] === h) return;
    HIST = HIST.slice(0, HP + 1);
    HIST.push(h);
    if (HIST.length > HIST_MAX) HIST.shift();
    HP = HIST.length - 1;
  }
  function snapSoon() { clearTimeout(hTimer); hTimer = setTimeout(snap, 600); }
  function applyHist(h) {
    hLock = true;
    page.innerHTML = h;
    hLock = false;
    fit(); checkOverflow(); save();
  }
  function undo() { if (HP > 0) { HP--; applyHist(HIST[HP]); toast('已撤销'); } else toast('没有可撤销的操作'); }
  function redo() { if (HP < HIST.length - 1) { HP++; applyHist(HIST[HP]); toast('已重做'); } else toast('没有可重做的操作'); }

  page.addEventListener('input', function (e) {
    if (e && e.isComposing) return;
    save(); snapSoon(); checkOverflow();
  });

  /* ---- 粘贴一律转纯文本 ---- */
  page.addEventListener('paste', function (e) {
    e.preventDefault();
    var txt = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, txt);
  });

  /* ---- 超页提示：按纸宽算真实页数（A4 高宽比 297/210），不再比较 scrollHeight/clientHeight ---- */
  var badge = null;
  function pageCount() {
    var w = page.clientWidth || page.offsetWidth || 794;
    var hPerPage = w * 297 / 210;
    return Math.max(1, Math.ceil((page.scrollHeight - 2) / hPerPage));
  }
  function checkOverflow() {
    var n = pageCount();
    var pe = document.getElementById('qmtPageState');
    if (pe) pe.textContent = n + ' 页';
    if (!badge) return;
    badge.textContent = n > 1 ? ('当前 ' + n + ' 页 · 建议精简') : '';
    badge.style.display = n > 1 ? 'inline-block' : 'none';
  }

  /* ================= 配色（蓝色系，按计算色重着色，适配全部模板） ================= */
  var PALETTE = [
    ['#264A5A', '原版 · 灰蓝'], ['#2C5F8A', '靛蓝'], ['#1F3B57', '深藏青'],
    ['#3A7CA5', '天青'], ['#4A6FA5', '钢蓝'], ['#2E6E9E', '经典蓝'],
    ['#33768F', '青蓝'], ['#5A7184', '石板蓝灰']
  ];
  var CPROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];

  function parseRGB(str) {
    var m = String(str || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(',');
    var c = { r: +p[0], g: +p[1], b: +p[2], a: p.length > 3 ? parseFloat(p[3]) : 1 };
    if (isNaN(c.r) || isNaN(c.g) || isNaN(c.b)) return null;
    return c;
  }
  function rgb2hsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }
  function hsl2hex(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    var rgb;
    if (!s) { rgb = [l, l, l].map(function (x) { return Math.round(x * 255); }); }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      var f = function (t) {
        t = ((t % 1) + 1) % 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      rgb = [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(function (x) { return Math.round(x * 255); });
    }
    return '#' + rgb.map(function (x) {
      var t = ('0' + x.toString(16));
      return t.slice(t.length - 2);
    }).join('');
  }
  function hueDist(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  function hex2rgb(hex) {
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
  }

  /* 找出简历的主色（出现最多、且非中性的颜色），返回其完整 HSL */
  function detectAccent() {
    var counts = {}, all = page.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var cs = getComputedStyle(all[i]);
      for (var j = 0; j < CPROPS.length; j++) {
        var c = parseRGB(cs[CPROPS[j]]);
        if (!c || c.a < 0.15) continue;
        var hsl = rgb2hsl(c);
        if (hsl.s < 0.18) continue;              /* 中性黑白灰不动 */
        var key = Math.round(hsl.h / 6) * 6 + '|' + Math.round(hsl.s * 20) + '|' + Math.round(hsl.l * 20);
        if (!counts[key]) counts[key] = { n: 0, h: hsl.h, s: hsl.s, l: hsl.l };
        counts[key].n++;
      }
    }
    var best = null, bestN = 0;
    for (var k in counts) if (counts[k].n > bestN) { bestN = counts[k].n; best = counts[k]; }
    if (!best) return null;
    return { h: best.h, s: best.s, l: best.l, n: bestN };
  }

  /* 把同色系（色相差 <= 32°）的颜色整体映射到目标色：
     主色 → 精确等于所选颜色；同族深浅 → 保留相对明度/饱和度关系（版式层次不变）
     覆盖前先记录元素原有的内联色，"恢复原始配色"才能无损还原 */
  var ORIG_ATTR = 'data-qmt-ov';
  function recolor(hex) {
    var acc = detectAccent();
    if (!acc) return false;
    var tgt = rgb2hsl(hex2rgb(hex));
    var all = page.querySelectorAll('*'), n = 0;
    for (var i = 0; i < all.length; i++) {
      var el = all[i], cs = getComputedStyle(el);
      var todo = [];
      for (var j = 0; j < CPROPS.length; j++) {
        var c = parseRGB(cs[CPROPS[j]]);
        if (!c || c.a < 0.15) continue;
        var hsl = rgb2hsl(c);
        if (hsl.s < 0.15) continue;
        if (hueDist(hsl.h, acc.h) > 32) continue;
        todo.push([CPROPS[j], hsl]);
      }
      if (!todo.length) continue;
      /* 首次改动该元素时，备份它原本就有的内联色 */
      if (el.getAttribute('data-qmt-c') !== '1') {
        var orig = null;
        for (var q = 0; q < todo.length; q++) {
          var v = el.style[todo[q][0]];
          if (v) { orig = orig || {}; orig[todo[q][0]] = v; }
        }
        if (orig) el.setAttribute(ORIG_ATTR, JSON.stringify(orig));
        el.setAttribute('data-qmt-c', '1');
      }
      for (var t = 0; t < todo.length; t++) {
        var prop = todo[t][0], hsl2 = todo[t][1];
        var nl = tgt.l + (hsl2.l - acc.l);
        if (nl < 0.04) nl = 0.04; else if (nl > 0.98) nl = 0.98;
        var ns = acc.s > 0.01 ? tgt.s * (hsl2.s / acc.s) : hsl2.s;
        if (ns < 0) ns = 0; else if (ns > 1) ns = 1;
        el.style[prop] = hsl2hex(tgt.h, ns, nl);
        n++;
      }
    }
    return n > 0;
  }
  /* 无损还原：有原始内联色的写回原值，原本没有的清空 */
  function restoreColors() {
    Array.prototype.forEach.call(page.querySelectorAll('[data-qmt-c]'), function (el) {
      var map = {};
      var ov = el.getAttribute(ORIG_ATTR);
      if (ov) { try { map = JSON.parse(ov); } catch (e) {} }
      for (var j = 0; j < CPROPS.length; j++) {
        el.style[CPROPS[j]] = Object.prototype.hasOwnProperty.call(map, CPROPS[j]) ? map[CPROPS[j]] : '';
      }
      el.removeAttribute('data-qmt-c');
      el.removeAttribute(ORIG_ATTR);
    });
  }
  function currentTheme() {
    try { return JSON.parse(localStorage.getItem(THEME_KEY)); } catch (e) { return null; }
  }
  function setTheme(hex) {
    if (!recolor(hex)) { toast('这个模板没有可换的彩色元素'); return; }
    try { localStorage.setItem(THEME_KEY, JSON.stringify({ c: hex })); } catch (e) {}
    snap(); save();
    toast('配色已更换（Ctrl+Z 可撤销）');
  }
  function clearTheme() {
    restoreColors();
    try { localStorage.removeItem(THEME_KEY); } catch (e) {}
    snap(); save();
    toast('已恢复模板原始配色');
  }
  (function initTheme() {
    if (THUMB) return;
    var t = currentTheme();
    if (t && t.c) recolor(t.c);   /* 已存配色随 innerHTML 持久化，这里补齐缺失部分 */
  })();

  /* ================= 正文字体（对齐全民简历的 6 款） ================= */
  var FONTS = [
    ['雅黑', '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif'],
    ['宋体', '"SimSun","Songti SC",serif'],
    ['黑体', '"SimHei","Heiti SC",sans-serif'],
    ['楷体', '"KaiTi","STKaiti",serif'],
    ['仿宋', '"FangSong","STFangsong",serif'],
    ['苹方', '"PingFang SC","Hiragino Sans GB",sans-serif']
  ];
  var fontStyleEl = null;
  function applyFont(cssText) {
    if (!fontStyleEl) {
      fontStyleEl = document.createElement('style');
      fontStyleEl.id = 'qmtFontCss';
      document.head.appendChild(fontStyleEl);
    }
    fontStyleEl.textContent = '#resume,#resume *{font-family:' + cssText + ' !important}';
  }
  function currentFont() {
    try { return localStorage.getItem(FONT_KEY); } catch (e) { return null; }
  }
  function setFont(cssText, label) {
    applyFont(cssText);
    try { localStorage.setItem(FONT_KEY, cssText); } catch (e) {}
    snap(); save();
    toast('正文字体已切换（Ctrl+Z 可撤销）');
  }
  (function initFont() {
    if (THUMB) return;
    var f = currentFont();
    if (f) applyFont(f);
  })();

  /* ================= 版块管理（结构化模板精确匹配，其余按顶层内容块回退） ================= */
  function labelOf(el) {
    var t = (el.textContent || '').replace(/[\s\u3000]+/g, ' ').trim();
    if (!t) return '内容块';
    var seg = t.split(/[\n\r·|｜]/)[0].trim() || t;
    return seg.length > 12 ? seg.slice(0, 12) + '…' : seg;
  }
  function sectionGroups() {
    /* 1) 结构化模板（classic-teal）：精确按 section.sec */
    var secs = page.querySelectorAll('section.sec');
    if (secs.length) {
      return Array.prototype.map.call(secs, function (sec, i) {
        var bar = sec.querySelector('.sec-title .bar');
        return { els: [sec], label: bar ? bar.textContent.trim() : ('版块 ' + (i + 1)) };
      });
    }
    /* 2) 通用回退：#resume 的顶层内容块；空 <p> 间距与纯装饰并入相邻内容块 */
    var kids = Array.prototype.slice.call(page.children), groups = [], pending = [], cur = null;
    kids.forEach(function (el) {
      var deco = el.classList.contains('qmt-anchor') || el.classList.contains('qmt-shape');
      var txt = (el.textContent || '').replace(/[\s\u3000]/g, '');
      if (deco || !txt) { if (cur) cur.els.push(el); else pending.push(el); return; }
      cur = { els: pending.concat([el]), label: labelOf(el) };
      pending = [];
      groups.push(cur);
    });
    if (groups.length && pending.length) groups[groups.length - 1].els = groups[groups.length - 1].els.concat(pending);
    return groups;
  }
  function groupHidden(g) { return g.els[0].classList.contains('qmt-hide'); }
  function toggleGroup(g) {
    var hide = !groupHidden(g);
    g.els.forEach(function (el) { el.classList.toggle('qmt-hide', hide); });
    save(); checkOverflow();
  }

  /* ================= 下拉面板 ================= */
  var openPanel = null, openBtn = null;
  function closePanel() { if (openPanel) { openPanel.remove(); openPanel = null; openBtn = null; } }
  function placePanel(p, btn) {
    var r = btn.getBoundingClientRect();
    var w = p.offsetWidth, h = p.offsetHeight;
    var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    p.style.left = left + 'px';
    p.style.top = top + 'px';
  }
  function togglePanel(btn, build) {
    if (openBtn === btn) { closePanel(); return; }
    closePanel();
    var p = document.createElement('div');
    p.className = 'qmt-panel';
    build(p);
    document.body.appendChild(p);
    placePanel(p, btn);
    openPanel = p; openBtn = btn;
  }
  document.addEventListener('click', function (e) {
    if (openPanel && !openPanel.contains(e.target) && e.target !== openBtn) closePanel();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
  window.addEventListener('resize', function () { if (openPanel && openBtn) placePanel(openPanel, openBtn); });

  function buildSectionPanel(p) {
    var groups = sectionGroups();
    if (groups.length < 2) {
      p.innerHTML = '<div class="qmt-panel-title">版块管理</div>' +
        '<div class="qmt-empty">这个模板是整体表格版式，没有可单独隐藏的版块。<br>需要增删结构，请用记事本打开本文件编辑。</div>';
      return;
    }
    p.innerHTML = '<div class="qmt-panel-title">版块管理 <span style="font-weight:400;color:#7a8a93;font-size:11.5px">共 ' +
      groups.length + ' 块 · 改动自动保存</span></div>';
    groups.forEach(function (g) {
      var name = document.createElement('span');
      name.className = 'qmt-row-name';
      name.textContent = g.label;
      var tg = document.createElement('button');
      tg.type = 'button';
      tg.className = 'qmt-mini';
      function refresh() {
        tg.textContent = groupHidden(g) ? '已隐藏 · 显示' : '显示中 · 隐藏';
        tg.classList.toggle('on', !groupHidden(g));
      }
      tg.addEventListener('click', function () { toggleGroup(g); refresh(); snap(); });
      refresh();
      var row = document.createElement('div');
      row.className = 'qmt-row';
      row.appendChild(name);
      row.appendChild(tg);
      p.appendChild(row);
    });
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast('复制失败，请手动选择文本'); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else fallback();
  }
  function buildSwitchPanel(p) {
    p.innerHTML = '<div class="qmt-panel-title">换一套模板</div>' +
      '<div class="qmt-empty" style="margin-bottom:8px">每套模板是独立排版，内容不能自动搬过去。先备份当前简历，再去模板库挑一套，在新模板里用「导入JSON」恢复文字。</div>';
    var b1 = document.createElement('button');
    b1.type = 'button'; b1.className = 'qmt-mini wide'; b1.style.marginBottom = '6px';
    b1.textContent = '备份并去模板库 →';
    b1.onclick = function () {
      closePanel();
      backupJSON();
      setTimeout(function () { location.href = '../index.html#library'; }, 600);
    };
    var b2 = document.createElement('button');
    b2.type = 'button'; b2.className = 'qmt-mini wide';
    b2.textContent = '只去模板库（不备份）';
    b2.onclick = function () { closePanel(); location.href = '../index.html#library'; };
    p.appendChild(b1); p.appendChild(b2);
  }
  function buildSharePanel(p) {
    p.innerHTML = '<div class="qmt-panel-title">分享 / 复制 <span style="font-weight:400;color:#7a8a93;font-size:11.5px">不上传云端</span></div>' +
      '<div class="qmt-empty" style="margin-bottom:8px">链接只指向模板；简历内容仍只在本机。要发给别人，请用「下载HTML」或「下载Word」。</div>';
    var b1 = document.createElement('button');
    b1.type = 'button'; b1.className = 'qmt-mini wide'; b1.style.marginBottom = '6px'; b1.textContent = '复制模板链接';
    b1.addEventListener('click', function () {
      if (location.protocol === 'file:') return toast('本地文件链接换设备打不开，建议下载 HTML 或备份 JSON');
      copyText(location.href, '模板链接已复制');
    });
    var b2 = document.createElement('button');
    b2.type = 'button'; b2.className = 'qmt-mini wide'; b2.textContent = '复制简历纯文本';
    b2.addEventListener('click', function () { copyText(page.innerText.replace(/\n{3,}/g, '\n\n'), '简历文字已复制，可粘贴到邮件或招聘网站'); });
    p.appendChild(b1); p.appendChild(b2);
  }

  function buildLookPanel(p) {
    var th = currentTheme();
    var acc = detectAccent();
    p.innerHTML = '<div class="qmt-panel-title">配色 <span style="font-weight:400;color:#7a8a93;font-size:11.5px">蓝色系 8 色</span></div>';
    if (!acc) {
      p.innerHTML += '<div class="qmt-empty">这个模板是纯黑白灰版式，没有可替换的彩色元素。</div>';
    } else {
      var grid = document.createElement('div');
      grid.className = 'qmt-swatches';
      PALETTE.forEach(function (def) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'qmt-swatch' + (th && th.c === def[0] ? ' on' : '');
        b.style.background = def[0];
        b.title = def[1];
        b.setAttribute('aria-label', def[1]);
        b.addEventListener('click', function () {
          setTheme(def[0]);
          Array.prototype.forEach.call(grid.children, function (x) { x.classList.remove('on'); });
          b.classList.add('on');
        });
        grid.appendChild(b);
      });
      p.appendChild(grid);
      var rst = document.createElement('button');
      rst.type = 'button';
      rst.className = 'qmt-mini wide';
      rst.style.marginTop = '10px';
      rst.textContent = '恢复模板原始配色';
      rst.addEventListener('click', clearTheme);
      p.appendChild(rst);
    }

    var sub = document.createElement('div');
    sub.className = 'qmt-panel-sub';
    sub.textContent = '正文字体';
    p.appendChild(sub);
    var fr = document.createElement('div');
    fr.className = 'qmt-swatches';
    var curF = currentFont();
    FONTS.forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'qmt-mini' + (curF === f[1] ? ' on' : '');
      b.style.fontFamily = f[1];
      b.textContent = f[0];
      b.addEventListener('click', function () {
        setFont(f[1], f[0]);
        Array.prototype.forEach.call(fr.children, function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
      fr.appendChild(b);
    });
    p.appendChild(fr);

    if (photoImgs().length) {
      var psub = document.createElement('div');
      psub.className = 'qmt-panel-sub';
      psub.textContent = '照片位置';
      p.appendChild(psub);
      var pr = document.createElement('div');
      pr.className = 'qmt-swatches';
      [['上部', '50% 18%'], ['居中', '50% 50%'], ['下部', '50% 82%']].forEach(function (def) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'qmt-mini' + (currentPhotoPos() === def[1] ? ' on' : '');
        b.textContent = def[0];
        b.addEventListener('click', function () {
          applyPhotoPos(def[1]);
          try { localStorage.setItem(PHOTO_POS_KEY, def[1]); } catch (e) {}
          Array.prototype.forEach.call(pr.children, function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          save();
          toast('照片位置已调整（只影响本机草稿）');
        });
        pr.appendChild(b);
      });
      p.appendChild(pr);

      var zsub = document.createElement('div');
      zsub.className = 'qmt-panel-sub';
      zsub.textContent = '照片缩放';
      p.appendChild(zsub);
      var zrow = document.createElement('div');
      zrow.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;color:#264A5A';
      var zr = document.createElement('input');
      zr.type = 'range'; zr.min = '100'; zr.max = '180'; zr.step = '5';
      zr.setAttribute('aria-label', '照片缩放'); zr.value = String(currentPhotoZoom());
      zr.style.cssText = 'flex:1;accent-color:#264A5A';
      var zlab = document.createElement('span');
      zlab.style.cssText = 'width:40px;text-align:right;font-variant-numeric:tabular-nums';
      zlab.textContent = zr.value + '%';
      zr.addEventListener('input', function () {
        zlab.textContent = applyPhotoZoom(zr.value) + '%';
      });
      zr.addEventListener('change', function () {
        try { localStorage.setItem(PHOTO_ZOOM_KEY, String(applyPhotoZoom(zr.value))); } catch (e) {}
        save();
        toast('照片缩放已保存（只影响本机草稿）');
      });
      zrow.appendChild(zr); zrow.appendChild(zlab); p.appendChild(zrow);
      var ztip = document.createElement('div');
      ztip.className = 'qmt-empty';
      ztip.style.marginTop = '6px';
      ztip.textContent = '放大后会自动裁切边缘，配合上面的位置调整取景；不会修改原图。';
      p.appendChild(ztip);
    }
  }

  /* ---- 工具条（嵌入画廊时不注入） ---- */
  var hasSections = false;
  try { hasSections = sectionGroups().length >= 2; } catch (e) {}

  if (!EMBED && !THUMB) {
    var tb = document.createElement('div');
    var shareBtn = null;
    tb.className = 'qmt-toolbar';
    var hint = document.createElement('span');
    hint.className = 'qmt-hint';
    hint.textContent = '点正文即可直接改 · Enter 新建一条 · Ctrl+Z 撤销 · 建议单页';
    badge = document.createElement('span');
    badge.className = 'qmt-badge';
    badge.textContent = '内容已超出一页';
    var home = document.createElement('a');
    home.className = 'qmt-link';
    home.href = '../index.html';
    home.textContent = '← 模板库';
    tb.appendChild(home);
    function mkBtn(label, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', fn);
      return b;
    }
    /* 内容工具组：用分隔线与「照片/导出/备份」隔开，保持原版视觉分组 */
    if (hasSections) {
      var secBtn = mkBtn('版块 ▾', function () { togglePanel(secBtn, buildSectionPanel); });
      tb.appendChild(secBtn);
    }
    var lookBtn = mkBtn('外观 ▾', function () { togglePanel(lookBtn, buildLookPanel); });
    tb.appendChild(lookBtn);
    tb.appendChild(Object.assign(document.createElement('span'), { className: 'qmt-sep' }));
    tb.appendChild(hint);
    tb.appendChild(badge);
    [
      ['替换照片', pickPhoto],
      ['打印 / 导出PDF', openPrintGuide],
      ['下载HTML', exportHTML],
      ['下载Word', function () { togglePanel(this, buildWordPanel); }],
      ['换模板', function () { togglePanel(this, buildSwitchPanel); }],
      ['分享', function () { togglePanel(shareBtn, buildSharePanel); }],
      ['备份JSON', backupJSON],
      ['导入JSON', importJSON],
      ['恢复原始内容', resetAll]
    ].forEach(function (def) {
      var b = mkBtn(def[0], def[1]);
      tb.appendChild(b);
      if (def[0] === '分享') shareBtn = b;
    });
    document.body.appendChild(tb);
    function syncToolbarSpace() {
      document.documentElement.style.setProperty('--qmt-tb', (tb.offsetHeight + 10) + 'px');
    }
    window.addEventListener('resize', syncToolbarSpace);
    syncToolbarSpace();
    buildRail();
  }

  /* ---- 右侧常驻「简历结构」栏（大屏） ---- */
  function outlineGroups() {
    var names = ['基本信息', '求职意向', '教育背景', '工作经历', '实习经历', '项目经历', '校园经历', '技能特长', '技能证书', '荣誉证书', '自我评价', '兴趣爱好'];
    var out = [];
    names.forEach(function (n) {
      var all = page.querySelectorAll('p,td,div,span,h1,h2,h3');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.children.length > 2) continue;
        if ((el.textContent || '').replace(/[\s\u3000]/g, '') === n) {
          out.push({ els: [el], label: n });
          break;
        }
      }
    });
    return out;
  }
  function buildRail() {
    var groups = sectionGroups();
    var generic = groups.length < 2;
    if (generic) groups = outlineGroups();
    if (!groups.length) return;
    var rail = document.createElement('aside');
    rail.className = 'qmt-rail';
    rail.setAttribute('aria-label', '简历结构');
    var head = document.createElement('div');
    head.className = 'qmt-rail-head';
    head.innerHTML = '<span>简历结构</span><small>' + groups.length + ' 块</small>';
    rail.appendChild(head);
    groups.forEach(function (g) {
      var row = document.createElement('div');
      row.className = 'qmt-rail-row';
      var name = document.createElement('button');
      name.type = 'button';
      name.className = 'qmt-rail-name';
      name.textContent = g.label;
      name.title = '定位到「' + g.label + '」';
      name.addEventListener('click', function () {
        if (groupHidden(g)) { toggleGroup(g); }
        var el = g.els[0];
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        Array.prototype.forEach.call(rail.querySelectorAll('.qmt-rail-name'), function (x) { x.classList.remove('on'); });
        name.classList.add('on');
      });
      var eye = document.createElement('button');
      eye.type = 'button';
      eye.className = 'qmt-rail-eye';
      function refresh() {
        eye.textContent = groupHidden(g) ? '显示' : '隐藏';
        eye.classList.toggle('off', groupHidden(g));
        name.style.opacity = groupHidden(g) ? '.55' : '1';
      }
      eye.addEventListener('click', function () {
        toggleGroup(g); refresh(); snap(); checkOverflow();
      });
      refresh();
      row.appendChild(name);
      if (!generic) row.appendChild(eye);
      rail.appendChild(row);
    });
    var foot = document.createElement('div');
    foot.className = 'qmt-rail-foot';
    foot.innerHTML = '<span id="qmtSaveState">改动自动保存在本机</span> · 当前 <span id="qmtPageState">' + pageCount() + ' 页</span>';
    rail.appendChild(foot);
    saveEl = document.getElementById('qmtSaveState');
    pageEl = document.getElementById('qmtPageState');
    document.body.appendChild(rail);
  }

  /* ---- 打印前说明：把浏览器打印设置一次说清，避免边距/背景漏勾 ---- */
  function openPrintGuide() {
    var mask = document.createElement('div');
    mask.className = 'qmt-mask';
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-modal', 'true');
    mask.setAttribute('aria-labelledby', 'qmtPrintTitle');
    var warn = (TPL.id === 't057')
      ? '<p style="color:#b45309;background:#fff8e6;border:1px solid #f3d9a4;border-radius:8px;padding:8px 10px">这个模板是「整页背景图 + 绝对定位」版式，打印分页可能错位。建议先精简到一页，或在打印预览里逐页检查。</p>'
      : '';
    mask.innerHTML = '<div class="qmt-modal">' +
      '<h2 id="qmtPrintTitle">打印 / 导出 PDF</h2>' +
      '<p>点了继续后会打开浏览器打印窗口。下面 4 项建议逐项确认，导出的 PDF 才是 A4 单页版式。</p>' + warn +
      '<ol>' +
        '<li>纸张选 <b>A4</b></li>' +
        '<li>边距选 <b>默认</b>（本站已内置 10mm 页边距，不要选“无”）</li>' +
        '<li>勾选 <b>背景图形</b>（否则色块/丝带会变白）</li>' +
        '<li>缩放保持 <b>100%</b></li>' +
      '</ol>' +
      '<div class="qmt-modal-actions"><button type="button" data-close>先不打印</button><button type="button" class="primary" data-go>继续打印</button></div>' +
    '</div>';
    document.body.appendChild(mask);
    function close() { if (mask.parentNode) mask.parentNode.removeChild(mask); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    mask.querySelector('[data-close]').addEventListener('click', close);
    mask.querySelector('[data-go]').addEventListener('click', function () { close(); setTimeout(function () { window.print(); }, 60); });
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    document.addEventListener('keydown', onKey);
    mask.querySelector('[data-go]').focus();
  }

  /* ---- 导出 / 备份 / 导入 / 恢复 ---- */
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exportHTML() {
    var doc = document.documentElement.cloneNode(true);
    var t = doc.querySelector('.qmt-toolbar');
    if (t) t.remove();
    var p = doc.querySelector('.qmt-panel');
    if (p) p.remove();
    download(new Blob(['<!DOCTYPE html>\n' + doc.outerHTML], { type: 'text/html;charset=utf-8' }), (TPL.name || '简历') + '.html');
  }
  function exportWordDoc() {
    /* Word 兼容的 .doc：保留模板样式与内联图片，去掉工具条/脚本。
       不是严格 OOXML .docx，但 Word/WPS 可直接打开，适合先交付可编辑文档。 */
    var style = document.querySelector('style');
    var cssText = style ? style.textContent : '';
    var body = page.outerHTML.replace(/\scontenteditable="(true|false)"/g, '');
    var html = '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8"><title>' + (TPL.name || '简历') + '</title>' +
      '<style>' + cssText + '</style>' +
      '<style>@page{size:A4;margin:10mm}html,body{margin:0!important;padding:0!important;background:#fff!important}' +
      '.page{width:190mm!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important;overflow:visible!important}' +
      'img{max-width:100%}</style></head><body>' + body + '</body></html>';
    download(new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' }), (TPL.name || '简历') + '.doc');
    toast('已下载 Word 兼容文档（.doc，可用 Word/WPS 打开）');
  }

  /* ===== 真·DOCX（无依赖，纯文字，便于二次编辑） ===== */
  function xmlEsc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(files) {
    /* files: [{name, data:Uint8Array}]，store（不压缩）即可被 Word 接受 */
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    var now = new Date();
    var time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    var date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    function u16(v) { return new Uint8Array([v & 255, (v >>> 8) & 255]); }
    function u32(v) { return new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]); }
    function concat() {
      var total = 0, i;
      for (i = 0; i < arguments.length; i++) total += arguments[i].length;
      var out = new Uint8Array(total), p = 0;
      for (i = 0; i < arguments.length; i++) { out.set(arguments[i], p); p += arguments[i].length; }
      return out;
    }
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = f.data, crc = crc32(data);
      var local = concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(date),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data);
      parts.push(local);
      central.push(concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(date),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset), name));
      offset += local.length;
    });
    var cd = concat.apply(null, central), end = concat(u32(0x06054b50), u16(0), u16(0),
      u16(files.length), u16(files.length), u32(cd.length), u32(offset), u16(0));
    return concat.apply(null, parts.concat([cd, end]));
  }
  function collectWordLines() {
    var out = [], seen = {}, items = [];
    var els = page.querySelectorAll('h1,h2,h3,p');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('.qmt-photo')) continue;
      var txt = (el.innerText || '').replace(/\u00a0/g, ' ').trim();
      if (!txt) continue;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      items.push({ el: el, txt: txt, top: r.top + window.scrollY, left: r.left + window.scrollX });
    }
    /* Word 表格的 DOM 顺序常是“按列”，这里按视觉位置重排成阅读顺序 */
    items.sort(function (a, b) {
      var ta = Math.round(a.top / 8), tb = Math.round(b.top / 8);
      return ta === tb ? a.left - b.left : ta - tb;
    });
    for (var j = 0; j < items.length; j++) {
      var el = items[j].el, txt = items[j].txt;
      if (seen[txt]) continue;
      seen[txt] = 1;
      var cs = getComputedStyle(el);
      var size = parseFloat(cs.fontSize) || 12;
      var bold = parseInt(cs.fontWeight, 10) >= 600 || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3';
      var SECTION_RE = /^(个人简历|基本信息|求职意向|报考信息|教育背景|工作经历|实习经历|项目经验|校园经历|技能特长|技能证书|荣誉证书|自我评价|兴趣爱好)$/;
      var head = txt.replace(/\s+/g, '');
      if (SECTION_RE.test(head)) {
        bold = true;
        size = head === '个人简历' ? 24 : 17;
      }
      var color = (cs.color || '').match(/\d+/g);
      out.push({
        text: txt.split(/\n+/).filter(Boolean).join(' / '),
        size: Math.max(9, Math.min(26, size * 0.75)),
        bold: bold,
        color: color && color.length >= 3 ? ('#' + color.slice(0, 3).map(function (n) { return ('0' + parseInt(n, 10).toString(16)).slice(-2); }).join('')) : null
      });
    }
    return out;
  }
  function exportDocx() {
    var lines = collectWordLines();
    if (!lines.length) { toast('没有可导出的文字'); return; }
    var body = lines.map(function (l) {
      var pr = '<w:pPr><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr>';
      var rpr = '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体"/>' +
        '<w:sz w:val="' + Math.round(l.size * 2) + '"/>' + (l.bold ? '<w:b/>' : '') +
        (l.color ? '<w:color w:val="' + l.color.replace('#', '').toUpperCase() + '"/>' : '') + '</w:rPr>';
      return '<w:p>' + pr + '<w:r>' + rpr + '<w:t xml:space="preserve">' + xmlEsc(l.text) + '</w:t></w:r></w:p>';
    }).join('');
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="284" w:footer="284" w:gutter="0"/>' +
      '</w:sectPr></w:body></w:document>';
    var files = [
      { name: '[Content_Types].xml', data: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>') },
      { name: '_rels/.rels', data: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>') },
      { name: 'word/document.xml', data: new TextEncoder().encode(doc) }
    ];
    download(new Blob([zipStore(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      (TPL.name || '简历') + '.docx');
    toast('已下载 DOCX（纯文字版，保留文字层级；版式请用 .doc 或 PDF）');
  }
  function buildWordPanel(p) {
    p.innerHTML = '<div class="qmt-panel-title">下载 Word <span style="font-weight:400;color:#7a8a93;font-size:11.5px">两种格式</span></div>' +
      '<div class="qmt-empty" style="margin-bottom:8px">要保留配色和分栏，选 .doc；要在 Word 里重新排版，选 .docx（纯文字）。</div>';
    var b1 = document.createElement('button');
    b1.type = 'button'; b1.className = 'qmt-mini wide'; b1.style.marginBottom = '6px';
    b1.textContent = '版式版 .doc（推荐）';
    b1.onclick = function () { closePanel(); exportWordDoc(); };
    var b2 = document.createElement('button');
    b2.type = 'button'; b2.className = 'qmt-mini wide';
    b2.textContent = '纯文字 .docx（可重排）';
    b2.onclick = function () { closePanel(); exportDocx(); };
    p.appendChild(b1); p.appendChild(b2);
  }
  function backupJSON() {
    var data = {
      app: 'qmt-resume', id: TPL.id, name: TPL.name,
      html: page.innerHTML, photo: null, theme: null, font: null, savedAt: new Date().toISOString()
    };
    try { data.photo = localStorage.getItem(PHOTO_KEY); } catch (e) {}
    try { data.theme = localStorage.getItem(THEME_KEY); } catch (e) {}
    try { data.font = localStorage.getItem(FONT_KEY); } catch (e) {}
    try { data.photoPos = localStorage.getItem(PHOTO_POS_KEY); } catch (e) {}
    try { data.photoZoom = localStorage.getItem(PHOTO_ZOOM_KEY); } catch (e) {}
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), (TPL.name || '简历') + '-备份.json');
  }
  function importJSON() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (!d || d.app !== 'qmt-resume' || typeof d.html !== 'string') throw new Error('bad');
          if (!confirm('导入「' + (d.name || '') + '」的备份？当前内容将被覆盖。')) return;
          try {
            localStorage.setItem(HTML_KEY, d.html);
            if (d.photo) localStorage.setItem(PHOTO_KEY, d.photo); else localStorage.removeItem(PHOTO_KEY);
            if (d.theme) localStorage.setItem(THEME_KEY, d.theme); else localStorage.removeItem(THEME_KEY);
            if (d.font) localStorage.setItem(FONT_KEY, d.font); else localStorage.removeItem(FONT_KEY);
            if (d.photoPos) localStorage.setItem(PHOTO_POS_KEY, d.photoPos); else localStorage.removeItem(PHOTO_POS_KEY);
            if (d.photoZoom) localStorage.setItem(PHOTO_ZOOM_KEY, d.photoZoom); else localStorage.removeItem(PHOTO_ZOOM_KEY);
          } catch (e) {}
          location.reload();
        } catch (err) { toast('备份文件格式不正确'); }
      };
      rd.readAsText(f);
    };
    inp.click();
  }
  function resetAll() {
    if (!confirm('确定恢复为模板示例内容？你的修改、照片、配色和字体将清空（可先备份JSON）。')) return;
    try {
      localStorage.removeItem(HTML_KEY);
      localStorage.removeItem(PHOTO_KEY);
      localStorage.removeItem(THEME_KEY);
      localStorage.removeItem(FONT_KEY);
      localStorage.removeItem(PHOTO_POS_KEY);
      localStorage.removeItem(PHOTO_ZOOM_KEY);
    } catch (e) {}
    location.reload();
  }

  /* ---- Word 转换修复：把被压成 1pt/3pt 的正文行高还原 ----
     这类段落来自 Word 的“固定行距”，直接渲染会让两行字叠在一起；
     只修有文字的段落，保留空段落作为间距。 */
  function normalizeLineHeight() {
    var ps = page.querySelectorAll('p[style*="line-height"]');
    Array.prototype.forEach.call(ps, function (p) {
      var lh = parseFloat(p.style.lineHeight);
      if (p.textContent.replace(/\s/g, '') && lh && lh < 8) p.style.lineHeight = 'normal';
    });
  }

  /* 页头模板的“个人简历”是 36pt，但 Word 导出的首行只有 14.23pt，字被行高裁掉。
     只放宽页头锚点的首行，不动其它行；挤出纸张则回退。 */
  function fixHeaderLayout() {
    var anchors = page.querySelectorAll('.qmt-anchor');
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var txt = (a.innerText || '').trim();
      if (txt.indexOf('个人简历') !== 0) continue;
      var tr = a.querySelector('tr');
      if (!tr) continue;
      var old = tr.style.height;
      tr.style.height = '60pt';
      if (page.scrollHeight > page.clientHeight + 2) tr.style.height = old;
      break;
    }
  }

  /* Word 转 HTML 后，章节标题和正文锚点共用一条边线，文字的字体度量会压到丝带上。
     给紧贴标题下沿的正文锚点留 6pt 上内边距，不改锚点坐标，避免整页级联位移。 */
  function padSectionStarts() {
    var TITLES = ['基本信息', '教育背景', '工作经历', '实习经历', '项目经历', '校园经历',
      '技能证书', '荣誉证书', '自我评价', '兴趣爱好', '专业技能', '个人信息'];
    var anchors = page.querySelectorAll('.qmt-anchor');
    if (anchors.length < 4) return;
    var titles = [];
    Array.prototype.forEach.call(anchors, function (a) {
      var txt = (a.innerText || '').trim();
      var h = parseFloat(a.style.height) || 0;
      if (h > 0 && h < 40 && TITLES.some(function (t) { return txt.indexOf(t) === 0; })) titles.push(a);
    });
    if (!titles.length) return;
    Array.prototype.forEach.call(anchors, function (a) {
      if (a.getAttribute('data-qmt-padded')) return;
      var txt = (a.innerText || '').trim();
      if (!txt || TITLES.some(function (t) { return txt.indexOf(t) === 0; })) return;
      if (a.querySelector('img.qmt-photo')) return;
      var top = parseFloat(a.style.top);
      if (!isFinite(top)) return;
      for (var i = 0; i < titles.length; i++) {
        var t = titles[i];
        var bottom = (parseFloat(t.style.top) || 0) + (parseFloat(t.style.height) || 0);
        if (Math.abs(top - bottom) < 2.5) {
          a.setAttribute('data-qmt-pad-prev', a.style.paddingTop || '');
          a.style.boxSizing = 'border-box';
          a.style.paddingTop = ((parseFloat(a.style.paddingTop) || 0) + 6) + 'pt';
          a.setAttribute('data-qmt-padded', '1');
          break;
        }
      }
    });
    // 如果补内边距后正文被挤出纸张，整页回退，宁可保持原样也不裁字。
    if (page.scrollHeight > page.clientHeight + 2) {
      Array.prototype.forEach.call(page.querySelectorAll('[data-qmt-padded]'), function (a) {
        a.style.paddingTop = a.getAttribute('data-qmt-pad-prev') || '';
        a.removeAttribute('data-qmt-padded');
        a.removeAttribute('data-qmt-pad-prev');
      });
    }
  }

  /* ---- 缩放适配 ---- */
  function fit() {
    if (THUMB) {
      document.documentElement.style.background = '#fff';
      document.body.style.cssText = 'margin:0;padding:0;background:#fff;display:block;overflow:hidden';
      var w0 = page.offsetWidth || 794;
      var s0 = Math.min(1, document.documentElement.clientWidth / w0);
      page.style.transformOrigin = 'top left';
      page.style.transform = s0 < 1 ? 'scale(' + s0 + ')' : 'none';
      page.style.margin = '0';
      page.style.boxShadow = 'none';
      page.style.borderRadius = '0';
      return;
    }
    if (EMBED) {
      var w = page.offsetWidth || 794;
      var s = Math.min(1, (document.documentElement.clientWidth - 2) / w);
      page.style.transform = 'scale(' + s + ')';
      page.style.transformOrigin = 'top left';
      page.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.alignItems = 'flex-start';
      document.body.style.display = 'block';
      return;
    }
    var avail = document.documentElement.clientWidth - 24;
    var w2 = page.offsetWidth;
    var s2 = Math.min(1, avail / w2);
    page.style.transformOrigin = 'top center';
    if (s2 < 1) {
      page.style.transform = 'scale(' + s2 + ')';
      page.style.marginBottom = (page.offsetHeight * (s2 - 1)) + 'px';
    } else {
      page.style.transform = '';
      page.style.marginBottom = '';
    }
  }
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(page);
  normalizeLineHeight();
  fixHeaderLayout();
  padSectionStarts();
  fit();
  checkOverflow();
  if (!THUMB) snap();

  /* ---- 快捷键：Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y（表单内让位给浏览器原生撤销） ---- */
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (t && t.isContentEditable && t !== page) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    var k = (e.key || '').toLowerCase();
    if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (k === 'y') { e.preventDefault(); redo(); }
  });

  /* 调试句柄（供自动化验证） */
  window.QMT = {
    version: '2.1', tpl: TPL, save: save, page: page, fit: fit,
    undo: undo, redo: redo, recolor: recolor, restoreColors: restoreColors,
    sectionGroups: sectionGroups, detectAccent: detectAccent,
    pageCount: pageCount, checkOverflow: checkOverflow, thumb: THUMB
  };
})();
