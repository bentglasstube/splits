$(function() {

  var timer = {
    id: undefined,
    time: 0,
    start: 0,
  };
  var stats = {
    best: 3600000,
    done: 0,
    failed: 0,
    totalTime: 0,
  };
  var best = 3600000;
  var done = 0;
  var failed = 0;
  var totalTime = 0;

  var startRun = function() {
    if (!timer.id) {
      timer.start = performance.now();
      timer.id = requestAnimationFrame(updateTime);
    }
  };

  var cancelRun = function() {
    cancelAnimationFrame(timer.id);
    timer.id = undefined;

    ++stats.failed;
    stats.streak = 0;
    updateInfo();
  };

  var finishRun = function() {
    cancelAnimationFrame(timer.id);
    timer.id = undefined;

    var elapsed = performance.now() - timer.start;
    var tr = $('<tr><td class="time">' + formatTime(elapsed) + '</td></tr>');

    ++stats.done;
    ++stats.streak;
    stats.totalTime += elapsed;

    if (elapsed < best) {
      best = elapsed;
      new FireworkBurst($('.viewable'), 10);
      tr.addClass('gold');
    }

    $('#splits').append(tr);
    var trs = $('#splits tr');
    if (trs.length > 15) trs[0].remove();

    updateInfo();
  };

  var updateTime = function() {
    var elapsed = performance.now() - timer.start;

    var hms = formatTime(elapsed);
    if (hms.indexOf('.') > 0) hms = hms.slice(0, -2);
    $('#hms').text(hms);

    var ms = Math.abs(Math.floor(elapsed / 10) % 100);
    if (ms < 10) ms = '0' + ms;
    $('#ms').text(ms);
    if (timer.id) timer.id = requestAnimationFrame(updateTime);
  };

  var updateInfo = function() {
    updateTime();

    $('#runs').text(stats.done + stats.failed);
    $('#completion').text(Math.floor(100 * stats.done / (stats.done + stats.failed)) + '%');
    $('#streak').text(stats.streak);
    $('#averageTime').text(formatTime(stats.totalTime / stats.done));
    $('#best').text(formatTime(stats.best));
  };

  var formatTime = function(time) {
    var ts = '';

    var ds = Math.floor(time / 100) % 10;
    var s = Math.floor(time / 1000) % 60;
    var m = Math.floor(time / 60000) % 60;
    var h = Math.floor(time / 3600000);

    if (time > 3600000) {
      ts += h + ':';
      if (m < 10) ts += '0';
    }

    if (time > 60000) {
      ts += m + ':';
      if (s < 10) ts += '0';
    }

    ts += s;

    if (time < 60000) {
      ts += '.' + ds;
    }

    return ts;
  };

  $(document).keydown(function(e) {
    if (e.key == ' ') {
      timer.id ? finishRun() : startRun();
      e.preventDefault();
    } else if (e.key == 'Escape') {
      if (timer.id) cancelRun();
      e.preventDefault();
    }
  });

  $('#hms').text('0');
  $('#ms').text('00');
});
