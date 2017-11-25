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
      timer.timer_id = setInterval(updateTimer, 10);
    }
  };

  var stop = function() {
    clearInterval(timer.timer_id);
    timer.timer_id = 0;
    timer.times[timer.index] = performance.now() - timer.start;
  };

  var reset = function() {
    timer.start = 0;
    timer.index = 0;
    timer.times = [game.offset];

    $('#splits tr td').removeClass('gold');
    updateTimer();
    calculateTimeSave();
  };

  var calculateTimeSave = function() {
    var perfect = timer.index > 0 ? timer.times[timer.index - 1] : 0;
    for (var i = timer.index; i < game.splits.length; ++i) {
      perfect += golds[i];
    }
    var save = bests[bests.length - 1] - perfect;
    if (save <= 0) {
      $('#time_save').text('None');
      $('#time_save').addClass('over');
    } else {
      $('#time_save').text(formatTime(save));
      $('#time_save').removeClass('over');
    }
  };

  var nextSplit = function() {
    var thisTime = performance.now() - timer.start;
    var delta = timer.index == 0 ? thisTime : thisTime - timer.times[timer.index - 1];

    timer.times[timer.index] = thisTime;
    if (delta < golds[timer.index]) {
      console.log('Gold split! ' + delta + ' < ' + golds[timer.index]);
      $($('#splits tr td:first-child')[timer.index]).addClass('gold');
      new FireworkBurst($('.viewable'), 10);
    } else {
      console.log('Not gold: ' + delta + ' >= ' + golds[timer.index]);
    }

    timer.index += 1;
    calculateTimeSave();

    if (timer.index >= game.splits.length) {
      stop();
      checkForPB();
    }
  };

  var prevSplit = function() {
    if (timer.index > 0) {
      $($('#splits tr td.time')[timer.index]).text('');
      timer.index -= 1;
      calculateTimeSave();
      $($('#splits tr td:first-child')[timer.index]).removeClass('gold');
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
      }

      if (i <= timer.index) {
        $(tds[1]).text(formatTime(time, true));
      } else {
        $(tds[1]).text('');
      }

      if (bests[i] > 0) {
        $(tds[2]).text(formatTime(bests[i]));
      }
    }

    $('#current').text(formatTime(current));
  };

  var formatTime = function(time, sign) {
    var ts = '';
    if (time < 0) {
      ts += '-';
      time = -1 * time;
    } else if (sign) {
      ts += '+';
    }

    var cs = Math.floor(time / 10) % 100;
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
      ts += '.';
      if (cs < 10) ts += '0';
      ts += cs;
    }

    return ts;
  };

  const currentVersion = 3;
  var saveRun = function() {
    var run = { v: currentVersion, golds: {}, best: {} };
    for (var i = 0; i < game.splits.length; ++i) {
      run.golds[game.splits[i].id] = golds[i];
      run.best[game.splits[i].id] = bests[i];
    }

    console.log('Saving data: ' + JSON.stringify(run));
    localStorage.setItem(game.key, JSON.stringify(run));
  };

  var checkForPB = function() {
    const thisTime = timer.times[game.splits.length - 1];
    const bestTime = bests[game.splits.length - 1];

    for (var i = 0; i < game.splits.length; ++i) {
      const delta = i > 0 ? timer.times[i] - timer.times[i - 1] : timer.times[i];
      if (golds[i] == undefined || delta < golds[i]) {
        console.log('Saving gold for ' + game.splits[i].name);
        golds[i] = delta;
      }
    }

    if (bestTime == undefined || bestTime == 0 || thisTime < bestTime) {
      new FireworkBurst($('.viewable'), 100);
      bests = timer.times;
      console.log('New PB, saving run');
      saveRun();
    } else {
      console.log('Not better than PB (' + thisTime + ' > ' + bestTime + '), ignoring');
    }
  };

  var addInfo = function(label, id, value) {
    var tds = [
      '<td>' + label + '</td>',
      '<td id="' + id + '" class="time">' + formatTime(value) + '</td>'
    ];
    $('#info').append('<tr>' + tds.join('') + '</tr>');
  };

  var loadGame = function(key) {
    game = games[key];
    game.key = key;

    $('#game').text(games[key].title);
    $('#category').text(games[key].category);

    $('#splits').empty();
    for (var i = 0; i < game.splits.length; ++i) {
      $('#splits').append('<tr><td>' + game.splits[i].name + '</td><td class="time"></td><td class="time"></td></tr>');
    }

    var data = localStorage.getItem(key);
    if (data) {
      if (data[0] == '{') {
        var parsedData = JSON.parse(data);
        switch (parsedData.v) {
          case 2:
            bests = parsedData.best;
            golds = parsedData.golds;
            break;

          case 3:
            for (var i = 0; i < game.splits.length; ++i) {
              const id = game.splits[i].id;
              bests.push(parsedData.best[id]);
              golds.push(parsedData.golds[id]);
            }
            break;

          default:
            console.log('Unknown data format version ' + parsedData.v);
            break;
        }

        if (parsedData.v < currentVersion) {
          console.log('Found old data version, saving existing run with new format');
          saveRun();
        }
      } else {
        console.log('Legacy data found');
        bests = data.split(',');
        golds.push(+bests[0]);
        for (var i = 1; i < bests.length; ++i) {
          golds.push(bests[i] - bests[i - 1]);
        }
      }

      console.log('Got data: ' + data);
    }

    $('#info').empty();
    if (golds.length > 0) {
      var sumOfBest = 0;
      for (var i = 0; i < golds.length; ++i) {
        sumOfBest += golds[i];
      }

      addInfo('Sum of best', 'sum_best', sumOfBest);
      addInfo('Possible time save', 'time_save', 0);
      calculateTimeSave();
    }

    $('#background').attr('src', key + '.png');
    reset();
  };

  var titleSort = function(a, b) {
    if (games[a].title < games[b].title) return -1;
    if (games[a].title > games[b].title) return 1;
    return 0;
  };

  var listGames = function() {
    $('#game').text('Select Run');
    $('#category').text('');
    $('#background').attr('src', '');
    $('#current').text('');

    $('#splits').empty();
    var keys = Object.keys(games).sort(titleSort);
    for (var i = 0; i < keys.length; ++i) {
      var text = games[keys[i]].title;
      if (games[keys[i]].category) text += ' - ' + games[keys[i]].category;
      $('#splits').append('<tr><td><a href="#' + keys[i] + '">' + text + '</td></tr>');
    }
  };

  $(document).keydown(function(e) {
    if (e.key == ' ') {
      running() ? nextSplit() : start();
      e.preventDefault();
    } else if (e.key == 'Escape') {
      running() ? stop() : reset();
      e.preventDefault();
    } else if (e.key == 'Backspace') {
      running() ? prevSplit() : reset();
      e.preventDefault();
    }
  });

  $('#splits').click(function(e) {
    if (running()) nextSplit();
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
