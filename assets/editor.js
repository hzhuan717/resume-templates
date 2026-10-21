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
      /* 模板页补 favicon：144 个编辑页此前没有图标，标签页显示空白且每开一页都会 404 一次 */
      var fav = document.querySelector('link[rel="icon"]');
      if (!fav) { fav = document.createElement('link'); fav.setAttribute('rel', 'icon'); document.head.appendChild(fav); }
      fav.setAttribute('type', 'image/svg+xml');
      fav.setAttribute('href', '../assets/favicon.svg');
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
  var TEXT_ZOOM_KEY = 'qmt:textZoom:' + TPL.id;
  var LINE_HEIGHT_KEY = 'qmt:lineHeight:' + TPL.id;
  var BLOCK_SPACE_KEY = 'qmt:blockSpace:' + TPL.id;
  var AVATAR = '../assets/avatar.svg';
  var FONT = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif';

  /* JSON 与本机草稿都按不可信 HTML 处理。仅保留简历排版需要的标签和属性，
     阻断脚本、事件属性、危险链接及 CSS 外部资源；普通模板 HTML/照片仍可还原。 */
  var SAFE_TAGS = ('a b br caption col colgroup dd div dl dt em h1 h2 h3 h4 h5 h6 hr i img li ol p section small span strike strong sub sup table tbody td tfoot th thead tr u ul').split(' ');
  var DROP_TAGS = { SCRIPT: 1, STYLE: 1, IFRAME: 1, FRAME: 1, OBJECT: 1, EMBED: 1, SVG: 1, MATH: 1, TEMPLATE: 1, LINK: 1, META: 1, BASE: 1 };
  var SAFE_ATTRS = { 'class': 1, 'id': 1, 'style': 1, 'title': 1, 'lang': 1, 'dir': 1, 'contenteditable': 1, 'spellcheck': 1,
    'src': 1, 'alt': 1, 'width': 1, 'height': 1, 'href': 1, 'target': 1, 'rel': 1,
    'rowspan': 1, 'colspan': 1, 'align': 1, 'valign': 1, 'border': 1, 'cellpadding': 1, 'cellspacing': 1 };
  var MAX_IMAGE_DATA_LENGTH = 8 * 1024 * 1024;
  function safeImageSource(value) {
    value = String(value || '').trim();
    if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value)) return value.length <= MAX_IMAGE_DATA_LENGTH ? value : '';
    if (!value || /[\u0000-\u0020\\]/.test(value)) return '';
    try {
      var u = new URL(value, location.href);
      if ((u.protocol === 'http:' || u.protocol === 'https:') && u.origin === location.origin) return value;
      if (location.protocol === 'file:' && u.protocol === 'file:') {
        var root = new URL(location.pathname.indexOf('/templates/') >= 0 ? '../' : './', location.href);
        if (u.pathname.indexOf(root.pathname) === 0) return value;
      }
      return '';
    } catch (e) { return ''; }
  }
  function safeLink(value) {
    value = String(value || '').trim();
    if (!value || /[\u0000-\u0020\\]/.test(value)) return '';
    if (/^(?:#|mailto:|tel:)/i.test(value)) return value;
    try {
      var u = new URL(value, location.href);
      return u.protocol === 'http:' || u.protocol === 'https:' ? value : '';
    } catch (e) { return ''; }
  }
  function cleanInlineStyle(value) {
    var parsed = document.createElement('span');
    var clean = document.createElement('span');
    parsed.style.cssText = String(value || '');
    for (var i = 0; i < parsed.style.length; i++) {
      var prop = parsed.style[i];
      var val = parsed.style.getPropertyValue(prop);
      if (/url\s*\(|expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|\\/i.test(val) || /^--/.test(prop)) continue;
      clean.style.setProperty(prop, val, parsed.style.getPropertyPriority(prop));
    }
    return clean.style.cssText;
  }
  function sanitizeResumeHTML(markup) {
    if (typeof markup !== 'string' || markup.length > 5 * 1024 * 1024) throw new Error('简历内容过大或格式不正确');
    var parsed = document.createElement('template');
    parsed.innerHTML = markup;
    function cleanNode(parent) {
      Array.prototype.slice.call(parent.childNodes).forEach(function (node) {
        if (node.nodeType !== 1) return;
        var tag = node.tagName.toUpperCase();
        if (DROP_TAGS[tag]) { node.remove(); return; }
        if (SAFE_TAGS.indexOf(tag.toLowerCase()) < 0) {
          var frag = document.createDocumentFragment();
          while (node.firstChild) frag.appendChild(node.firstChild);
          cleanNode(frag);
          node.parentNode.replaceChild(frag, node);
          return;
        }
        Array.prototype.slice.call(node.attributes).forEach(function (attr) {
          var name = attr.name.toLowerCase(), val = attr.value;
          if (/^on/i.test(name) || name === 'srcdoc' || name === 'formaction' ||
              (!(SAFE_ATTRS[name] || /^data-[a-z0-9_.:-]+$/.test(name) || /^aria-[a-z0-9_.:-]+$/.test(name)))) {
            node.removeAttribute(attr.name); return;
          }
          if (name === 'style') {
            var safeStyle = cleanInlineStyle(val);
            if (safeStyle) node.setAttribute('style', safeStyle); else node.removeAttribute('style');
          } else if (name === 'src') {
            var src = safeImageSource(val);
            if (src) node.setAttribute('src', src); else node.removeAttribute('src');
          } else if (name === 'href') {
            var href = safeLink(val);
            if (href) node.setAttribute('href', href); else node.removeAttribute('href');
          } else if (name === 'target' && val !== '_blank' && val !== '_self') {
            node.removeAttribute('target');
          } else if (name === 'contenteditable' && !/^(?:true|false|plaintext-only)$/i.test(val)) {
            node.removeAttribute('contenteditable');
          }
        });
        if (node.tagName === 'A' && node.getAttribute('target') === '_blank') node.setAttribute('rel', 'noopener noreferrer');
        cleanNode(node);
      });
    }
    cleanNode(parsed.content);
    return parsed.innerHTML;
  }

  /* ---- 注入样式：工具条（沿用原版规格）+ 面板（白蓝主题） ---- */
  var css = document.createElement('style');
  css.textContent = [
    /* ===== 工具条：浅色玻璃拟态，保持原版按钮规格与分组 ===== */
    '.qmt-toolbar{position:fixed;left:50%;transform:translateX(-50%);top:0;z-index:9999;display:flex;flex-wrap:nowrap;align-items:center;gap:10px;max-width:100vw;padding:8px 14px;background:rgba(255,255,255,.93);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#264A5A;font-size:12.5px;border:1px solid rgba(213,226,233,.95);border-top:0;border-radius:0 0 14px 14px;box-shadow:0 8px 28px rgba(16,40,52,.12);font-family:' + FONT + ';white-space:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}',
    '.qmt-toolbar::-webkit-scrollbar{display:none}',
    '.qmt-toolbar .qmt-hint{opacity:.62;font-size:12.5px;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}',
    '.qmt-toolbar button,.qmt-toolbar a.qmt-link{font-family:inherit;font-size:12.5px;cursor:pointer;text-decoration:none;border:1px solid #d5e2e8;background:#fff;color:#264A5A;padding:4px 12px;border-radius:7px;transition:all .16s ease;white-space:nowrap;flex:0 0 auto;box-shadow:0 1px 2px rgba(16,40,52,.05)}',
    '.qmt-toolbar button:hover,.qmt-toolbar a.qmt-link:hover{background:#0e7c86;border-color:#0e7c86;color:#fff;box-shadow:0 3px 10px rgba(14,124,134,.28)}',
    '.qmt-badge{display:none;background:#c0392b;color:#fff;border-radius:10px;padding:2px 10px;font-size:12px;flex:0 0 auto}',
    '.qmt-toolbar .qmt-sep{width:1px;height:16px;background:#e2eaef;flex:0 0 auto}',
    /* 危险操作：与常规按钮拉开视觉差距，避免误点 */
    '.qmt-toolbar button.qmt-danger{border-color:#eec5be;color:#c0392b;background:#fff}',
    '.qmt-toolbar button.qmt-danger:hover{background:#c0392b;border-color:#c0392b;color:#fff;box-shadow:0 3px 10px rgba(192,57,43,.3)}',
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
    /* ===== 编辑面板：桌面端（>900px）固定右侧栏；窄屏回退为底部抽屉（见下方 media） ===== */
    '.qmt-form{position:fixed;right:0;top:var(--qmt-tb,43px);width:370px;max-width:100vw;min-width:0;box-sizing:border-box;overflow:hidden;height:calc(100vh - var(--qmt-tb,43px));background:#fff;z-index:2147483200;border-left:1px solid #dfe8ed;box-shadow:-16px 0 44px rgba(16,40,52,.10);display:flex;flex-direction:column;font-family:' + FONT + ';color:#264a5a;transform:translateX(105%);transition:transform .24s ease}',
    '.qmt-form.open{transform:none}',
    'body.qmt-form-open .qmt-rail{display:none}',
    '.qmt-form-head{height:46px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid #edf2f5;flex:0 0 auto;background:linear-gradient(#fbfdfe,#fff)}',
    '.qmt-form-head b{font-size:13.5px;letter-spacing:.01em}',
    '.qmt-form-head span{font-size:11.5px;color:#8a99a2}',
    '.qmt-form-head button{margin-left:auto;border:1px solid #dde7ec;background:#f6f9fa;color:#264a5a;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;transition:all .15s ease}',
    '.qmt-form-head button:hover{background:#0e7c86;border-color:#0e7c86;color:#fff}',
    '.qmt-form-tabs{display:flex;gap:2px;overflow-x:auto;padding:0 12px;border-bottom:1px solid #edf2f5;flex:0 0 auto;scrollbar-width:thin}',
    '.qmt-form-tab{flex:0 0 auto;border:0;background:transparent;color:#8a99a2;padding:11px 11px 10px;font-size:12.5px;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:color .15s ease}',
    '.qmt-form-tab:hover{color:#264a5a}',
    '.qmt-form-tab .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#22b8a6;margin-right:5px;vertical-align:1px}',
    '.qmt-form-tab .dot.off{background:#cbd6dc}',
    '.qmt-form-photo{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:2px 0 6px}',
    '.qmt-form-photo button{border:1px solid #bfe3e4;border-radius:8px;background:#eaf6f7;color:#0e7c86;font-size:12px;padding:7px 12px;cursor:pointer;transition:all .15s ease}',
    '.qmt-form-photo button:hover{background:#0e7c86;border-color:#0e7c86;color:#fff}',
    '.qmt-form-photo span{font-size:11.5px;color:#8a99a2}',
    /* 条目卡：添加/删除一段经历 */
    '.qmt-entry-card{grid-column:1/-1;border:1px solid #e3ebef;border-radius:12px;padding:12px 13px 13px;background:#fff;min-width:0;box-shadow:0 2px 8px rgba(16,40,52,.04)}',
    '.qmt-entry-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;font-size:12px;color:#8a99a2;font-weight:700}',
    '.qmt-entry-del{border:1px solid #f0c7bf;background:#fff;color:#c0392b;border-radius:7px;font-size:11.5px;padding:3px 10px;cursor:pointer;transition:all .15s ease}',
    '.qmt-entry-del:hover{background:#c0392b;color:#fff;border-color:#c0392b}',
    '.qmt-entry-fields{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;min-width:0}',
    '.qmt-entry-add{grid-column:1/-1;border:1.5px dashed #9fc4cb;background:#f5fafa;color:#0e7c86;border-radius:12px;padding:11px;font-size:12.5px;cursor:pointer;transition:all .15s ease}',
    '.qmt-entry-add:hover{background:#e6f4f5;border-color:#0e7c86}',
    /* 宽字段（时间/单位/职位三段行）占满整行 */
    '.qmt-field-wide{grid-column:1/-1}',
    '.qmt-field-row{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;min-width:0}',
    '.qmt-form-tab.on{color:#0e7c86;font-weight:700;border-bottom-color:#0e7c86}',
    '.qmt-form-tab.on .dot{background:#22b8a6}',
    '.qmt-form-body{flex:1;overflow:auto;padding:14px 16px 20px;display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-content:start}',
    '.qmt-field{min-width:0}',
    '.qmt-field label{display:block;font-size:11.5px;color:#8a99a2;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.01em}',
    '.qmt-field input,.qmt-field textarea{width:100%;box-sizing:border-box;border:1px solid #dbe5ea;border-radius:8px;background:#fbfdfe;color:#264a5a;padding:8px 10px;font-size:12.5px;font-family:inherit;line-height:1.45;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}',
    '.qmt-field input:hover,.qmt-field textarea:hover{border-color:#b9cdd4}',
    '.qmt-field input:focus,.qmt-field textarea:focus{outline:0;border-color:#0e7c86;background:#fff;box-shadow:0 0 0 3px rgba(14,124,134,.14)}',
    '.qmt-field textarea{resize:vertical;min-height:58px}',
    '.qmt-form-empty{grid-column:1/-1;color:#8a99a2;font-size:12.5px;line-height:1.7;padding:14px 0}',
    '.qmt-form-btn{position:fixed;right:18px;bottom:18px;z-index:2147483100;border:0;border-radius:999px;background:#0e7c86;color:#fff;padding:12px 19px;font-size:13px;font-family:' + FONT + ';cursor:pointer;box-shadow:0 10px 26px rgba(14,124,134,.36);transition:all .16s ease}',
    '.qmt-form-btn:hover{background:#0a6b73;transform:translateY(-1px);box-shadow:0 12px 30px rgba(14,124,134,.42)}',
    '@media (max-width:900px){.qmt-form-btn{right:12px;bottom:12px;padding:10px 14px;font-size:12.5px}}',
    'body.qmt-form-open{padding-right:370px!important}',
    'body.qmt-form-open .qmt-form-btn{display:none!important}',
    '@media (max-width:700px){.qmt-toolbar{left:0;transform:none;width:100%;max-width:100%;box-sizing:border-box}}',
    /* 窄屏（≤900px）：编辑面板回退为底部抽屉，行为与旧版一致 */
    '@media (max-width:900px){.qmt-form{left:0;right:0;top:auto;bottom:0;width:100vw;max-width:100vw;height:56vh;transform:translateY(102%);border-left:0;border-top:1px solid #e2eaef;box-shadow:0 -14px 40px rgba(16,40,52,.16)}.qmt-form.open{transform:none}.qmt-form-head,.qmt-form-tabs,.qmt-form-body{min-width:0;max-width:100%}.qmt-form-body{padding:10px 12px 14px}body.qmt-form-open{padding-right:0!important;padding-bottom:58vh!important}}',
    '@media print{.qmt-rail{display:none!important}}',
    /* ===== 面板：白底 + 柔和阴影 ===== */
    '.qmt-panel{position:fixed;z-index:2147483100;background:#fff;color:#264A5A;border:1px solid #dde7ec;border-radius:14px;box-shadow:0 14px 44px rgba(16,40,52,.16);padding:14px 16px;font-family:' + FONT + ';font-size:13px;min-width:240px;max-width:min(78vw,340px)}',
    '.qmt-panel-title{font-weight:700;margin:0 0 10px;font-size:13px;color:#264A5A;letter-spacing:.01em}',
    '.qmt-panel-sub{font-weight:700;font-size:12px;color:#4b616c;margin:14px 0 8px;padding-top:11px;border-top:1px solid #eef3f5;letter-spacing:.01em}',
    '.qmt-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid #eef3f5}',
    '.qmt-row:first-of-type{border-top:0}',
    '.qmt-row-name{color:#2b3a42;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.qmt-mini{font-family:inherit;font-size:12px;cursor:pointer;border:1px solid #cfdde3;background:#fff;color:#264A5A;padding:4px 11px;border-radius:7px;white-space:nowrap;flex:0 0 auto;transition:all .15s ease}',
    '.qmt-mini:hover{background:#0e7c86;border-color:#0e7c86;color:#fff}',
    '.qmt-mini.on{background:#0e7c86;border-color:#0e7c86;color:#fff}',
    '.qmt-mini.wide{flex:1 1 auto;text-align:center}',
    '.qmt-empty{color:#8a99a2;font-size:12.5px;line-height:1.75;padding:2px}',
    '.qmt-swatches{display:flex;flex-wrap:wrap;gap:9px;padding:2px}',
    '.qmt-swatch{width:32px;height:32px;border-radius:50%;border:2px solid rgba(38,74,90,.16);cursor:pointer;padding:0;flex:0 0 auto;transition:all .14s ease;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}',
    '.qmt-swatch:hover{transform:scale(1.14);border-color:#264A5A}',
    '.qmt-swatch.on{border-color:#264A5A;box-shadow:0 0 0 3px rgba(38,74,90,.18)}',
    /* 滑杆：自定义轨道与拇指（排版/照片缩放共用） */
    '.qmt-slider-row{display:flex;align-items:center;gap:10px;padding:7px 0}',
    '.qmt-slider-name{flex:0 0 60px;font-size:12px;color:#2b3a42}',
    '.qmt-slider-val{flex:0 0 48px;text-align:right;font-size:12px;color:#264A5A;font-variant-numeric:tabular-nums}',
    '.qmt-range{flex:1;min-width:0;-webkit-appearance:none;appearance:none;height:4px;border-radius:999px;background:#dce7eb;outline:none;cursor:pointer;padding:0;border:0}',
    '.qmt-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:#0e7c86;border:2.5px solid #fff;box-shadow:0 1px 6px rgba(14,124,134,.45);cursor:pointer;transition:transform .12s ease}',
    '.qmt-range::-webkit-slider-thumb:hover{transform:scale(1.15)}',
    '.qmt-range::-moz-range-thumb{width:11px;height:11px;border-radius:50%;background:#0e7c86;border:2.5px solid #fff;box-shadow:0 1px 6px rgba(14,124,134,.45);cursor:pointer}',
    '.qmt-range::-moz-range-track{height:4px;border-radius:999px;background:#dce7eb}',
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
    '  html,body,body.qmt-form-open{background:#fff!important;margin:0!important;padding:0!important}',
    '  .qmt-toolbar,.qmt-panel,.qmt-badge,.qmt-form,.qmt-form-btn{display:none!important}',
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
      if (saved) {
        var cleanSaved = sanitizeResumeHTML(saved);
        page.innerHTML = cleanSaved;
        if (cleanSaved !== saved) localStorage.setItem(HTML_KEY, cleanSaved);
      }
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
    dataUrl = safeImageSource(dataUrl);
    if (!dataUrl) return;
    Array.prototype.forEach.call(photoImgs(), function (im) { im.src = dataUrl; });
  }
  function applyPhotoPos(pos) {
    Array.prototype.forEach.call(photoImgs(), function (im) {
      im.style.objectFit = 'cover';
      im.style.objectPosition = pos;
    });
  }
  function currentPhotoPos() {
    try {
      var p = localStorage.getItem(PHOTO_POS_KEY) || '';
      return ['50% 18%', '50% 50%', '50% 82%'].indexOf(p) >= 0 ? p : '';
    } catch (e) { return ''; }
  }
  function applyPhotoZoom(z) {
    var pct = Math.max(100, Math.min(180, parseInt(z, 10) || 100));
    Array.prototype.forEach.call(photoImgs(), function (im) {
      im.style.transformOrigin = '50% 50%';
      im.style.transform = pct > 100 ? 'scale(' + (pct / 100) + ')' : '';
      /* 缩放裁切由 .page（position:relative + overflow:hidden，照片的包含块）完成；
         不要再给照片父级加 overflow:hidden —— classic-teal 里父级是整个 section，
         会把负 margin 伸出的章节丝带头裁掉（「基本信息」变「本信息」），而且对
         绝对定位的照片根本没有裁切作用 */
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
  function isPdfPage() { return !!(page && page.classList.contains('qmt-pdf')); }
  function checkOverflow() {
    var n = pageCount();
    var pe = document.getElementById('qmtPageState');
    if (pe) pe.textContent = n + ' 页';
    if (!badge) return;
    var designed = (window.QMT_TPL && +window.QMT_TPL.pages) || 1;
    if (designed > 1) {
      badge.textContent = n > designed ? ('当前 ' + n + ' 页 · 超出原版') : ('共 ' + designed + ' 页');
      badge.style.display = 'inline-block';
      return;
    }
    badge.textContent = n > 1 ? ('当前 ' + n + ' 页 · 建议精简') : '';
    badge.style.display = n > 1 ? 'inline-block' : 'none';
  }

  /* ================= 配色（蓝色系，按计算色重着色，适配全部模板） ================= */
  var PALETTE = [
    ['#264A5A', '灰蓝 · 原版'], ['#2C5F8A', '靛蓝'], ['#1F3B57', '深藏青'], ['#3A7CA5', '天青'],
    ['#4A6FA5', '钢蓝'], ['#2E6E9E', '经典蓝'], ['#33768F', '青蓝'], ['#5A7184', '石板蓝灰'],
    ['#2A9D8F', '青碧'], ['#2E7D5B', '墨绿'], ['#6B5CA5', '黛紫'], ['#7A4E9E', '紫罗兰'],
    ['#9E3B4E', '酒红'], ['#C05A3C', '砖红'], ['#C77828', '秋橙'], ['#8A6D4B', '咖啡棕']
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
    try {
      var t = JSON.parse(localStorage.getItem(THEME_KEY));
      return t && PALETTE.some(function (x) { return x[0] === t.c; }) ? t : null;
    } catch (e) { return null; }
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
    try {
      var f = localStorage.getItem(FONT_KEY);
      return FONTS.some(function (x) { return x[1] === f; }) ? f : null;
    } catch (e) { return null; }
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

  /* ================= 排版：文字大小 / 行距 / 模块间距 =================
     原始值首次应用时存 data 属性（原始内联值 + 计算像素基准），
     反复拖动不叠加误差；HTML 快照会带上这些属性，刷新/撤销后幂等。 */
  /* 文字大小作用目标：PDF 模板全部 .qmt-t；流式模板含直接文字节点的叶子元素
     （px 绝对值写回，父子同时命中也不会叠加缩放） */
  function textTargets() {
    if (isPdfPage()) return Array.prototype.slice.call(page.querySelectorAll('.qmt-t'));
    var all = Array.prototype.slice.call(page.querySelectorAll('h1,h2,h3,h4,p,li,.li,td,span,div,a,b,strong'));
    return all.filter(function (el) {
      if (el.closest('.qmt-photo')) return false;
      for (var n = 0; n < el.childNodes.length; n++) {
        var nd = el.childNodes[n];
        if (nd.nodeType === 3 && nd.nodeValue.replace(/\s/g, '')) return true;
      }
      return false;
    });
  }
  function applyTextZoom(pct) {
    pct = Math.max(90, Math.min(110, parseInt(pct, 10) || 100));
    textTargets().forEach(function (el) {
      if (!el.hasAttribute('data-qmt-fsb')) {
        el.setAttribute('data-qmt-fs', el.style.fontSize || '');
        el.setAttribute('data-qmt-fsb', String(parseFloat(getComputedStyle(el).fontSize) || 0));
      }
      if (pct === 100) {
        el.style.fontSize = el.getAttribute('data-qmt-fs');
      } else {
        var base = parseFloat(el.getAttribute('data-qmt-fsb'));
        if (base > 0) el.style.fontSize = (base * pct / 100).toFixed(2) + 'px';
      }
    });
    return pct;
  }
  function currentTextZoom() {
    try { return parseInt(localStorage.getItem(TEXT_ZOOM_KEY), 10) || 100; } catch (e) { return 100; }
  }
  /* 行距：1 = 模板原样；其它值 = 原始计算行高 × 倍率。
     data-qmt-lh 标记过的元素 normalizeLineHeight() 不再插手（用户值优先）。 */
  function lhTargets() {
    if (isPdfPage()) {
      return Array.prototype.filter.call(page.querySelectorAll('.qmt-t'), function (el) {
        if (/<br\s*\/?>/i.test(el.innerHTML)) return true;
        var fs = parseFloat(getComputedStyle(el).fontSize) || 12;
        return el.offsetHeight > fs * 1.7;   /* 只动多行文字块，单行定位行不受影响 */
      });
    }
    return Array.prototype.slice.call(page.querySelectorAll('p,li,.li'));
  }
  function applyLineHeight(f) {
    f = Math.max(0.9, Math.min(1.6, parseFloat(f) || 1));
    lhTargets().forEach(function (el) {
      if (!el.hasAttribute('data-qmt-lhb')) {
        el.setAttribute('data-qmt-lh', el.style.lineHeight || '');
        el.setAttribute('data-qmt-lhb', String(parseFloat(getComputedStyle(el).lineHeight) || 0));
      }
      if (Math.abs(f - 1) < 0.001) {
        el.style.lineHeight = el.getAttribute('data-qmt-lh');
      } else {
        var base = parseFloat(el.getAttribute('data-qmt-lhb'));
        if (base > 0) el.style.lineHeight = (base * f).toFixed(2) + 'px';
      }
    });
    return f;
  }
  function currentLineHeight() {
    try { return parseFloat(localStorage.getItem(LINE_HEIGHT_KEY)) || 1; } catch (e) { return 1; }
  }
  /* 模块/段落间距：仅流式模板；section.sec/.entry 的上下外边距 × 倍率（1 = 原样）。
     t001-t003 这类没有 sec/entry 结构的流式模板回退到顶层内容块。 */
  function blockSpaceTargets() {
    if (isPdfPage()) return [];
    var t = Array.prototype.slice.call(page.querySelectorAll('section.sec, .entry'));
    if (!t.length) {
      t = Array.prototype.slice.call(page.children).filter(function (el) {
        return !el.classList.contains('qmt-photo') && (el.textContent || '').replace(/\s/g, '');
      });
    }
    return t;
  }
  function applyBlockSpace(f) {
    f = Math.max(0.5, Math.min(2, parseFloat(f) || 1));
    blockSpaceTargets().forEach(function (el) {
      if (!el.hasAttribute('data-qmt-sp')) {
        var cs = getComputedStyle(el);
        el.setAttribute('data-qmt-sp', JSON.stringify({
          mt: el.style.marginTop || '', mb: el.style.marginBottom || '',
          mtb: parseFloat(cs.marginTop) || 0, mbb: parseFloat(cs.marginBottom) || 0
        }));
      }
      var o;
      try { o = JSON.parse(el.getAttribute('data-qmt-sp')); } catch (e) { return; }
      if (Math.abs(f - 1) < 0.001) {
        el.style.marginTop = o.mt;
        el.style.marginBottom = o.mb;
      } else {
        el.style.marginTop = (o.mtb * f).toFixed(2) + 'px';
        el.style.marginBottom = (o.mbb * f).toFixed(2) + 'px';
      }
    });
    return f;
  }
  function currentBlockSpace() {
    try { return parseFloat(localStorage.getItem(BLOCK_SPACE_KEY)) || 1; } catch (e) { return 1; }
  }

  /* ================= 版块管理（结构化模板精确匹配，其余按顶层内容块回退） ================= */
  function labelOf(el) {
    var t = (el.textContent || '').replace(/[\s\u3000]+/g, ' ').trim();
    if (!t) return '内容块';
    var seg = t.split(/[\n\r·|｜]/)[0].trim() || t;
    return seg.length > 12 ? seg.slice(0, 12) + '…' : seg;
  }
  function sectionGroups() {
    if (isPdfPage()) return outlineGroups();
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

  /* ================= 模块表单（底部面板） ================= */
  var FORM_NAMES = ['基本信息', '个人资料', '个人信息', '联系方式', '求职意向', '教育背景', '工作经历',
    '实习经历', '实习经验', '项目经历', '项目经验', '校园经历', '校内实践', '实践经历', '技能特长',
    '技能证书', '荣誉证书', '获奖经历', '自我评价', '兴趣爱好', '主修课程', '个人荣誉'];
  function pdfFormSections() {
    var spans = Array.prototype.slice.call(page.querySelectorAll('.qmt-t'));
    var heads = [], used = {};
    spans.forEach(function (el, i) {
      var t = (el.textContent || '').replace(/[\s\u3000]/g, '');
      for (var k = 0; k < FORM_NAMES.length; k++) {
        var n = FORM_NAMES[k];
        if (!used[n] && (t === n || t.indexOf(n) === 0)) {
          used[n] = 1; heads.push({ i: i, label: n, el: el }); break;
        }
      }
    });
    if (!heads.length) {
      var loose = spans.filter(function (el) { return (el.textContent || '').trim(); });
      return loose.length ? [{ label: '全部内容', titleEl: null, ps: loose.slice(0, 80) }] : [];
    }
    var out = [];
    if (heads[0].i > 0) {
      var pre = spans.slice(0, heads[0].i).filter(function (el) { return (el.textContent || '').trim(); });
      if (pre.length) out.push({ label: '基本信息', titleEl: null, ps: pre });
    }
    heads.forEach(function (h, j) {
      var end = j + 1 < heads.length ? heads[j + 1].i : spans.length;
      var ps = spans.slice(h.i + 1, end).filter(function (el) { return (el.textContent || '').trim(); });
      if (ps.length) out.push({ label: h.label, titleEl: h.el, ps: ps });
    });
    return out;
  }
  function formSections() {
    if (isPdfPage()) return pdfFormSections();
    var secs = page.querySelectorAll('section.sec');
    if (secs.length) {
      return Array.prototype.map.call(secs, function (sec) {
        var bar = sec.querySelector('.sec-title .bar');
        var body = sec.querySelector('.sec-body') || sec;
        var seen = [], list = [];
        body.querySelectorAll('.info-grid > div, .entry-head > span, .li, p').forEach(function (el) {
          if (seen.indexOf(el) >= 0) return;
          seen.push(el); list.push(el);
        });
        return { label: bar ? bar.textContent.trim() : '版块', sec: sec, titleEl: bar || sec, ps: list };
      }).filter(function (s) { return s.ps.length; });
    }
    var groups = outlineGroups();
    if (!groups.length) {
      var loose = Array.prototype.slice.call(page.querySelectorAll(isPdfPage() ? '.qmt-t' : 'p,li')).filter(function (el) {
        return (el.innerText || '').trim() && !el.closest('.qmt-photo');
      });
      if (!loose.length) {
        loose = Array.prototype.slice.call(page.querySelectorAll('td')).filter(function (el) {
          return (el.innerText || '').trim().length > 1;
        });
      }
      if (!loose.length) return [];
      return [{ label: '全部内容', titleEl: null, ps: loose.slice(0, 80) }];
    }
    var isPdf = isPdfPage();
    var all = Array.prototype.slice.call(isPdf ? page.querySelectorAll('.qmt-t') : page.querySelectorAll('p')).filter(function (p) {
      return !p.closest('.qmt-photo') && (p.innerText || '').trim();
    });
    var items = groups.map(function (g) {
      var el = g.els[0], r = el.getBoundingClientRect();
      return { label: g.label, titleEl: el, top: r.top + window.scrollY, ps: [] };
    }).sort(function (a, b) { return a.top - b.top; });
    items.forEach(function (s, i) {
      var end = i + 1 < items.length ? items[i + 1].top : Infinity;
      all.forEach(function (p) {
        if (p === s.titleEl || s.titleEl.contains(p)) return;
        var r = p.getBoundingClientRect();
        var top = r.top + window.scrollY;
        if (top >= s.top + 4 && top < end) s.ps.push(p);
      });
      s.ps.sort(function (a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return Math.abs(ra.top - rb.top) > 4 ? ra.top - rb.top : ra.left - rb.left;
      });
    });
    return items.filter(function (s) { return s.ps.length; });
  }
  var formEl = null, formOpen = false, formTimer = null;
  function formSchedule() {
    if (formTimer) clearTimeout(formTimer);
    formTimer = setTimeout(function () { save(); checkOverflow(); }, 250);
  }
  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  /* 短值用单行 input，长文才用 textarea：不再让「胡小豆」三个字占三行高 */
  function mkValInput(value, oninput) {
    var short = value.indexOf('\n') < 0 && value.trim().length <= 30;
    var input = document.createElement(short ? 'input' : 'textarea');
    if (short) { input.type = 'text'; } else { input.rows = 2; }
    input.value = value;
    input.addEventListener('input', function () { oninput(input.value); });
    return input;
  }
  /* PDF 模板里「时间   单位   职位」是一个整块 span：拆成三个命名单元格，写回时按原分隔拼回 */
  function makeTripleField(parts, el) {
    var wrap = document.createElement('div');
    wrap.className = 'qmt-field qmt-field-wide';
    var row = document.createElement('div');
    row.className = 'qmt-field-row';
    var labels = ['时间', '单位 / 学校', '职位 / 专业'];
    var inputs = parts.slice(0, 3).map(function (pt, i) {
      var cell = document.createElement('div');
      cell.className = 'qmt-field';
      var lab = document.createElement('label');
      lab.textContent = labels[i] || ('其他 ' + (i - 2));
      cell.appendChild(lab);
      row.appendChild(cell);
      var input = document.createElement('input');
      input.type = 'text';
      input.value = pt.trim();
      input.addEventListener('input', sync);
      cell.appendChild(input);
      return input;
    });
    function sync() {
      el.textContent = inputs.map(function (x) { return x.value; }).join('          ');
      formSchedule();
    }
    wrap.appendChild(row);
    return wrap;
  }
  function makeFormField(section, p, idx) {
    var wrap = document.createElement('div');
    wrap.className = 'qmt-field';
    var lab = document.createElement('label');
    var input, txt = (p.innerText || '').trim();
    var m = txt.match(/^([^：:]{1,12})[：:]\s*([\s\S]*)$/);
    var isBasic = /基本信息|个人资料|个人信息|联系方式/.test(section.label);
    var lblEl = p.querySelector && p.querySelector('.lbl');
    if (lblEl) {
      var lname = (lblEl.textContent || '').trim();
      var lval = txt.replace(lname, '').replace(/^[：:]\s*/, '');
      lab.textContent = lname;
      input = mkValInput(lval, function (v) {
        p.innerHTML = '<span class="lbl">' + escHtml(lname) + '</span>：' + escHtml(v);
        formSchedule();
      });
    } else if (isBasic && m) {
      lab.textContent = m[1].replace(/\s+/g, ' ').trim();
      input = document.createElement('input');
      input.type = 'text';
      input.value = m[2].trim();
      input.addEventListener('input', function () {
        p.textContent = m[1] + '：' + input.value;
        formSchedule();
      });
    } else if (p.matches && p.matches('.entry-head > span')) {
      lab.textContent = p.classList.contains('date') ? '时间' : (p.classList.contains('role') ? '职位/专业' : '单位/学校');
      input = document.createElement('input');
      input.type = 'text'; input.value = txt;
      input.addEventListener('input', function () { p.textContent = input.value; formSchedule(); });
    } else if (isPdfPage() && !isBasic && /[\dXx＊*]/.test(txt.slice(0, 14)) && txt.split(/\s{3,}/).length >= 3 && txt.split(/\s{3,}/)[0].length <= 24) {
      /* 整块的「时间   单位   职位」行拆成三个字段；超过三段的部分并入第三段，避免写回时丢字 */
      var parts = txt.split(/\s{3,}/);
      if (parts.length > 3) parts = parts.slice(0, 2).concat([parts.slice(2).join('          ')]);
      return makeTripleField(parts, p);
    } else {
      /* 大字号行通常是简历标题/姓名，给个看得懂的字段名 */
      var fs = 0;
      try { fs = parseFloat(getComputedStyle(p).fontSize) || 0; } catch (e) {}
      lab.textContent = (idx === 0 && fs >= 20) ? '简历标题 / 姓名' : (section.label + ' · 第 ' + (idx + 1) + ' 条');
      input = mkValInput(txt, function (v) {
        p.textContent = v;
        formSchedule();
      });
    }
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return wrap;
  }
  /* ================= 条目级 添加 / 删除 ================= */
  /* 经典模板（普通文档流）：克隆/移除 .entry 节点，下方内容自然重排。
     PDF 定位模板：克隆条目的文字块并把下方所有文字块下移腾位；删除则反向收拢。
     位移会进撤销栈（Ctrl+Z 可回退），超页时超页徽标会提示。 */
  function isEntryHeadText(txt) {
    if (!/[\dXx＊*]/.test(txt.slice(0, 14))) return false;
    var parts = txt.split(/\s{3,}/);
    return parts.length >= 3 && parts[0].length <= 24;
  }
  function pdfEntryGroups(section) {
    var groups = [], cur = null;
    section.ps.forEach(function (el) {
      if (isEntryHeadText((el.textContent || '').trim())) {
        cur = { head: el, rows: [] };
        groups.push(cur);
      } else if (cur) {
        cur.rows.push(el);
      }
    });
    return groups.length ? groups : null;
  }
  function spanTop(el) { return parseFloat(el.style.top) || 0; }
  function spanBottom(el) { return spanTop(el) + (parseFloat(el.style.height) || 14); }
  function shiftSpansBelow(y, delta) {
    Array.prototype.forEach.call(page.querySelectorAll('.qmt-t'), function (el) {
      var t = spanTop(el);
      if (t >= y - 0.5) el.style.top = (t + delta) + 'pt';
    });
  }
  function entrySpanRange(g) {
    var all = [g.head].concat(g.rows);
    var top = Infinity, bottom = -Infinity;
    all.forEach(function (el) {
      top = Math.min(top, spanTop(el));
      bottom = Math.max(bottom, spanBottom(el));
    });
    return { all: all, top: top, bottom: bottom };
  }
  function afterEntryChange(msg) {
    var idx = 0;
    try {
      var tabs = formEl ? formEl.querySelectorAll('.qmt-form-tab') : [];
      for (var i = 0; i < tabs.length; i++) if (tabs[i].classList.contains('on')) idx = i;
    } catch (e) {}
    save(); snap(); checkOverflow();
    if (formEl) { formEl.remove(); formEl = null; }
    toggleForm(true);
    var tabs2 = formEl.querySelectorAll('.qmt-form-tab');
    if (tabs2[idx]) tabs2[idx].click();
    toast(msg);
  }
  function pdfAddEntry(section) {
    var groups = pdfEntryGroups(section);
    if (!groups) return false;
    var r = entrySpanRange(groups[groups.length - 1]);
    var gap = 6;
    if (groups.length >= 2) {
      var prevTop = spanTop(groups[groups.length - 2].head);
      gap = Math.max(2, Math.min(28, r.top - prevTop - (r.bottom - r.top)));
    }
    var delta = (r.bottom - r.top) + gap;
    var clones = r.all.map(function (el) {
      var c = el.cloneNode(true);
      c.style.top = (spanTop(el) + delta) + 'pt';
      return c;
    });
    shiftSpansBelow(r.bottom, delta);
    var anchor = r.all[r.all.length - 1];
    clones.forEach(function (c) {
      anchor.parentNode.insertBefore(c, anchor.nextSibling);
      anchor = c;
    });
    afterEntryChange('已添加一条（复制了上一条，直接改文字）');
    return true;
  }
  function pdfDeleteEntry(section, g) {
    var r = entrySpanRange(g);
    var delta = (r.bottom - r.top) + 6;
    r.all.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    shiftSpansBelow(r.bottom, -delta);
    afterEntryChange('已删除该条（Ctrl+Z 可撤销）');
    return true;
  }
  function entryCardShell(title, onDelete) {
    var card = document.createElement('div');
    card.className = 'qmt-entry-card';
    var head = document.createElement('div');
    head.className = 'qmt-entry-head';
    var t = document.createElement('span');
    t.textContent = title;
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'qmt-entry-del';
    del.textContent = '删除此条';
    del.addEventListener('click', onDelete);
    head.appendChild(t); head.appendChild(del);
    var fields = document.createElement('div');
    fields.className = 'qmt-entry-fields';
    card.appendChild(head); card.appendChild(fields);
    return card;
  }
  function appendAddButton(body, onAdd) {
    var add = document.createElement('button');
    add.type = 'button'; add.className = 'qmt-entry-add';
    add.textContent = '＋ 添加一条';
    add.addEventListener('click', onAdd);
    body.appendChild(add);
  }
  /* 条目视图：返回 true 表示该模块已按条目卡渲染（调用方不再渲染平铺字段） */
  function buildEntryCards(section, body) {
    if (isPdfPage()) {
      var groups = pdfEntryGroups(section);
      if (!groups) return false;
      groups.forEach(function (g, gi) {
        body.appendChild(entryCardShell('第 ' + (gi + 1) + ' 条', function () {
          if (groups.length <= 1 && !confirm('这是本模块最后一条，删除后模块就空了。继续？')) return;
          pdfDeleteEntry(section, g);
        }));
        var fields = body.lastChild.querySelector('.qmt-entry-fields');
        var headTxt = (g.head.textContent || '').trim();
        var parts = headTxt.split(/\s{3,}/);
        if (parts.length > 3) parts = parts.slice(0, 2).concat([parts.slice(2).join('          ')]);
        fields.appendChild(makeTripleField(parts, g.head));
        var rowN = 0;
        g.rows.forEach(function (el) {
          var rowTxt = (el.textContent || '').trim();
          if (/^[•·▪◦*\-—–]$/.test(rowTxt)) return; /* 项目符号是装饰，不占用字段 */
          rowN++;
          var w = document.createElement('div');
          w.className = 'qmt-field';
          var lab = document.createElement('label');
          lab.textContent = '内容 ' + rowN;
          w.appendChild(lab);
          w.appendChild(mkValInput(rowTxt, function (v) { el.textContent = v; formSchedule(); }));
          fields.appendChild(w);
        });
      });
      appendAddButton(body, function () { pdfAddEntry(section); });
      return true;
    }
    if (section.sec) {
      var entries = section.sec.querySelectorAll('.entry');
      if (!entries.length) return false;
      Array.prototype.forEach.call(entries, function (en, gi) {
        body.appendChild(entryCardShell('第 ' + (gi + 1) + ' 条', function () {
          en.parentNode.removeChild(en);
          afterEntryChange('已删除该条（Ctrl+Z 可撤销）');
        }));
        var fields = body.lastChild.querySelector('.qmt-entry-fields');
        Array.prototype.forEach.call(en.querySelectorAll('.entry-head > span, .li, p'), function (el) {
          fields.appendChild(makeFormField(section, el, 0));
        });
      });
      appendAddButton(body, function () {
        var list = section.sec.querySelectorAll('.entry');
        if (!list.length) return;
        var last = list[list.length - 1];
        last.parentNode.insertBefore(last.cloneNode(true), last.nextSibling);
        afterEntryChange('已添加一条（复制了上一条，直接改文字）');
      });
      return true;
    }
    return false;
  }

  /* PDF 模板的基本信息是「标签 span ＋ 值 span」两块独立文字：按视觉行配成一个「标签 → 值」字段 */
  function makePairField(label, valEl) {
    var wrap = document.createElement('div');
    wrap.className = 'qmt-field';
    var lab = document.createElement('label');
    lab.textContent = label;
    wrap.appendChild(lab);
    var input = document.createElement('input');
    input.type = 'text';
    input.value = (valEl.textContent || '').trim();
    input.addEventListener('input', function () { valEl.textContent = input.value; formSchedule(); });
    wrap.appendChild(input);
    return wrap;
  }
  function pairBasicFields(section) {
    var ps = Array.prototype.slice.call(section.ps);
    var out = [], used = {};
    for (var i = 0; i < ps.length; i++) {
      if (used[i]) continue;
      var a = ps[i];
      var at = (a.textContent || '').trim();
      var fs = 0;
      try { fs = parseFloat(getComputedStyle(a).fontSize) || 0; } catch (e) {}
      var isLabel = at && at.length <= 10 && fs < 20 && !/[\d@a-zA-Z：:•·]/.test(at);
      if (isLabel) {
        var ar = a.getBoundingClientRect();
        for (var j = i + 1; j < ps.length; j++) {
          if (used[j]) continue;
          var b = ps[j], br = b.getBoundingClientRect();
          if (br.left <= ar.right - 2) continue;
          if (Math.abs(br.top - ar.top) > Math.max(ar.height, br.height, 1) * 0.6) continue;
          var bt = (b.textContent || '').trim();
          if (!bt) continue;
          used[i] = used[j] = 1;
          out.push(makePairField(at.replace(/\s+/g, ''), b));
          break;
        }
        if (used[i]) continue;
      }
      used[i] = 1;
      out.push(makeFormField(section, a, i));
    }
    return out;
  }
  function renderFormBody(section) {
    var body = formEl.querySelector('.qmt-form-body');
    body.innerHTML = '';
    if (!section || !section.ps.length) {
      body.innerHTML = '<div class="qmt-form-empty">这套模板没有识别到可编辑的字段；可以直接点纸面修改。</div>';
      return;
    }
    if (section.label === '基本信息' && page.querySelector('img.qmt-photo')) {
      var ph = document.createElement('div');
      ph.className = 'qmt-form-photo';
      var pb = document.createElement('button');
      pb.type = 'button'; pb.textContent = '替换证件照';
      pb.addEventListener('click', function () { pickPhoto(); });
      var ps = document.createElement('span');
      ps.textContent = 'JPG / PNG，自动压缩，只存在本机';
      ph.appendChild(pb); ph.appendChild(ps); body.appendChild(ph);
    }
    /* PDF 模板的基本信息先把「标签＋值」两块配成命名字段；其余模块优先按条目卡渲染（可加删条目） */
    var isBasic = /基本信息|个人资料|个人信息|联系方式/.test(section.label);
    if (isPdfPage() && isBasic) {
      pairBasicFields(section).forEach(function (f) { body.appendChild(f); });
    } else if (!isBasic && buildEntryCards(section, body)) {
      /* 已按条目卡渲染 */
    } else {
      Array.prototype.forEach.call(section.ps, function (p, i) {
        body.appendChild(makeFormField(section, p, i));
      });
    }
  }
  function buildForm() {
    if (formEl) return formEl;
    var sections = formSections();
    formEl = document.createElement('section');
    formEl.className = 'qmt-form';
    formEl.setAttribute('aria-label', '模块表单编辑');
    var head = document.createElement('div');
    head.className = 'qmt-form-head';
    head.innerHTML = '<b>表单编辑</b><span>改动会同步到纸面</span>';
    var close = document.createElement('button');
    close.type = 'button'; close.textContent = '收起';
    close.addEventListener('click', function () { toggleForm(false); });
    head.appendChild(close);
    var tabs = document.createElement('div');
    tabs.className = 'qmt-form-tabs';
    var body = document.createElement('div');
    body.className = 'qmt-form-body';
    formEl.appendChild(head); formEl.appendChild(tabs); formEl.appendChild(body);
    sections.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'qmt-form-tab' + (i === 0 ? ' on' : '');
      var off = s.sec ? s.sec.classList.contains('qmt-hide') : false;
      b.innerHTML = '<span class="dot' + (off ? ' off' : '') + '"></span>' + s.label;
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs.children, function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        renderFormBody(s);
      });
      tabs.appendChild(b);
    });
    renderFormBody(sections[0]);
    document.body.appendChild(formEl);
    return formEl;
  }
  function toggleForm(force) {
    var want = typeof force === 'boolean' ? force : !formOpen;
    if (want) buildForm();
    formOpen = want;
    if (!formEl) return;
    formEl.classList.toggle('open', want);
    document.body.classList.toggle('qmt-form-open', want);
    /* 右栏模式下面板自身固定定位，不需要滚动页面；底部抽屉模式才 scrollIntoView */
    var vw = window.visualViewport ? visualViewport.width : window.innerWidth;
    if (want && vw <= 900 && formEl.scrollIntoView) formEl.scrollIntoView({ block: 'end' });
    fit();
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
  /* 把当前简历按模块拼成纯文字：换模板时让用户能逐段搬到新模板 */
  function resumePlainText() {
    var parts = [];
    try {
      formSections().forEach(function (s) {
        var lines = [];
        s.ps.forEach(function (el) {
          var t = (el.innerText || el.textContent || '').replace(/\s+\n/g, '\n').trim();
          if (t) lines.push(t);
        });
        if (lines.length) parts.push('【' + s.label + '】\n' + lines.join('\n'));
      });
    } catch (e) {}
    return parts.join('\n\n');
  }
  function copyText(str, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = str; ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      toast(ok ? okMsg : '复制失败：请点正文手动选择复制');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(function () { toast(okMsg); }, fallback);
    } else fallback();
  }
  function buildSwitchPanel(p) {
    p.innerHTML = '<div class="qmt-panel-title">换一套模板</div>' +
      '<div class="qmt-empty" style="margin-bottom:8px">每套模板都是独立排版，文字没法自动灌进新版式。正确换法：复制这份简历的纯文字 → 打开新模板 → 逐段粘贴（底部表单或点正文都行）。</div>';
    var b0 = document.createElement('button');
    b0.type = 'button'; b0.className = 'qmt-mini wide'; b0.style.marginBottom = '6px';
    b0.textContent = '复制全部文字（已按模块整理）';
    b0.onclick = function () { copyText(resumePlainText(), '已按模块复制全部文字'); };
    var b1 = document.createElement('button');
    b1.type = 'button'; b1.className = 'qmt-mini wide'; b1.style.marginBottom = '6px';
    b1.textContent = '复制文字并去模板库 →';
    b1.onclick = function () {
      copyText(resumePlainText(), '已复制，去挑新模板吧');
      setTimeout(function () { location.href = '../index.html#library'; }, 700);
    };
    var b2 = document.createElement('button');
    b2.type = 'button'; b2.className = 'qmt-mini wide';
    b2.textContent = '备份 JSON 留档（用于恢复到本模板）';
    b2.onclick = function () { closePanel(); backupJSON(); };
    p.appendChild(b0); p.appendChild(b1); p.appendChild(b2);
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
    p.innerHTML = '<div class="qmt-panel-title">配色 <span style="font-weight:400;color:#7a8a93;font-size:11.5px">16 色 · 冷暖都有，点选即换</span></div>';
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
      zr.className = 'qmt-range';
      zr.style.cssText = 'flex:1;accent-color:#0e7c86';
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

    /* ---- 排版：文字大小 / 行距 / 模块间距（实时生效、自动保存、刷新保留） ---- */
    var tsub = document.createElement('div');
    tsub.className = 'qmt-panel-sub';
    tsub.textContent = '排版';
    p.appendChild(tsub);
    function mkSlider(name, min, max, step, val, fmt, onInput, onDone) {
      var row = document.createElement('div');
      row.className = 'qmt-slider-row';
      var nm = document.createElement('span');
      nm.className = 'qmt-slider-name';
      nm.textContent = name;
      var r = document.createElement('input');
      r.type = 'range'; r.min = String(min); r.max = String(max); r.step = String(step);
      r.className = 'qmt-range';
      r.setAttribute('aria-label', name);
      r.value = String(val);
      var v = document.createElement('span');
      v.className = 'qmt-slider-val';
      v.textContent = fmt(val);
      r.addEventListener('input', function () { v.textContent = fmt(onInput(parseFloat(r.value))); });
      r.addEventListener('change', function () { onDone(parseFloat(r.value)); });
      row.appendChild(nm); row.appendChild(r); row.appendChild(v);
      return row;
    }
    p.appendChild(mkSlider('文字大小', 90, 110, 1, currentTextZoom(),
      function (x) { return Math.round(x) + '%'; },
      function (x) { return applyTextZoom(x); },
      function (x) {
        try { localStorage.setItem(TEXT_ZOOM_KEY, String(applyTextZoom(x))); } catch (e) {}
        snap(); save(); checkOverflow();
        toast('文字大小已保存（仅本机草稿）');
      }));
    p.appendChild(mkSlider('行距', 0.9, 1.6, 0.05, currentLineHeight(),
      function (x) { return (+x).toFixed(2) + '×'; },
      function (x) { return applyLineHeight(x); },
      function (x) {
        try { localStorage.setItem(LINE_HEIGHT_KEY, String(applyLineHeight(x))); } catch (e) {}
        snap(); save(); checkOverflow();
        toast('行距已保存（仅本机草稿）');
      }));
    if (isPdfPage()) {
      var fixed = document.createElement('div');
      fixed.className = 'qmt-empty';
      fixed.style.padding = '7px 0 2px';
      fixed.textContent = '模块间距：该模板为固定版式，不支持调整模块间距。';
      p.appendChild(fixed);
    } else {
      p.appendChild(mkSlider('模块间距', 0.5, 2, 0.1, currentBlockSpace(),
        function (x) { return (+x).toFixed(1) + '×'; },
        function (x) { return applyBlockSpace(x); },
        function (x) {
          try { localStorage.setItem(BLOCK_SPACE_KEY, String(applyBlockSpace(x))); } catch (e) {}
          snap(); save(); checkOverflow();
          toast('模块间距已保存（仅本机草稿）');
        }));
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
    hint.textContent = '下方按模块填写 · 也可直接点正文修改 · Ctrl+Z 撤销';
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
    /* 按钮分组：照片 / 导出 / 数据 / 危险操作。危险按钮远离高频区并标红 */
    var BTN_GROUPS = [
      [['替换照片', pickPhoto]],
      [['打印 / 导出PDF', openPrintGuide],
       ['下载HTML', exportHTML],
       ['下载Word', function () { togglePanel(this, buildWordPanel); }]],
      [['换模板', function () { togglePanel(this, buildSwitchPanel); }],
       ['分享', function () { togglePanel(shareBtn, buildSharePanel); }],
       ['备份JSON', backupJSON],
       ['导入JSON', importJSON]],
      [['恢复原始内容', resetAll, 'danger']]
    ];
    BTN_GROUPS.forEach(function (g, gi) {
      if (gi > 0) tb.appendChild(Object.assign(document.createElement('span'), { className: 'qmt-sep' }));
      g.forEach(function (def) {
        var b = mkBtn(def[0], def[1]);
        if (def[2] === 'danger') { b.className = 'qmt-danger'; b.title = '清空你的修改、照片、配色和字体，恢复为模板示例内容'; }
        tb.appendChild(b);
        if (def[0] === '分享') shareBtn = b;
      });
    });
    document.body.appendChild(tb);
    function syncToolbarSpace() {
      var vw = Math.round(window.visualViewport ? visualViewport.width : window.innerWidth);
      if (vw <= 700) {
        tb.style.left = '0'; tb.style.transform = 'none';
        tb.style.width = vw + 'px'; tb.style.maxWidth = vw + 'px'; tb.style.boxSizing = 'border-box';
      }
      document.documentElement.style.setProperty('--qmt-tb', (tb.offsetHeight + 10) + 'px');
    }
    window.addEventListener('resize', syncToolbarSpace);
    syncToolbarSpace();
    /* 编辑区固定在底部、默认展开，像全民简历一样；右侧不再放结构栏 */
    buildForm();
    toggleForm(true);
    var fbtn = document.createElement('button');
    fbtn.type = 'button';
    fbtn.className = 'qmt-form-btn';
    fbtn.textContent = '表单编辑';
    fbtn.title = '按模块填写，内容会同步到纸面';
    fbtn.addEventListener('click', function () { toggleForm(); });
    document.body.appendChild(fbtn);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && formOpen) toggleForm(false);
    });
  }

  /* ---- 右侧常驻「简历结构」栏（大屏） ---- */
  function outlineGroups() {
    var names = ['基本信息', '个人资料', '个人信息', '联系方式', '求职意向', '教育背景', '工作经历', '实习经历', '项目经历', '校园经历', '技能特长', '技能证书', '荣誉证书', '自我评价', '兴趣爱好', '主修课程', '个人荣誉'];
    var out = [];
    names.forEach(function (n) {
      var all = page.querySelectorAll('p,td,div,span,h1,h2,h3,.qmt-t');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.children.length > 2) continue;
        var et = (el.textContent || '').replace(/[\s\u3000]/g, '');
        if (et === n || (isPdfPage() && et.indexOf(n) === 0)) {
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
  function ensurePdfPrintStyle() {
    if (!isPdfPage() || document.getElementById('qmt-pdf-print')) return;
    var n = (window.QMT_TPL && +window.QMT_TPL.pages) || 1;
    var st = document.createElement('style');
    st.id = 'qmt-pdf-print';
    st.textContent = '@media print{@page{size:A4;margin:0}' +
      'html,body,body.qmt-form-open{margin:0!important;padding:0!important;background:#fff!important}' +
      '.qmt-pdf{width:210mm!important;height:' + (297 * n - 0.4) + 'mm!important;min-height:0!important;margin:0!important;padding:0!important;transform:none!important;box-shadow:none!important;border-radius:0!important;overflow:hidden!important}' +
      '.qmt-pdf .qmt-bg{width:210mm!important;height:' + (297 * n - 0.4) + 'mm!important;object-fit:fill!important}' +
      '.qmt-pdf .qmt-t{print-color-adjust:exact;-webkit-print-color-adjust:exact}}';
    document.head.appendChild(st);
  }
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
    mask.querySelector('[data-go]').addEventListener('click', function () {
      close();
      ensurePdfPrintStyle();
      setTimeout(function () { window.print(); }, 60);
    });
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
  /* 导出前把背景图/照片转成 data URL：下载后的 HTML/JSON/Word 不再依赖 assets 目录 */
  function inlinePageImages(clone) {
    var liveImgs = page.querySelectorAll('img');
    var cloneImgs = clone.querySelectorAll('img');
    for (var i = 0; i < cloneImgs.length && i < liveImgs.length; i++) {
      var src = liveImgs[i];
      if (!src || !src.naturalWidth) continue;
      try {
        var c = document.createElement('canvas');
        c.width = src.naturalWidth; c.height = src.naturalHeight;
        c.getContext('2d').drawImage(src, 0, 0);
        cloneImgs[i].src = c.toDataURL('image/jpeg', 0.9);
      } catch (e) {}
    }
  }
  function exportHTML() {
    var doc = document.documentElement.cloneNode(true);
    var t = doc.querySelector('.qmt-toolbar');
    if (t) t.remove();
    var p = doc.querySelector('.qmt-panel');
    if (p) p.remove();
    var cp = doc.querySelector('#resume');
    if (cp) inlinePageImages(cp);
    download(new Blob(['<!DOCTYPE html>\n' + doc.outerHTML], { type: 'text/html;charset=utf-8' }), (TPL.name || '简历') + '.html');
  }
  function exportWordDoc() {
    /* Word 兼容的 .doc：保留模板样式与内联图片，去掉工具条/脚本。
       不是严格 OOXML .docx，但 Word/WPS 可直接打开，适合先交付可编辑文档。 */
    var style = document.querySelector('style');
    var cssText = style ? style.textContent : '';
    var clone = page.cloneNode(true);
    inlinePageImages(clone);
    var body = clone.outerHTML.replace(/\scontenteditable="(true|false)"/g, '');
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
    var clone = page.cloneNode(true);
    inlinePageImages(clone);
    var data = {
      app: 'qmt-resume', version: 2, id: TPL.id, name: TPL.name,
      /* 结构化文字快照供后续跨模板迁移使用；HTML 仍是保证旧模板版式的恢复来源。 */
      content: { schemaVersion: 1, sections: formSections().map(function (section, index) {
        return {
          id: 'section-' + (index + 1),
          title: String(section.label || ('版块 ' + (index + 1))).slice(0, 80),
          items: (section.ps || []).map(function (el) { return String(el.innerText || el.textContent || '').trim(); }).filter(Boolean)
        };
      }) },
      html: clone.innerHTML, photo: null, theme: null, font: null, savedAt: new Date().toISOString()
    };
    try { data.photo = localStorage.getItem(PHOTO_KEY); } catch (e) {}
    try { data.theme = localStorage.getItem(THEME_KEY); } catch (e) {}
    try { data.font = localStorage.getItem(FONT_KEY); } catch (e) {}
    try { data.photoPos = localStorage.getItem(PHOTO_POS_KEY); } catch (e) {}
    try { data.photoZoom = localStorage.getItem(PHOTO_ZOOM_KEY); } catch (e) {}
    try { data.textZoom = localStorage.getItem(TEXT_ZOOM_KEY); } catch (e) {}
    try { data.lineHeight = localStorage.getItem(LINE_HEIGHT_KEY); } catch (e) {}
    try { data.blockSpace = localStorage.getItem(BLOCK_SPACE_KEY); } catch (e) {}
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), (TPL.name || '简历') + '-备份.json');
  }
  function importJSON() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (f.size > 16 * 1024 * 1024) { toast('备份文件超过 16 MB，无法导入'); return; }
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (!d || d.app !== 'qmt-resume' || typeof d.html !== 'string') throw new Error('bad');
          if (d.version != null && (!Number.isInteger(d.version) || d.version < 1 || d.version > 2)) throw new Error('version');
          if (d.id != null && (typeof d.id !== 'string' || d.id.length > 80)) throw new Error('id');
          if (d.name != null && (typeof d.name !== 'string' || d.name.length > 120)) throw new Error('name');
          var safeHtml = sanitizeResumeHTML(d.html);
          var safePhoto = null;
          if (d.photo != null && d.photo !== '') {
            safePhoto = safeImageSource(d.photo);
            if (!safePhoto || safePhoto.indexOf('data:image/') !== 0) throw new Error('photo');
          }
          var safeTheme = null;
          if (d.theme != null && d.theme !== '') {
            var themeObj = typeof d.theme === 'string' ? JSON.parse(d.theme) : d.theme;
            if (!themeObj || !PALETTE.some(function (x) { return x[0] === themeObj.c; })) throw new Error('theme');
            safeTheme = JSON.stringify({ c: themeObj.c });
          }
          var safeFont = null;
          if (d.font != null && d.font !== '') {
            if (!FONTS.some(function (x) { return x[1] === d.font; })) throw new Error('font');
            safeFont = d.font;
          }
          var safePhotoPos = null;
          if (d.photoPos != null && d.photoPos !== '') {
            if (['50% 18%', '50% 50%', '50% 82%'].indexOf(d.photoPos) < 0) throw new Error('photoPos');
            safePhotoPos = d.photoPos;
          }
          function readRange(value, min, max, key) {
            if (value == null || value === '') return null;
            var n = Number(value);
            if (!isFinite(n) || n < min || n > max) throw new Error(key);
            return String(n);
          }
          var values = [
            [PHOTO_KEY, safePhoto], [THEME_KEY, safeTheme], [FONT_KEY, safeFont], [PHOTO_POS_KEY, safePhotoPos],
            [PHOTO_ZOOM_KEY, readRange(d.photoZoom, 100, 180, 'photoZoom')],
            [TEXT_ZOOM_KEY, readRange(d.textZoom, 90, 110, 'textZoom')],
            [LINE_HEIGHT_KEY, readRange(d.lineHeight, 0.9, 1.6, 'lineHeight')],
            [BLOCK_SPACE_KEY, readRange(d.blockSpace, 0.5, 2, 'blockSpace')]
          ];
          var backupName = String(d.name || d.id || '未命名简历').slice(0, 120);
          if (d.id && d.id !== TPL.id && !confirm('这份备份来自「' + backupName + '」，不是当前模板。\n导入后当前页面会变成那套模板的排版（文字还在）。\n如果只是想搬文字，建议改用「换模板 → 复制全部文字」。\n\n仍要导入吗？')) return;
          if (!confirm('导入「' + backupName + '」的备份？当前内容将被覆盖。')) return;
          var previous = values.map(function (pair) { return localStorage.getItem(pair[0]); });
          try {
            values.forEach(function (pair) {
              if (pair[1] == null) localStorage.removeItem(pair[0]);
              else localStorage.setItem(pair[0], pair[1]);
            });
            /* 先写小设置，最后写 HTML；配额不足时旧简历正文仍在。 */
            localStorage.setItem(HTML_KEY, safeHtml);
          } catch (storageError) {
            values.forEach(function (pair, i) {
              try { if (previous[i] == null) localStorage.removeItem(pair[0]); else localStorage.setItem(pair[0], previous[i]); } catch (rollbackError) {}
            });
            throw new Error('storage');
          }
          location.reload();
        } catch (err) {
          toast(err && err.message === 'storage' ? '浏览器存储空间不足，原简历未覆盖；请先导出备份或清理旧草稿' : '备份文件格式不正确，或包含不支持的内容');
        }
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
      localStorage.removeItem(TEXT_ZOOM_KEY);
      localStorage.removeItem(LINE_HEIGHT_KEY);
      localStorage.removeItem(BLOCK_SPACE_KEY);
    } catch (e) {}
    location.reload();
  }

  /* ---- Word 转换修复：把被压成 1pt/3pt 的正文行高还原 ----
     这类段落来自 Word 的“固定行距”，直接渲染会让两行字叠在一起；
     只修有文字的段落，保留空段落作为间距。 */
  function normalizeLineHeight() {
    if (isPdfPage()) return;
    var ps = page.querySelectorAll('p[style*="line-height"]');
    Array.prototype.forEach.call(ps, function (p) {
      if (p.hasAttribute('data-qmt-lh')) return;   /* 用户设置的行距优先，不再修复 */
      var lh = parseFloat(p.style.lineHeight);
      if (p.textContent.replace(/\s/g, '') && lh && lh < 8) p.style.lineHeight = 'normal';
    });
  }

  /* 页头模板的“个人简历”是 36pt，但 Word 导出的首行只有 14.23pt，字被行高裁掉。
     只放宽页头锚点的首行，不动其它行；挤出纸张则回退。 */
  function fixHeaderLayout() {
    if (isPdfPage()) return;
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
    if (isPdfPage()) return;
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
    /* 桌面端右栏展开时，可用宽度减去右栏 370px，保证纸面不横向溢出 */
    var vwFit = window.visualViewport ? visualViewport.width : window.innerWidth;
    var avail = document.documentElement.clientWidth - 24;
    if (vwFit > 900 && formOpen) avail = Math.max(320, avail - 370);
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
    /* 手机端：左对齐 + 固定左边距，避免移动 Safari/Chrome 把布局视口撑到 580px 后纸张被居中到屏幕外 */
    if ((window.visualViewport ? visualViewport.width : window.innerWidth) <= 700) {
      page.style.transformOrigin = 'top left';
      page.style.margin = '0 0 0 12px';
    }
  }
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(page);
  normalizeLineHeight();
  fixHeaderLayout();
  padSectionStarts();
  /* 恢复上次的排版设置（必须在 normalizeLineHeight 之后，用户行距优先） */
  (function initTypography() {
    if (THUMB) return;
    try {
      var tz = currentTextZoom(); if (tz !== 100) applyTextZoom(tz);
      var lh = currentLineHeight(); if (Math.abs(lh - 1) > 0.001) applyLineHeight(lh);
      var bs = currentBlockSpace(); if (Math.abs(bs - 1) > 0.001) applyBlockSpace(bs);
    } catch (e) {}
  })();
  fit();
  ensurePdfPrintStyle();
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
    version: '2.3', tpl: TPL, save: save, page: page, fit: fit, sanitizeResumeHTML: sanitizeResumeHTML,
    undo: undo, redo: redo, recolor: recolor, restoreColors: restoreColors,
    sectionGroups: sectionGroups, detectAccent: detectAccent,
    pageCount: pageCount, checkOverflow: checkOverflow, thumb: THUMB,
    textZoom: applyTextZoom, lineHeight: applyLineHeight, blockSpace: applyBlockSpace,
    currentTextZoom: currentTextZoom, currentLineHeight: currentLineHeight, currentBlockSpace: currentBlockSpace
  };
})();
