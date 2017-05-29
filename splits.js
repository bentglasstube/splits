$(function() {
  var timer = {};
  var game = {};
  var bests = [];
  // var bests = [ 609699, 715032, 911897, 1236777, 1636572, 2166450, 2627996, 2762127, 3036691, 3678418, 4209097, 4235179, 4454795, 0, 5200000 ];

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

    updateTimer();
  };

  var nextSplit = function() {
    timer.times[timer.index] = performance.now() - timer.start;
    timer.index += 1;

    if (timer.index >= game.splits.length) {
      stop();
      saveRun();
    }
  };

  var prevSplit = function() {
    if (timer.index > 0) {
      $($('#splits tr td.time')[timer.index]).text('');
      timer.index -= 1;
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
    var m = Math.floor(time / 60000);

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

  var saveRun = function() {
    var thisTime = timer.times[game.splits.length - 1];
    var bestTime = bests[game.splits.length - 1];

    if (bestTime == undefined || bestTime == 0 || thisTime < bestTime) {
      console.log('New PB, saving run');
      localStorage.setItem(game.key, timer.times.join(','));
      bests = timer.times;
    } else {
      console.log('Not better than PB (' + thisTime + ' > ' + bestTime + '), ignoring');
    }

  };

  var loadGame = function(key) {
    game = games[key];
    game.key = key;

    $('#game').text(games[key].title);
    $('#category').text(games[key].category);

    $('#splits').empty();
    for (var i = 0; i < game.splits.length; ++i) {
      $('#splits').append('<tr><td>' + game.splits[i] + '</td><td class="time"></td><td class="time"></td></tr>');
    }

    var data = localStorage.getItem(key);
    if (data) {
      bests = data.split(',');
    } else {
      bests = [];
    }

    $('#background').attr('src', key + '.png');
    reset();
  };

  var listGames = function() {
    $('#game').text('Select Run');
    $('#category').text('');
    $('#background').attr('src', '');
    $('#current').text('');

    $('#splits').empty();
    for (var key in games) {
      var text = games[key].title;
      if (games[key].category) text += ' - ' + games[key].category;
      $('#splits').append('<tr><td><a href="#' + key + '">' + text + '</td></tr>');
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
