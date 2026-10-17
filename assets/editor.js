/* 共用编辑器：工具条 / 本机自动保存 / 照片替换 / 导入导出 / 缩放适配
   约定：页面含 <div class="page" id="resume" contenteditable="true">，且 window.QMT_TPL = {id,name,cat,photo} */
(function () {
  var TPL = window.QMT_TPL || { id: 'untitled', name: '未命名', photo: false };
  var EMBED = window.self !== window.top;
  var page = document.getElementById('resume');
  if (!page) return;

  var HTML_KEY = 'qmt:html:' + TPL.id;
  var PHOTO_KEY = 'qmt:photo:' + TPL.id;
  var AVATAR = '../assets/avatar.svg';
  var FONT = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif';

  /* ---- 注入样式（工具条 + 打印时清除缩放） ---- */
  var css = document.createElement('style');
  css.textContent = [
    '.qmt-toolbar{position:fixed;left:50%;transform:translateX(-50%);top:0;z-index:9999;display:flex;flex-wrap:nowrap;align-items:center;gap:10px;max-width:100vw;padding:8px 14px;background:rgba(38,74,90,.96);color:#fff;font-size:12.5px;border-radius:0 0 10px 10px;box-shadow:0 4px 16px rgba(0,0,0,.22);font-family:' + FONT + ';white-space:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}',
    '.qmt-toolbar::-webkit-scrollbar{display:none}',
    '.qmt-toolbar .qmt-hint{opacity:.8;font-size:12.5px;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}',
    '.qmt-toolbar button,.qmt-toolbar a.qmt-link{font-family:inherit;font-size:12.5px;cursor:pointer;text-decoration:none;border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;padding:4px 12px;border-radius:6px;transition:.15s;white-space:nowrap;flex:0 0 auto}',
    '.qmt-toolbar button:hover,.qmt-toolbar a.qmt-link:hover{background:#fff;color:#264A5A}',
    '.qmt-badge{display:none;background:#c0392b;color:#fff;border-radius:10px;padding:2px 10px;font-size:12px;flex:0 0 auto}',
    '@media print{.qmt-toolbar{display:none!important}.page{transform:none!important;margin-bottom:0!important}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---- 载入本机保存的内容（文件原件即示例内容） ---- */
  try {
    var saved = localStorage.getItem(HTML_KEY);
    if (saved) page.innerHTML = saved;
  } catch (e) {}

  /* ---- toast ---- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (EMBED) return;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.82);color:#fff;padding:9px 18px;border-radius:8px;font-size:13px;z-index:10000;font-family:' + FONT + ';max-width:80vw;text-align:center';
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
  try {
    var ph = localStorage.getItem(PHOTO_KEY);
    if (ph) applyPhoto(ph);
  } catch (e) {}
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
  var timer = null;
  function save() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      try { localStorage.setItem(HTML_KEY, page.innerHTML); }
      catch (e) { toast('存储空间不足：请用「备份JSON」或「导出HTML」保存到文件'); }
    }, 400);
  }
  page.addEventListener('input', function (e) {
    if (e && e.isComposing) return;
    save();
    checkOverflow();
  });

  /* ---- 粘贴一律转纯文本 ---- */
  page.addEventListener('paste', function (e) {
    e.preventDefault();
    var txt = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, txt);
  });

  /* ---- 超页提示 ---- */
  var badge = null;
  function checkOverflow() {
    if (!badge) return;
    badge.style.display = page.scrollHeight > page.clientHeight + 2 ? 'inline-block' : 'none';
  }

  /* ---- 工具条（嵌入画廊时不注入） ---- */
  if (!EMBED) {
    var tb = document.createElement('div');
    tb.className = 'qmt-toolbar';
    var hint = document.createElement('span');
    hint.className = 'qmt-hint';
    hint.textContent = '点正文即可直接改 · Enter 新建一条 · 建议单页';
    badge = document.createElement('span');
    badge.className = 'qmt-badge';
    badge.textContent = '内容已超出一页';
    var home = document.createElement('a');
    home.className = 'qmt-link';
    home.href = '../index.html';
    home.textContent = '← 模板库';
    tb.appendChild(home);
    tb.appendChild(hint);
    tb.appendChild(badge);
    [
      ['替换照片', pickPhoto],
      ['打印 / 导出PDF', function () { window.print(); }],
      ['下载HTML', exportHTML],
      ['备份JSON', backupJSON],
      ['导入JSON', importJSON],
      ['恢复原始内容', resetAll]
    ].forEach(function (def) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = def[0];
      b.addEventListener('click', def[1]);
      tb.appendChild(b);
    });
    document.body.appendChild(tb);
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
    download(new Blob(['<!DOCTYPE html>\n' + doc.outerHTML], { type: 'text/html;charset=utf-8' }), (TPL.name || '简历') + '.html');
  }
  function backupJSON() {
    var data = {
      app: 'qmt-resume', id: TPL.id, name: TPL.name,
      html: page.innerHTML, photo: null, savedAt: new Date().toISOString()
    };
    try { data.photo = localStorage.getItem(PHOTO_KEY); } catch (e) {}
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
            if (d.photo) localStorage.setItem(PHOTO_KEY, d.photo);
            else localStorage.removeItem(PHOTO_KEY);
          } catch (e) {}
          location.reload();
        } catch (err) { toast('备份文件格式不正确'); }
      };
      rd.readAsText(f);
    };
    inp.click();
  }
  function resetAll() {
    if (!confirm('确定恢复为模板示例内容？你的修改和照片将清空（可先备份JSON）。')) return;
    try { localStorage.removeItem(HTML_KEY); localStorage.removeItem(PHOTO_KEY); } catch (e) {}
    location.reload();
  }

  /* ---- 缩放适配 ---- */
  function fit() {
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
  fit();
  checkOverflow();

  /* 调试句柄（供自动化验证） */
  window.QMT = { version: '1.0', tpl: TPL, save: save, page: page, fit: fit };
})();
