// A live effect player that keeps pixels square. The canvas holds only what a whole-number scale of the stage needs,
// so every art pixel lands on the same number of device pixels; deterministic, so frames can be scrubbed exactly.

import {
  createFrame, clearFrame, createFx, createAct, actBounds, actSpan,
  composite, backdrop, drawActor, painterFor, stockActor, actorAlphaOf,
} from "../src/core/index.js";

// full-frame effects (weather, wipes) are drawn for one exact canvas, so they can't be reframed around their art
export const isScreen = (fx) => fx.meta.size[0] >= 320 && Math.abs(fx.meta.size[0] / fx.meta.size[1] - 16 / 9) < 0.05;

const MAX_SCALE = 24;

export class Player {
  // art: [x0, y0, x1, y1, peak] from the framing table (the box the artwork really uses, around its origin)
  constructor(canvas, fx, { bg = "auto", pad = 1.12, art = null, soft = false, onDone = null } = {}) {
    Object.assign(this, {
      canvas, fx, pad, art, soft, onDone, ctx: canvas.getContext("2d"),
      opts: {}, flip: false, actor: true, speed: 1, playing: true,
      frameIndex: 0, totalFrames: 1, k: 1, W: 0, H: 0, x: 0, y: 0, zoom: 0,
    });
    this.bg = bg === "auto" ? fx.meta.bg : bg;
  }

  get acted() {
    return !!this.fx.mod.act && this.actor;
  }

  get isFrozen() {
    return this.acted && !!this.inst?.frozen;
  }

  get peak() {
    return this.art?.[4] ?? Math.round(this.totalFrames * 0.4);
  }

  setFx(fx, art = null) {
    this.fx = fx;
    this.art = art;
    this.bg = fx.meta.bg;
    this.fit(this.cssW, this.cssH, this.zoom, true);
  }

  computeMetrics() {
    const m = this.fx.meta;
    if (!this.acted) {
      this.totalFrames = Math.max(1, Math.round(m.duration * m.fps) + (m.loop ? 0 : 1));
      this.cycleSpan = { from: 0, to: m.duration, stops: 0 };
      return;
    }
    const span = actSpan(this.fx.mod);
    const endT = m.loop ? m.duration : span.to;
    const stops = (this.fx.mod.act.hits ?? []).reduce((acc, h) => acc + (h.stop ?? 0), 0);
    const totalSec = Math.max(1 / m.fps, endT - span.from + stops);
    this.totalFrames = Math.max(2, Math.round(totalSec * m.fps) + (m.loop ? 0 : 1));
    this.cycleSpan = { from: span.from, to: endT, stops, totalSec };
  }

  // the box to frame, in pixels around the effect's origin
  artBox() {
    if (this.acted) {
      const b = { ...actBounds(this.fx.mod) };
      b.y1 = Math.min(b.y1, 22);
      return b;
    }
    const m = this.fx.meta;
    if (this.art && !this.fx.mod.act) {
      const [x0, y0, x1, y1] = this.art;
      return { x0, y0, x1, y1 };
    }
    return { x0: -m.origin[0], y0: -m.origin[1], x1: m.size[0] - m.origin[0], y1: m.size[1] - m.origin[1] };
  }

  // size the canvas for a stage of cssW x cssH. Returns true when the art was rebuilt.
  fit(cssW, cssH, zoom = this.zoom, force = false) {
    if (!cssW || !cssH) return false;
    const dpr = devicePixelRatio || 1, bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    let W, H, k, x, y;
    let sharp = isScreen(this.fx);

    if (sharp) {
      // scale up by a whole number, then let the browser smooth it down: even pixels at any stage size
      [W, H] = this.fx.meta.size;
      [x, y] = this.fx.meta.origin;
      k = Math.max(1, Math.ceil(Math.max(bw / W, bh / H)));
    } else {
      const b = this.artBox(), w = b.x1 - b.x0, h = b.y1 - b.y0;
      // an acted effect already carries its own margins: the performer and the target, a stage apart
      const pad = this.acted ? Math.min(this.pad, 1.06) : this.pad;
      const room = Math.min(bw / (w * pad), bh / (h * pad));
      const best = Math.floor(room);
      k = Math.max(1, Math.min(MAX_SCALE, Math.max(1, best) + zoom));
      // Between 1x and 2x a whole number would leave the art tiny, so scale by a fraction, the even-pixel way.
      sharp = this.soft && !zoom && room >= 1.25 && room < 2;
      if (sharp) {
        W = Math.ceil(bw / room);
        H = Math.ceil(bh / room);
        k = 2;
      } else {
        W = Math.ceil(bw / k);
        H = Math.ceil(bh / k);
      }
      x = Math.floor((W - w) / 2) - b.x0;
      // the floor sits low, but on a tall stage not so low that the action plays out along the bottom edge
      y = this.acted ? Math.max(2 - b.y0, Math.min(H - b.y1 - 2, Math.round(H * 0.72))) : Math.floor((H - h) / 2) - b.y0;
      this.fitScale = Math.max(1, best);
    }

    if (!force && W === this.W && H === this.H && k === this.k && x === this.x && y === this.y && sharp === this.sharp) {
      this.cssW = cssW;
      this.cssH = cssH;
      return false;
    }

    const hadInst = !!this.inst, keep = this.frameIndex;
    Object.assign(this, { W, H, k, x, y, sharp, cssW, cssH, zoom });
    const c = this.canvas.style;
    if (sharp) {
      this.canvas.width = W * k;
      this.canvas.height = H * k;
      c.cssText = "width:100%;height:100%;object-fit:cover;image-rendering:auto";
      this.buf = new OffscreenCanvas(W, H);
      this.bctx = this.buf.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;
    } else {
      this.canvas.width = W;
      this.canvas.height = H;
      c.cssText = `width:${(W * k) / dpr}px;height:${(H * k) / dpr}px;image-rendering:pixelated`;
      this.buf = this.bctx = null;
    }
    this.frame = createFrame(W, H);
    this.img = this.ctx.createImageData(W, H);
    this.computeMetrics();
    this.setBg(this.bg);
    this.restart();
    if (hadInst && keep && !force) this.seekFrame(keep);
    else this.render();
    return true;
  }

  setBg(kind) {
    this.bg = kind;
    this.bgBuf = kind === "none" ? null : backdrop(kind, this.W, this.H, this.y);
    this.dirty = true;
  }

  newInst() {
    return (this.acted ? createAct : createFx)(this.fx.mod, { x: this.x, y: this.y, flip: this.flip, ...this.opts });
  }

  restart() {
    this.inst = this.newInst();
    this.acc = 0;
    this.wait = 0;
    this.frameIndex = 0;
    this.dirty = true;
  }

  tick(dt) {
    const m = this.fx.meta, step = 1 / m.fps;
    if (this.playing) this.acc = Math.min(this.acc + dt * this.speed, 0.25);
    let moved = false;
    while (this.acc >= step) {
      this.acc -= step;
      if (!m.loop && (this.acted ? this.inst.done() : this.inst.t >= m.duration)) {
        if (this.onDone) {
          this.onDone();
          return true;
        }
        this.wait += step;
        if (this.wait > 0.45) this.restart();
      } else {
        this.inst.update(step);
        this.frameIndex = m.loop ? (this.frameIndex + 1) % this.totalFrames : Math.min(this.frameIndex + 1, this.totalFrames - 1);
      }
      moved = true;
    }
    if (moved || this.dirty) this.render();
    return moved;
  }

  seekFrame(targetFrame) {
    const clamped = Math.max(0, Math.min(this.totalFrames - 1, targetFrame | 0));
    const step = 1 / this.fx.meta.fps;
    this.wait = 0;
    this.acc = 0;
    if (clamped < this.frameIndex) {
      this.inst = this.newInst();
      this.frameIndex = 0;
    }
    while (this.frameIndex < clamped) {
      this.inst.update(step);
      this.frameIndex++;
    }
    this.render();
  }

  get seconds() {
    const m = this.fx.meta;
    if (this.acted) {
      const v = m.loop && this.inst.t >= m.duration ? this.inst.t % m.duration : this.inst.t;
      return Math.abs(v) < 0.005 ? 0 : v;
    }
    return m.loop ? this.inst.t % m.duration : Math.min(this.inst.t, m.duration);
  }

  paint(sx = 0, sy = 0) {
    const clear = sx || sy || !this.bgBuf;
    if (this.sharp) {
      this.bctx.putImageData(this.img, 0, 0);
      if (clear) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.buf, sx * this.k, sy * this.k, this.W * this.k, this.H * this.k);
    } else {
      if (clear) this.ctx.clearRect(0, 0, this.W, this.H);
      this.ctx.putImageData(this.img, sx, sy);
    }
    this.dirty = false;
  }

  render() {
    const f = clearFrame(this.frame);
    if (this.acted) {
      this.inst.draw(f);
      composite(f, this.img.data, this.bgBuf);
      const [sx, sy] = this.inst.shake;
      this.paint(sx, sy);
      return;
    }
    this.inst.draw(f, "back");
    const m = this.fx.meta, tt = m.loop ? this.inst.t % m.duration : Math.min(this.inst.t, m.duration);
    if (m.actor && this.actor) {
      drawActor(painterFor(f).place(this.x, this.y, this.flip), this.inst.options.actor ?? stockActor(), actorAlphaOf(this.fx.mod, tt, this.inst.options));
    }
    this.inst.draw(f, "front");
    composite(f, this.img.data, this.bgBuf);
    this.paint();
  }
}
