(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  if (!context) return;

  canvas.className = "tao-rain-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  var width = 0;
  var height = 0;
  var scale = 1;
  var drops = [];
  var ripples = [];
  var frame = 0;
  var lastTime = performance.now();

  function pickX() {
    var roll = Math.random();
    if (window.innerWidth > 900 && roll < 0.34) return Math.random() * 230;
    if (roll < 0.82) return width * (0.76 + Math.random() * 0.22);
    return width * (0.12 + Math.random() * 0.76);
  }

  function makeDrop(initial) {
    var ground = height * (0.82 + Math.random() * 0.15);
    return {
      x: pickX(),
      y: initial ? Math.random() * height : -18 - Math.random() * 120,
      ground: ground,
      speed: 125 + Math.random() * 105,
      length: 7 + Math.random() * 10,
      alpha: 0.08 + Math.random() * 0.12
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    scale = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(scale, 0, 0, scale, 0, 0);

    var target = Math.max(10, Math.min(25, Math.floor(width / 62)));
    while (drops.length < target) drops.push(makeDrop(true));
    drops.length = target;
  }

  function addRipple(drop) {
    ripples.push({
      x: drop.x,
      y: drop.ground,
      radius: 2,
      age: 0,
      life: 850 + Math.random() * 450,
      alpha: Math.min(0.22, drop.alpha + 0.04)
    });
  }

  function drawDrop(drop) {
    context.beginPath();
    context.moveTo(drop.x, drop.y);
    context.lineTo(drop.x - 2.8, drop.y + drop.length);
    context.strokeStyle = "rgba(31, 59, 70," + drop.alpha + ")";
    context.lineWidth = 0.8;
    context.lineCap = "round";
    context.stroke();
  }

  function drawRipple(ripple) {
    var fade = 1 - ripple.age / ripple.life;
    context.beginPath();
    context.ellipse(ripple.x, ripple.y, ripple.radius, ripple.radius * 0.24, 0, 0, Math.PI * 2);
    context.strokeStyle = "rgba(49, 70, 70," + ripple.alpha * fade + ")";
    context.lineWidth = 0.8;
    context.stroke();

    if (ripple.age > 260) {
      context.beginPath();
      context.ellipse(ripple.x, ripple.y, ripple.radius * 0.64, ripple.radius * 0.15, 0, 0, Math.PI * 2);
      context.strokeStyle = "rgba(180, 125, 35," + ripple.alpha * fade * 0.52 + ")";
      context.stroke();
    }
  }

  function tick(now) {
    var elapsed = Math.min(40, now - lastTime);
    lastTime = now;
    context.clearRect(0, 0, width, height);

    drops.forEach(function (drop, index) {
      drop.y += drop.speed * elapsed / 1000;
      if (drop.y + drop.length >= drop.ground) {
        addRipple(drop);
        drops[index] = makeDrop(false);
      } else {
        drawDrop(drop);
      }
    });

    ripples = ripples.filter(function (ripple) {
      ripple.age += elapsed;
      ripple.radius += elapsed * 0.018;
      if (ripple.age >= ripple.life) return false;
      drawRipple(ripple);
      return true;
    });

    frame = requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cancelAnimationFrame(frame);
    } else {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  });

  resize();
  frame = requestAnimationFrame(tick);
})();
