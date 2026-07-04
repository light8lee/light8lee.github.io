(function () {
  var canvas = document.getElementById("home-constellation");
  if (!canvas) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var context = canvas.getContext("2d");
  var points = [];
  var animationFrame = null;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    createPoints(rect.width, rect.height);
  }

  function createPoints(width, height) {
    var count = Math.max(18, Math.floor(width / 42));
    points = [];
    for (var i = 0; i < count; i += 1) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22
      });
    }
  }

  function draw() {
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(36, 87, 166, 0.65)";
    context.strokeStyle = "rgba(36, 87, 166, 0.16)";

    for (var i = 0; i < points.length; i += 1) {
      var point = points[i];
      point.x += point.vx;
      point.y += point.vy;

      if (point.x < 0 || point.x > width) point.vx *= -1;
      if (point.y < 0 || point.y > height) point.vy *= -1;

      context.beginPath();
      context.arc(point.x, point.y, 2, 0, Math.PI * 2);
      context.fill();

      for (var j = i + 1; j < points.length; j += 1) {
        var next = points[j];
        var dx = point.x - next.x;
        var dy = point.y - next.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 130) {
          context.globalAlpha = 1 - distance / 130;
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(next.x, next.y);
          context.stroke();
          context.globalAlpha = 1;
        }
      }
    }

    animationFrame = window.requestAnimationFrame(draw);
  }

  function start() {
    resize();
    if (reducedMotion.matches) {
      drawStatic();
      return;
    }
    draw();
  }

  function drawStatic() {
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(36, 87, 166, 0.35)";
    points.forEach(function (point) {
      context.beginPath();
      context.arc(point.x, point.y, 2, 0, Math.PI * 2);
      context.fill();
    });
  }

  window.addEventListener("resize", function () {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    start();
  });

  start();
})();
