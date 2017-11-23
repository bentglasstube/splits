class Particle {
  constructor(elem, x, y, color) {
    this.x = x;
    this.y = y;

    const angle = Math.random() * 2 * Math.PI;
    const velo = Math.random() / 2 + 0.75;

    this.vx = Math.cos(angle) * velo;
    this.vy = Math.sin(angle) * velo;

    this.ttl = Math.random() * 10000 + 50000;
    this.last = performance.now();
    this.elapsed = 0;

    this.elem = $('<div class="firework"></div>');
    this.elem.css({ background: color });
    this.update(performance.now());

    elem.append(this.elem);
  }

  update(time) {
    const elapsed = time - this.last;
    this.elapsed += elapsed;

    if (this.dead()) {
      if (this.elem) this.elem.remove();
    } else {
      this.x += this.vx * elapsed / 100;
      this.y += this.vy * elapsed / 100;
      this.vy += elapsed / 10000;

      this.elem.css({
        top: this.y + 'px',
        left: this.x + 'px',
        opacity: 1 - (this.elapsed / this.ttl),
      });
    }
  }

  dead() {
    return this.elapsed > this.ttl;
  }
};

class Firework {
  constructor(elem) {
    const x = Math.random() * $(elem).width();
    const y = Math.random() * $(elem).height();

    this.particles = [];
    const count = Math.floor(Math.random() * 20 + 10);
    const red = Math.floor(Math.random() * 64 + 192);
    const green = Math.floor(Math.random() * red);
    const color = 'rgb(' + red + ', ' + green + ', 0)';
    for (var i = 0; i < count; ++i) {
      this.particles.push(new Particle(elem, x, y, color));
    }
    this.stopped = false;

    window.requestAnimationFrame(this.update.bind(this));
  }

  update(time) {
    for (var i = 0; i < this.particles.length; ++i) {
      this.particles[i].update(time);
    }
    this.particles = this.particles.filter(function(p) { return !p.dead(); });

    if (this.particles.length > 0) {
      window.requestAnimationFrame(this.update.bind(this));
    }
  }
};

class FireworkBurst {
  constructor(elem, count) {
    for (var i = 0; i < count; ++i) {
      setTimeout(function() { new Firework(elem); }, Math.random() * i ** 2);
    }
  }
};
