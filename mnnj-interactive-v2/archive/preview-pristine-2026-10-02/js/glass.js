/* ==========================================================================
   MNNJ V2 · Misted glass
   A photograph seen through condensation. Wiping (pointer / touch) clears
   the glass along the path. WebGL2 shader; the wipe path and the drying
   film are 2D canvases uploaded as textures. Renders on demand only.
   ========================================================================== */
(function () {
  'use strict';

  var VS = '#version 300 es\nin vec2 p;out vec2 vUv;void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv; out vec4 o;',
    'uniform sampler2D uImg, uMask, uWet;',
    'uniform vec2 uRes, uLight, uPar;',
    'uniform vec4 uCover;',
    'uniform float uClear, uDpr, uHaze, uDesat, uBeads;',
    'uniform vec3 uHazeCol;',
    'float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}',
    'vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}',
    'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p*=2.07;a*=.5;}return s;}',
    /* droplet field: xy = surface normal, z = coverage */
    'vec3 drops(vec2 px,float cell,float prob,float r0,float r1,float seed){',
    '  vec2 g=px/cell,id=floor(g),f=fract(g);vec3 res=vec3(0.);',
    '  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){',
    '    vec2 o=vec2(i,j),c=id+o+seed;',
    '    if(h12(c+7.13)>prob)continue;',
    '    vec2 ctr=o+.2+h22(c)*.6;',
    '    float rad=mix(r0,r1,pow(h12(c+3.31),2.2))/cell;',
    '    vec2 d=f-ctr;d.y*=1.1;',
    '    float t=length(d)/rad;',
    '    if(t<1.){float a=smoothstep(1.,.72,t);if(a>res.z)res=vec3(d/rad,a);}',
    '  }',
    '  return res;',
    '}',
    'void main(){',
    '  vec2 uv=vUv,px=uv*uRes/uDpr,asp=vec2(uRes.x/uRes.y,1.);',
    '  vec2 suv=uv*uCover.xy+uCover.zw+uPar;',
    /* wipe mask with an organic, slightly ragged edge */
    '  float m=texture(uMask,uv).r;',
    '  float n=fbm(uv*asp*5.)*.8+fbm(uv*asp*22.)*.2;',
    '  float w=clamp(smoothstep(.2,.8,m+(n-.5)*.22)+uClear,0.,1.);',
    '  vec2 e2=vec2(3.)/uRes*uDpr*2.;',
    '  vec2 g=vec2(texture(uMask,uv+vec2(e2.x,0.)).r-texture(uMask,uv-vec2(e2.x,0.)).r,texture(uMask,uv+vec2(0.,e2.y)).r-texture(uMask,uv-vec2(0.,e2.y)).r)*(1.-uClear);',
    '  float line=exp(-pow((w-.5)*5.,2.))*(1.-uClear);',
    '  float ring=smoothstep(.02,.16,m)*smoothstep(.42,.22,m)*(1.-uClear);',
    /* clear glass: the photo, with a slight lens at the water line */
    '  vec3 sharp=texture(uImg,suv-g*.006).rgb;',
    /* frosted glass: scattered blur + soft cool haze, uneven density */
    '  vec3 b=vec3(0.);float a0=h12(floor(px*.5))*6.283;',
    '  for(int k=0;k<10;k++){float a=a0+float(k)*2.39996;float r=sqrt((float(k)+.5)/10.)*.016;b+=textureLod(uImg,suv+vec2(cos(a),sin(a)*asp.x)*r*uCover.xy,2.6).rgb;}',
    '  b/=10.;',
    '  float dens=uHaze+(fbm(uv*asp*2.4+3.)-.5)*.14;',
    '  b=mix(b,vec3(dot(b,vec3(.299,.587,.114))),uDesat);',
    '  vec3 mist=mix(b,uHazeCol,dens);',
    /* condensation: dense micro beads, sparse larger drops */
    '  vec3 md=drops(px,5.5,.75,.8,2.1,0.);',
    '  vec3 bd=drops(px,58.,.16,2.6,7.,17.);',
    '  vec3 ed=drops(px,9.,.85,1.4,4.2,41.);',
    '  vec3 col=mist;',
    '  vec3 bead=mix(textureLod(uImg,suv-md.xy*.003,1.5).rgb,vec3(1.),.45);',
    '  col=mix(col,bead,md.z*.32*uBeads);',
    '  col+=md.z*smoothstep(.1,-.8,md.y)*.06*uBeads;',
    '  col=mix(col,sharp,w);',
    '  col=mix(col,mist,(1.-smoothstep(.75,1.,m))*w*.22*(1.-uClear));',
    /* water line: brighter edge, beads collected along it */
    '  col+=line*.035;',
    '  float wet=smoothstep(.04,1.,texture(uWet,uv).r)*w;',
    '  col*=1.-wet*.07;',
    /* larger lens drops (on mist) and edge beads */
    '  float ea=ed.z*ring,ba=bd.z*(1.-w)*uBeads;',
    '  float lensA=max(ba,ea);',
    '  vec2 ln=ba>ea?bd.xy:ed.xy;',
    '  vec3 lens=textureLod(uImg,suv-ln*.02*uCover.xy,.5).rgb;',
    '  vec3 dcol=lens*1.04+.02;',
    '  vec3 N=normalize(vec3(ln*1.5,1.));',
    '  vec3 L=normalize(vec3((uLight-uv)*asp,.9));',
    '  float spec=pow(max(dot(reflect(-L,N),vec3(0,0,1)),0.),40.);',
    '  dcol*=1.-smoothstep(.55,1.,length(ln))*.28;',
    '  dcol+=spec*.55+smoothstep(.1,-.8,ln.y)*.06;',
    '  col=mix(col,dcol,lensA*.92);',
    /* a broad, very faint reflection across the glass */
    '  float k=dot(uv-uLight*.15,normalize(vec2(1.,.6)));',
    '  col+=exp(-pow((k-.62)*5.,2.))*.03+wet*exp(-pow((k-.66)*14.,2.))*.06;',
    '  o=vec4(col,1.);',
    '}'
  ].join('\n');

  function Glass(host, opts) {
    this.host = host; this.o = opts || {};
    this.canvas = host.querySelector('canvas');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.clear = 0; this.clearTarget = 0;
    this.light = [.7, .3]; this.par = [0, 0];
    this.dirty = true; this.raf = 0; this.last = null; this.hits = 0;
    this.GX = 40; this.GY = 24; this.grid = new Uint8Array(this.GX * this.GY);
    this.MS = .5; this.WS = .25;
    this.mask = document.createElement('canvas'); this.mctx = this.mask.getContext('2d');
    this.wetC = document.createElement('canvas'); this.wctx = this.wetC.getContext('2d');
    this.wetting = 0;
  }

  Glass.prototype.init = function (src) {
    var self = this, gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) return Promise.reject(new Error('webgl2'));
    this.gl = gl;
    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.U = {};
    ['uImg', 'uMask', 'uWet', 'uRes', 'uLight', 'uPar', 'uCover', 'uClear', 'uDpr', 'uHaze', 'uDesat', 'uBeads', 'uHazeCol'].forEach(function (n) { self.U[n] = gl.getUniformLocation(pr, n); });
    gl.uniform1i(this.U.uImg, 0); gl.uniform1i(this.U.uMask, 1); gl.uniform1i(this.U.uWet, 2);
    this.tex = [0, 1, 2].map(function (u) {
      var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, u === 0 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    });
    return new Promise(function (res, rej) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () {
        self.img = im;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, self.tex[0]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
        gl.generateMipmap(gl.TEXTURE_2D);
        var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
        self.resize(); self.bind(); res(self);
      };
      im.onerror = rej; im.src = src;
    });
  };

  Glass.prototype.resize = function () {
    var r = this.host.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    var dpr = Math.min(window.devicePixelRatio || 1, this.o.maxDpr || 1.5);
    if (w * h * dpr * dpr > 3.2e6) dpr = Math.sqrt(3.2e6 / (w * h));   // keep the fragment cost sane on big screens
    var old = this.w ? { c: this.mask, w: this.w, h: this.h } : null;
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    // keep what has been wiped when the size changes
    var keep = null;
    if (old) { keep = document.createElement('canvas'); keep.width = old.c.width; keep.height = old.c.height; keep.getContext('2d').drawImage(old.c, 0, 0); }
    this.mask.width = Math.round(w * this.MS); this.mask.height = Math.round(h * this.MS);
    this.mctx.fillStyle = '#000'; this.mctx.fillRect(0, 0, this.mask.width, this.mask.height);
    if (keep) this.mctx.drawImage(keep, 0, 0, this.mask.width, this.mask.height);
    this.wetC.width = Math.round(w * this.WS); this.wetC.height = Math.round(h * this.WS);
    this.wctx.fillStyle = '#000'; this.wctx.fillRect(0, 0, this.wetC.width, this.wetC.height);
    this.radius = Math.max(36, Math.min(w * .052, 92));
    // object-fit: cover with a focal point
    var fx = this.o.focusX == null ? .5 : this.o.focusX, fy = this.o.focusY == null ? .5 : this.o.focusY;
    var iw = this.img.width, ih = this.img.height, s = Math.max(w / iw, h / ih) * 1.03;
    var sw = w / (iw * s), sh = h / (ih * s);
    this.cover = [sw, sh, (1 - sw) * fx, (1 - sh) * fy];
    this.upload(1, this.mask); this.upload(2, this.wetC);
    this.request();
  };

  Glass.prototype.upload = function (unit, src) {
    var gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, this.tex[unit]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  };

  /* a cloth wipe: one broad soft stroke plus faint streaks along it */
  Glass.prototype.wipe = function (x, y, trusted) {
    var p = this.last; this.last = { x: x, y: y };
    if (!p) p = { x: x - .5, y: y };
    var dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (!trusted && d > Math.max(this.w, this.h) * .35) return;   // pointer re-entered elsewhere
    var R = this.radius, c = this.mctx, s = this.MS, nx = -dy / (d || 1), ny = dx / (d || 1);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = 'rgba(255,0,0,1)'; c.shadowBlur = R * .35 * s;
    c.strokeStyle = 'rgba(255,0,0,.9)'; c.lineWidth = R * 2 * s;
    c.beginPath(); c.moveTo(p.x * s, p.y * s); c.lineTo(x * s, y * s); c.stroke();
    c.shadowBlur = 0;
    [-.62, -.3, .05, .38, .7].forEach(function (k, i) {
      c.strokeStyle = 'rgba(255,0,0,' + (.10 + (i % 2) * .08) + ')'; c.lineWidth = R * (.12 + (i % 3) * .05) * s;
      c.beginPath(); c.moveTo((p.x + nx * R * k) * s, (p.y + ny * R * k) * s); c.lineTo((x + nx * R * k) * s, (y + ny * R * k) * s); c.stroke();
    });
    c.restore();
    var wc = this.wctx, ws = this.WS;
    wc.save(); wc.lineCap = 'round'; wc.strokeStyle = '#f00'; wc.lineWidth = R * 1.7 * ws;
    wc.beginPath(); wc.moveTo(p.x * ws, p.y * ws); wc.lineTo(x * ws, y * ws); wc.stroke(); wc.restore();
    this.wetting = 140;
    // coverage
    var steps = Math.max(1, Math.ceil(d / (R * .5)));
    for (var i = 0; i <= steps; i++) this.mark(p.x + dx * i / steps, p.y + dy * i / steps);
    this.maskDirty = true; this.request();
    if (this.o.onWipe) this.o.onWipe(this.coverage());
  };
  Glass.prototype.mark = function (x, y) {
    var cw = this.w / this.GX, ch = this.h / this.GY, r = this.radius * .85;
    for (var gy = Math.max(0, ((y - r) / ch) | 0); gy <= Math.min(this.GY - 1, ((y + r) / ch) | 0); gy++)
      for (var gx = Math.max(0, ((x - r) / cw) | 0); gx <= Math.min(this.GX - 1, ((x + r) / cw) | 0); gx++) {
        var i = gy * this.GX + gx; if (this.grid[i]) continue;
        var ex = (gx + .5) * cw - x, ey = (gy + .5) * ch - y;
        if (ex * ex + ey * ey < r * r) { this.grid[i] = 1; this.hits++; }
      }
  };
  Glass.prototype.coverage = function () { return this.hits / this.grid.length; };
  Glass.prototype.lift = function () { this.last = null; };

  Glass.prototype.setClear = function (on, instant) {
    this.clearTarget = on ? 1 : 0;
    if (instant || this.reduced) this.clear = this.clearTarget;
    this.request();
  };

  /* follow a path (array of [x,y] in css px) over dur ms */
  Glass.prototype.auto = function (pts, dur, done) {
    var self = this, lens = [0], total = 0, seg = 1;
    for (var i = 1; i < pts.length; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(total); }
    if (this.reduced) {                       // draw it at once, no motion
      this.lift(); for (var d = 0; d <= total; d += 8) { var q = at(d); this.wipe(q[0], q[1]); }
      this.lift(); if (done) done(); return function () {};
    }
    var t0 = performance.now(), dead = false, done0 = 0, step0 = Math.max(4, this.radius * .35);
    function at(d) { while (seg < pts.length - 1 && lens[seg] < d) seg++; var a = pts[seg - 1], b = pts[seg], f = (d - lens[seg - 1]) / Math.max(1e-6, lens[seg] - lens[seg - 1]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
    this.lift();
    (function step() {
      if (dead) return;
      var t = Math.min(1, (performance.now() - t0) / dur), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var target = e * total, q = at(target);
      for (var dd = done0 + step0; dd < target; dd += step0) { var r = at(dd); self.wipe(r[0], r[1], true); }   // never skip, whatever the frame rate
      self.wipe(q[0], q[1], true); done0 = target;
      if (self.o.onAuto) self.o.onAuto(q[0], q[1], t);
      if (t < 1) requestAnimationFrame(step); else { self.lift(); if (done) done(); }
    })();
    return function () { dead = true; self.lift(); };
  };

  Glass.prototype.bind = function () {
    var self = this, host = this.host;
    function local(e) { var r = host.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    host.addEventListener('pointermove', function (e) {
      if (e.target.closest && e.target.closest('a,button,input,label,[data-no-wipe]')) { self.lift(); return; }
      var q = local(e);
      self.light = [q[0] / self.w, q[1] / self.h];
      if (e.pointerType === 'mouse' || e.buttons) {
        var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!list.length) list = [e];
        for (var i = 0; i < list.length; i++) { var c = local(list[i]); self.wipe(c[0], c[1]); }
      }
      self.request();
    }, { passive: true });
    ['pointerleave', 'pointerup', 'pointercancel'].forEach(function (t) { host.addEventListener(t, function () { self.lift(); }); });
    host.addEventListener('pointerdown', function () { self.lift(); });
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { self.resize(); }, 120); });
    new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; if (self.visible) self.request(); }).observe(host);
  };

  Glass.prototype.request = function () {
    if (this.raf) return;
    var self = this;
    this.raf = requestAnimationFrame(function () { self.raf = 0; self.render(); });
  };

  Glass.prototype.render = function () {
    var gl = this.gl, U = this.U, again = false;
    if (this.maskDirty) { this.upload(1, this.mask); this.maskDirty = false; }
    if (this.wetting > 0) {                    // the film of water dries off
      this.wetting--;
      this.wctx.fillStyle = 'rgba(0,0,0,.055)'; this.wctx.fillRect(0, 0, this.wetC.width, this.wetC.height);
      this.upload(2, this.wetC); again = true;
    }
    if (Math.abs(this.clear - this.clearTarget) > .002) { this.clear += (this.clearTarget - this.clear) * .08; again = true; }
    else this.clear = this.clearTarget;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(U.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(U.uDpr, this.dpr);
    gl.uniform2f(U.uLight, this.light[0], this.light[1]);
    gl.uniform2f(U.uPar, this.par[0], this.par[1]);
    gl.uniform4f(U.uCover, this.cover[0], this.cover[1], this.cover[2], this.cover[3]);
    gl.uniform1f(U.uClear, this.clear);
    var lk = this.o.look || {};
    gl.uniform1f(U.uHaze, lk.haze == null ? .3 : lk.haze);
    gl.uniform1f(U.uDesat, lk.desat || 0);
    gl.uniform1f(U.uBeads, lk.beads == null ? 1 : lk.beads);
    gl.uniform3fv(U.uHazeCol, lk.color || [.935, .95, .962]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (again && this.visible !== false) this.request();
  };

  window.MNNJGlass = Glass;
})();
