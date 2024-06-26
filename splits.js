$(function() {
  var timer = {};
  var game = {};
  var bests = [];
  var golds = [];

  var running = function() {
    return timer.timer_id > 0;
  };

  var start = function() {
    if (timer.index < game.splits.length) {
      timer.start = performance.now() - timer.times[timer.index];
      timer.timer_id = requestAnimationFrame(updateTimer);
    }
  };

  var stop = function() {
    cancelAnimationFrame(timer.timer_id);
    timer.timer_id = 0;
    timer.times[timer.index] = performance.now() - timer.start;
  };

  var reset = function(saveData) {
    timer.start = 0;
    timer.index = 0;
    timer.times = [game.offset];

    $('#splits tr td').removeClass('gold');
    updateTimer();
    calculateTimeSave(true);

    if (saveData) saveRun();
  };

  var calculateTimeSave = function(updateSum) {
    var perfect = timer.index > 0 ? timer.times[timer.index - 1] : 0;
    for (var i = timer.index; i < game.splits.length; ++i) {
      perfect += golds[i];
    }

    if (updateSum) {
      if (perfect == 0) {
        $('#sum_best').text('None');
      } else {
        $('#sum_best').text(formatTime(perfect));
      }
    }

    var save = bests[bests.length - 1] - perfect;
    if (save <= 0) {
      $('#time_save').text('None');
      $('#time_save').addClass('over');
    } else if (isNaN(save))  {
      $('#time_save').text('Unknown');
    } else {
      $('#time_save').text(formatTime(save));
      $('#time_save').removeClass('over');
    }
  };

  var nextSplit = function() {
    var thisTime = performance.now() - timer.start;
    var delta = timer.index == 0 ? thisTime : thisTime - timer.times[timer.index - 1];

    // Debounce splits less than 1s apart
    if (delta < 1000) return

    timer.times[timer.index] = thisTime;
    if (delta < golds[timer.index]) {
      console.log('Gold split! ' + delta + ' < ' + golds[timer.index]);
      $($('#splits tr td:first-child')[timer.index]).addClass('gold');
      new FireworkBurst($('.viewable'), 10);
    } else {
      console.log('Not gold: ' + delta + ' >= ' + golds[timer.index]);
    }

    timer.index += 1;
    calculateTimeSave(false);

    if (timer.index >= game.splits.length) {
      stop();
      checkForPB();

      var last = $('#splits tr:last-child td:last-child');
      last.text(formatTime(thisTime));
      last.removeClass('old');
    }
  };

  var skipSplit = function() {
    // Can't skip the last split
    if (timer.index >= game.splits.length - 1) return;

    timer.times[timer.index] = undefined;
    console.log('Skipped split');

    timer.index += 1;
    calculateTimeSave(false);
  };

  var prevSplit = function() {
    if (timer.index > 0) {
      $($('#splits tr td.time')[timer.index]).text('');
      timer.index -= 1;
      calculateTimeSave(false);
      $($('#splits tr td:first-child')[timer.index]).removeClass('gold');
    }
  };

  var drawDigit = function(ctx, val, xo, w, h) {
    if (val < 0) val = 0;

    for (var i = 0; i < 4; ++i) {
      var bit = 2 ** i;
      ctx.fillStyle = "rgb(216, 255, 0, " + ((val % 10) & bit ? 0.5 : 0.1) + ")";
      ctx.fillRect(xo * w + 2, (3 - i) * h + 2, w - 4, h - 4);
    }
  };

  var updateTimer = function() {
    var trs = $('#splits tr');
    var current = running() ?  performance.now() - timer.start : timer.times[0];

    for (var i = 0; i < game.splits.length; ++i) {
      var tds = $(trs[i]).children('td');

      var time;
      if (i == timer.index) {
        $(trs[i]).addClass('current');
        time = current;
      } else {
        $(trs[i]).removeClass('current');
        time = timer.times[i];
      }

      if (bests[i] > 0) {
        time -= bests[i];
        if (time > 0) {
          $(tds[1]).removeClass('under');
          $(tds[1]).addClass('over');
        } else {
          $(tds[1]).addClass('under');
          $(tds[1]).removeClass('over');
        }

        if (i <= timer.index && !isNaN(time)) {
          $(tds[1]).text(formatTime(time, true));
        } else {
          $(tds[1]).text('');
        }
      }

      if (i < timer.index) {
        $(tds[2]).text(formatTime(timer.times[i], false));
        $(tds[2]).removeClass('old');
      } else if (i == timer.index && !(bests[i] > 0)) {
        $(tds[2]).text(formatTime(current, false));
        $(tds[2]).removeClass('old');
      } else {
        $(tds[2]).text(bests[i] > 0 ? formatTime(bests[i]) :  '');
        $(tds[2]).addClass('old');
      }
    }

    var hms = formatTime(current);
    if (hms.indexOf('.') > 0) hms = hms.slice(0, -2);
    $('#hms').text(hms);

    var ms = Math.abs(Math.floor(current / 10) % 100);
    if (ms < 10) ms = '0' + ms;
    $('#ms').text(ms);

    var t = $('#current');
    var tw = t.width();
    var th = t.height();

    var ctx = $('canvas')[0].getContext('2d', 'timer', tw, th);
    ctx.clearRect(0, 0, tw, th);

    var cw = tw / 6;
    var ch = th / 4;

    var h = Math.floor(current / 3600000);
    var m = Math.floor(current / 60000) % 60;
    var s = Math.floor(current / 1000) % 60;
    var ms = current % 1000;

    drawDigit(ctx, h,        0, cw, ch);
    drawDigit(ctx, m / 10,   1, cw, ch);
    drawDigit(ctx, m % 10,   2, cw, ch);
    drawDigit(ctx, s / 10,   3, cw, ch);
    drawDigit(ctx, s % 10,   4, cw, ch);
    drawDigit(ctx, ms / 100, 5, cw, ch);

    if (running()) timer.timer_id = requestAnimationFrame(updateTimer);
  };

  var formatTime = function(time, sign) {
    if (isNaN(time)) return '-';

    var ts = '';
    if (time < 0) {
      ts += '-';
      time = -1 * time;
    } else if (sign) {
      ts += '+';
    }

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

  const currentVersion = 4;
  var saveRun = function() {
    var run = { v: currentVersion, golds: {}, best: {}, runs: {} };
    for (var i = 0; i < game.splits.length; ++i) {
      run.golds[game.splits[i]] = golds[i];
      run.best[game.splits[i]] = bests[i];
    }

    run.runs = {
      attempts: 0,
      completed: 0,
    };

    console.log('Saving data: ' + JSON.stringify(run));
    localStorage.setItem(game.key, JSON.stringify(run));
  };

  var checkForPB = function() {
    const thisTime = timer.times[game.splits.length - 1];
    const bestTime = bests[game.splits.length - 1];

    for (var i = 0; i < game.splits.length; ++i) {
      const delta = i > 0 ? timer.times[i] - timer.times[i - 1] : timer.times[i];
      if (golds[i] == undefined || delta < golds[i]) {
        console.log('Saving gold for ' + game.splits[i]);
        golds[i] = delta;
      }
    }

    if (bestTime == undefined || bestTime == 0 || thisTime < bestTime) {
      new FireworkBurst($('.viewable'), 100);
      bests = timer.times;
      console.log('New PB, saving run');
    } else {
      console.log('Not better than PB (' + thisTime + ' > ' + bestTime + '), ignoring');
    }

    saveRun();
  };

  var makeCell = function(id, text) {
    return '<td id="' + id + '" class="time">' + text  + '</td>';
  }

  var cellTime = function(id, value) {
    return makeCell(id, formatTime(value));
  }

  var addInfo = function(label, data) {
    var tds = [ '<td>' + label + '</td>', data ];
    $('#info').append('<tr>' + tds.join('') + '</tr>');
  };

  var parseData = function(data) {
    var result = {
      bests: [],
      golds: [],
      runs: { attempts: 0, completed: 0 },
    };

    if (data[0] == '{') {
      var parsedData = JSON.parse(data);
      switch (parsedData.v) {
        case 2:
          result.bests = parsedData.best;
          result.golds = parsedData.golds;
          result.runs = { attempts: 0, completed: 0 };
          break;

        case 3:
          for (var i = 0; i < game.splits.length; ++i) {
            const id = game.splits[i];
            result.bests.push(parsedData.best[id]);
            result.golds.push(parsedData.golds[id]);
          }
          result.runs = { attempts: 0, completed: 0 };
          break;

        case 4:
          for (var i = 0; i < game.splits.length; ++i) {
            const id = game.splits[i];
            result.bests.push(parsedData.best[id]);
            result.golds.push(parsedData.golds[id]);
          }
          result.runs = parsedData.runs;
          break;

        default:
          console.log('Unknown data format version ' + parsedData.v);
          break;
      }

      if (parsedData.v < currentVersion) {
        console.log('Found old data version, saving existing run with new format');
      }
    } else {
      console.log('Legacy data found');
      result.bests = data.split(',');
      result.golds.push(+result.bests[0]);
      for (var i = 1; i < result.bests.length; ++i) {
        result.golds.push(result.bests[i] - result.bests[i - 1]);
      }
    }

    return result;
  }

  var loadGame = function(key) {
    game = games[key];
    game.key = key;
    bests = [];
    golds = [];

    $('#category').text(games[key].category);

    $('#splits').empty();
    for (var i = 0; i < game.splits.length; ++i) {
      $('#splits').append('<tr><td>' + game.splits[i] + '</td><td class="time"></td><td class="time old"></td></tr>');
    }

    var data = localStorage.getItem(key);
    if (data) {
      var result = parseData(data);
      bests = result.bests;
      golds = result.golds;
    }

    $('#data').text(data);

    $('#info').empty();
    addInfo('Sum of best', cellTime('sum_best', ''));
    addInfo('Possible time save', cellTime('time_save', ''));

    calculateTimeSave(true);

    $('canvas').show();
    $('.viewable').css('overflow', 'hidden');
    reset(false);
  };

  var titleSort = function(a, b) {
    if (games[a].title < games[b].title) return -1;
    if (games[a].title > games[b].title) return 1;
    return 0;
  };

  var listGames = function() {
    $('#category').text('');
    $('#background').attr('src', '');
    $('#hms').text('');
    $('#ms').text('');
    $('#info').empty();

    $('.viewable').css('overflow', 'visible');
    $('canvas').hide();

    $('#splits').empty();
    var keys = Object.keys(games).sort(titleSort);
    for (var i = 0; i < keys.length; ++i) {
      var text = games[keys[i]].title;
      if (games[keys[i]].category) text += ' - ' + games[keys[i]].category;
      $('#splits').append('<tr><td><a href="#' + keys[i] + '">' + text + '</td></tr>');
    }
  };

  $(document).keydown(function(e) {
    if (e.key == ' ' || e.key == 'F4') {
      running() ? nextSplit() : start();
      e.preventDefault();
    } else if (e.key == 'Escape') {
      running() ? stop() : reset(true);
      e.preventDefault();
    } else if (e.key == 'Backspace' || e.key == 'F7') {
      running() ? prevSplit() : reset(false);
      e.preventDefault();
    } else if (e.key == 'Tab' || e.key == 'F6') {
      if (running()) skipSplit();
      e.preventDefault();
    } else if (e.key == 'F5') {
      stop();
      reset(true);
      e.preventDefault();
    }
  });

  $('#splits').click(function(e) {
    if (running()) nextSplit();
  });

  $('#save').click(function(e) {
    localStorage.setItem(game.key, $('#data').val());
    load();
  });

  var load = function() {
    if (location.hash) {
      loadGame(location.hash.replace('#',''));
    } else {
      listGames();
    }
  };

  $(window).on('hashchange', load);
  load();
});
