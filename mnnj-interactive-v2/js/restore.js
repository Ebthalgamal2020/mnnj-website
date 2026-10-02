/* ==========================================================================
   MNNJ V2 · Restore — a weathered photo washed clean along the pointer path.
   WebGL2: clean + dirty photographs, a wipe mask and a drying wet film.
   Renders on demand only.
   ========================================================================== */
(function () {
  'use strict';
  var VS = '#version 300 es\nin vec2 p;out vec2 vUv;void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;out vec4 o;',
    'uniform sampler2D uClean,uDirty,uMask,uWet;',
    'uniform vec2 uRes,uLight,uSpray;',
    'uniform vec4 uCover;',
    'uniform float uClear,uDpr,uSprayA,uSprayR;',
    'float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}',
    'vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}',
    'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p*=2.07;a*=.5;}return s;}',
    'vec3 drops(vec2 px,float cell,float prob,float r0,float r1,float seed){vec2 g=px/cell,id=floor(g),f=fract(g);vec3 res=vec3(0.);',
    '  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(i,j),c=id+o+seed;if(h12(c+7.13)>prob)continue;',
    '  vec2 ctr=o+.2+h22(c)*.6;float rad=mix(r0,r1,pow(h12(c+3.31),2.2))/cell;vec2 d=f-ctr;d.y*=1.1;float t=length(d)/rad;',
    '  if(t<1.){float a=smoothstep(1.,.7,t);if(a>res.z)res=vec3(d/rad,a);}}return res;}',
    'void main(){',
    '  vec2 uv=vUv,px=uv*uRes/uDpr,asp=vec2(uRes.x/uRes.y,1.);',
    '  vec2 suv=uv*uCover.xy+uCover.zw;',
    '  float m=texture(uMask,uv).r;',
    '  float n=fbm(uv*asp*7.)*.75+fbm(uv*asp*30.)*.25;',
    '  float w=clamp(smoothstep(.22,.78,m+(n-.5)*.26)+uClear,0.,1.);',
    '  vec2 e=vec2(4.)/uRes*uDpr*2.;',
    '  vec2 g=vec2(texture(uMask,uv+vec2(e.x,0.)).r-texture(uMask,uv-vec2(e.x,0.)).r,texture(uMask,uv+vec2(0.,e.y)).r-texture(uMask,uv-vec2(0.,e.y)).r)*(1.-uClear);',
    '  vec3 dirty=texture(uDirty,suv).rgb;',
    '  vec3 clean=texture(uClean,suv-g*.004).rgb;',
    /* a tide-line of dirty water just outside the washed area */
    '  float tide=smoothstep(.0,.3,m)*smoothstep(.62,.3,m)*(1.-uClear);',
    '  dirty*=1.-tide*.06;',
    '  vec3 col=mix(dirty,clean,w);',
    /* freshly washed surfaces are wet: a touch darker and glossier, then dry */
    '  float wet=smoothstep(.03,1.,texture(uWet,uv).r)*w;',
    '  col=mix(col,col*col*1.08,wet*.32);',
    '  float k=dot(uv-uLight*.25,normalize(vec2(1.,.55)));',
    '  col+=wet*exp(-pow((k-.55)*9.,2.))*.06;',
    /* sparse beads of water along the edge */
    '  float ring=smoothstep(.1,.3,m)*smoothstep(.62,.38,m)*(1.-uClear);',
    '  vec3 d=drops(px,12.,.55,1.4,4.,41.);',
    '  float da=d.z*ring;',
    '  vec3 lens=texture(uClean,suv-d.xy*.012*uCover.xy).rgb;',
    '  vec3 N=normalize(vec3(d.xy*1.5,1.));vec3 L=normalize(vec3((uLight-uv)*asp,.9));',
    '  float spec=pow(max(dot(reflect(-L,N),vec3(0,0,1)),0.),40.);',
    '  vec3 dc=lens*(1.-smoothstep(.55,1.,length(d.xy))*.3)+spec*.5;',
    '  col=mix(col,dc,da*.85);',
    /* fine spray mist around the nozzle while it moves */
    '  vec2 sp=(uv-uSpray)*asp;float sr=length(sp)/uSprayR;',
    '  float mist=exp(-sr*sr*2.2)*uSprayA;',
    '  float grain=step(.985,h12(floor(px*.7)+floor(uSprayA*40.)));',
    '  col=mix(col,vec3(.97,.98,1.),mist*(.22+grain*.6));',
    '  o=vec4(col,1.);',
    '}'
  ].join('\n');

  function Restore(host, opts) {
    this.host = host; this.o = opts || {};
    this.canvas = host.querySelector('canvas');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.clear = 0; this.clearTarget = 0; this.light = [.6, .3];
    this.spray = [.5, .5]; this.sprayA = 0; this.last = null; this.raf = 0;
    this.GX = 40; this.GY = 26; this.grid = new Uint8Array(this.GX * this.GY); this.hits = 0;
    this.MS = .5; this.WS = .25; this.wetting = 0;
    this.mask = document.createElement('canvas'); this.mctx = this.mask.getContext('2d');
    this.wetC = document.createElement('canvas'); this.wctx = this.wetC.getContext('2d');
  }
  function load(src) { return new Promise(function (res, rej) { var i = new Image(); i.decoding = 'async'; i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }

  Restore.prototype.init = function (cleanSrc, dirtySrc) {
    var self = this, gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) return Promise.reject(new Error('webgl2'));
    this.gl = gl;
    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.U = {};
    ['uClean', 'uDirty', 'uMask', 'uWet', 'uRes', 'uLight', 'uSpray', 'uCover', 'uClear', 'uDpr', 'uSprayA', 'uSprayR'].forEach(function (n) { self.U[n] = gl.getUniformLocation(pr, n); });
    [0, 1, 2, 3].forEach(function (u) { gl.uniform1i(self.U[['uClean', 'uDirty', 'uMask', 'uWet'][u]], u); });
    this.tex = [0, 1, 2, 3].map(function (u) {
      var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    });
    return Promise.all([load(cleanSrc), load(dirtySrc)]).then(function (im) {
      self.img = im[0];
      [0, 1].forEach(function (u) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, self.tex[u]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im[u]); });
      self.resize(); self.bind(); return self;
    });
  };

  Restore.prototype.resize = function () {
    var r = this.host.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    var dpr = Math.min(window.devicePixelRatio || 1, this.o.maxDpr || 1.5);
    if (w * h * dpr * dpr > 3e6) dpr = Math.sqrt(3e6 / (w * h));
    var keep = null;
    if (this.w) { keep = document.createElement('canvas'); keep.width = this.mask.width; keep.height = this.mask.height; keep.getContext('2d').drawImage(this.mask, 0, 0); }
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.mask.width = Math.round(w * this.MS); this.mask.height = Math.round(h * this.MS);
    this.mctx.fillStyle = '#000'; this.mctx.fillRect(0, 0, this.mask.width, this.mask.height);
    if (keep) this.mctx.drawImage(keep, 0, 0, this.mask.width, this.mask.height);
    this.wetC.width = Math.round(w * this.WS); this.wetC.height = Math.round(h * this.WS);
    this.wctx.fillStyle = '#000'; this.wctx.fillRect(0, 0, this.wetC.width, this.wetC.height);
    this.radius = Math.max(30, Math.min(w * .045, 70));
    var iw = this.img.width, ih = this.img.height, s = Math.max(w / iw, h / ih);
    var sw = w / (iw * s), sh = h / (ih * s), fx = this.o.focusX == null ? .5 : this.o.focusX, fy = this.o.focusY == null ? .5 : this.o.focusY;
    this.cover = [sw, sh, (1 - sw) * fx, (1 - sh) * fy];
    this.upload(2, this.mask); this.upload(3, this.wetC);
    if (this.o.onResize) this.o.onResize(this);
    this.request();
  };
  Restore.prototype.upload = function (u, src) { var gl = this.gl; gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, this.tex[u]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };

  /* a pressure-wash pass: a broad soft stroke with faint parallel streaks */
  Restore.prototype.wash = function (x, y, trusted) {
    var p = this.last; this.last = { x: x, y: y };
    if (!p) p = { x: x - .5, y: y };
    var dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (!trusted && d > Math.max(this.w, this.h) * .35) return;
    var R = this.radius, c = this.mctx, s = this.MS, nx = -dy / (d || 1), ny = dx / (d || 1);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = '#f00'; c.shadowBlur = R * .4 * s;
    c.strokeStyle = 'rgba(255,0,0,.85)'; c.lineWidth = R * 1.9 * s;
    c.beginPath(); c.moveTo(p.x * s, p.y * s); c.lineTo(x * s, y * s); c.stroke();
    c.shadowBlur = 0;
    [-.55, -.2, .15, .5].forEach(function (k, i) {
      c.strokeStyle = 'rgba(255,0,0,' + (.08 + (i % 2) * .07) + ')'; c.lineWidth = R * (.14 + (i % 2) * .08) * s;
      c.beginPath(); c.moveTo((p.x + nx * R * k) * s, (p.y + ny * R * k) * s); c.lineTo((x + nx * R * k) * s, (y + ny * R * k) * s); c.stroke();
    });
    c.restore();
    var wc = this.wctx, ws = this.WS;
    wc.save(); wc.lineCap = 'round'; wc.strokeStyle = '#f00'; wc.lineWidth = R * 2.1 * ws;
    wc.beginPath(); wc.moveTo(p.x * ws, p.y * ws); wc.lineTo(x * ws, y * ws); wc.stroke(); wc.restore();
    this.wetting = 150;
    this.spray = [x / this.w, y / this.h]; this.sprayA = this.reduced ? 0 : Math.min(1, this.sprayA + .35);
    var steps = Math.max(1, Math.ceil(d / (R * .5)));
    for (var i = 0; i <= steps; i++) this.mark(p.x + dx * i / steps, p.y + dy * i / steps);
    this.maskDirty = true; this.request();
    if (this.o.onWash) this.o.onWash(this.hits / this.grid.length);
  };
  Restore.prototype.mark = function (x, y) {
    var cw = this.w / this.GX, ch = this.h / this.GY, r = this.radius * .8;
    for (var gy = Math.max(0, ((y - r) / ch) | 0); gy <= Math.min(this.GY - 1, ((y + r) / ch) | 0); gy++)
      for (var gx = Math.max(0, ((x - r) / cw) | 0); gx <= Math.min(this.GX - 1, ((x + r) / cw) | 0); gx++) {
        var i = gy * this.GX + gx; if (this.grid[i]) continue;
        var ex = (gx + .5) * cw - x, ey = (gy + .5) * ch - y;
        if (ex * ex + ey * ey < r * r) { this.grid[i] = 1; this.hits++; }
      }
  };
  Restore.prototype.lift = function () { this.last = null; };
  Restore.prototype.reset = function () {
    this.mctx.fillStyle = '#000'; this.mctx.fillRect(0, 0, this.mask.width, this.mask.height);
    this.grid.fill(0); this.hits = 0; this.maskDirty = true; this.clearTarget = 0; this.clear = this.reduced ? 0 : this.clear;
    this.request();
  };
  Restore.prototype.setClear = function (on) { this.clearTarget = on ? 1 : 0; if (this.reduced) this.clear = this.clearTarget; this.request(); };

  Restore.prototype.auto = function (pts, dur, done) {
    var self = this, lens = [0], total = 0, seg = 1;
    for (var i = 1; i < pts.length; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(total); }
    function at(d) { while (seg < pts.length - 1 && lens[seg] < d) seg++; var a = pts[seg - 1], b = pts[seg], f = (d - lens[seg - 1]) / Math.max(1e-6, lens[seg] - lens[seg - 1]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
    this.lift();
    if (this.reduced) { for (var dd = 0; dd <= total; dd += 8) { var q = at(dd); this.wash(q[0], q[1], true); } this.lift(); if (done) done(); return; }
    var t0 = performance.now(), done0 = 0, st = Math.max(4, this.radius * .35);
    (function step() {
      var t = Math.min(1, (performance.now() - t0) / dur), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, target = e * total;
      for (var d2 = done0 + st; d2 < target; d2 += st) { var r = at(d2); self.wash(r[0], r[1], true); }
      var q2 = at(target); self.wash(q2[0], q2[1], true); done0 = target;
      if (self.o.onAuto) self.o.onAuto(q2[0], q2[1]);
      if (t < 1) requestAnimationFrame(step); else { self.lift(); if (done) done(); }
    })();
  };

  Restore.prototype.bind = function () {
    var self = this, host = this.host;
    function local(e) { var r = host.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    host.addEventListener('pointermove', function (e) {
      var q = local(e); self.light = [q[0] / self.w, q[1] / self.h];
      if (e.pointerType === 'mouse' || e.buttons) {
        var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!list.length) list = [e];
        for (var i = 0; i < list.length; i++) { var c = local(list[i]); self.wash(c[0], c[1]); }
      }
    }, { passive: true });
    ['pointerleave', 'pointerup', 'pointercancel', 'pointerdown'].forEach(function (t) { host.addEventListener(t, function () { self.lift(); }); });
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { self.resize(); }, 120); });
    new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; if (self.visible) self.request(); }).observe(host);
  };

  Restore.prototype.request = function () { if (this.raf) return; var self = this; this.raf = requestAnimationFrame(function () { self.raf = 0; self.render(); }); };
  Restore.prototype.render = function () {
    var gl = this.gl, U = this.U, again = false;
    if (this.maskDirty) { this.upload(2, this.mask); this.maskDirty = false; }
    if (this.wetting > 0) { this.wetting--; this.wctx.fillStyle = 'rgba(0,0,0,.05)'; this.wctx.fillRect(0, 0, this.wetC.width, this.wetC.height); this.upload(3, this.wetC); again = true; }
    if (this.sprayA > .01) { this.sprayA *= .86; again = true; } else this.sprayA = 0;
    if (Math.abs(this.clear - this.clearTarget) > .002) { this.clear += (this.clearTarget - this.clear) * .06; again = true; } else this.clear = this.clearTarget;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(U.uRes, this.canvas.width, this.canvas.height); gl.uniform1f(U.uDpr, this.dpr);
    gl.uniform2f(U.uLight, this.light[0], this.light[1]);
    gl.uniform2f(U.uSpray, this.spray[0], this.spray[1]); gl.uniform1f(U.uSprayA, this.sprayA); gl.uniform1f(U.uSprayR, this.radius * 1.5 / this.h);
    gl.uniform4f(U.uCover, this.cover[0], this.cover[1], this.cover[2], this.cover[3]);
    gl.uniform1f(U.uClear, this.clear);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (again && this.visible !== false) this.request();
  };

  window.MNNJRestore = Restore;
})();
