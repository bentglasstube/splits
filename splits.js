$(function() {
  const API_KEY = 'AIzaSyCwqvz_8dfscK14uLAJd_StAnDKozL3uck';
  const CLIENT_ID = '1097783156099-mpq2ronpn9mek0eibqq8dn3im0lpur8i.apps.googleusercontent.com';
  const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

  var timer = {};
  var game = {};
  var nicname = {};
  var bests = [];
  var golds = [];
  var driveSignedIn = false;

  var updateSigninStatus = function(isSignedIn) {
    driveSignedIn = isSignedIn;
    if (driveSignedIn) {
      $('#auth').hide();
      load();
    }
  }

  var initClient = function() {
    gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: 'https://www.googleapis.com/auth/drive.file',
    }).then(function() {
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
      updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    });
  }

  var driveLoad = function(key) {
    gapi.client.drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id)',
      q: 'name = "' + key + '.splits.json"',
    }).then(function(response) {
      var files = response.result.files;
      if (files) {
        if (files.length == 0) {
          console.log('No data in drive, saving');
          driveSave(key);
        } else if (files.length > 1) {
          console.log('Multiple files for ' + key + ', ignoring them all');
        } else {
          console.log('Loading data from drive.');
          game.fileId = files[0].id;
          gapi.client.drive.files.get({
            fileId: game.fileId,
            alt: 'media',
          }).then(function(response) {
            var dirty = false;
            var data = parseData(response.body);

            var localBest = bests[bests.length - 1] || Infinity;
            var driveBest = data.bests[data.bests.length - 1] || Infinity;

            if (localBest != driveBest) dirty = true;
            if (driveBest < localBest) {
              console.log('drive PB better, swapping');
              bests = data.bests
            }

            for (var i = 0; i < game.splits.length; ++i) {
              if (golds[i] != data.golds[i]) dirty = true;
              if ((data.golds[i] || Infinity) < (golds[i] || Infinity)) {
                console.log('drive gold for ' + game.splits[i].id + ' better, using');
                golds[i] = data.golds[i];
              }
            }
            if (dirty) {
              reset();
              saveRun();
            }
          });
        }
      }
    });
  }

  var driveSave = function(key) {
    var boundary = '553824cfbc9d16d87b5db64abaf2c11f8521299b';
    var delim = '\r\n--' + boundary + '\r\n';
    var end_delim = '\r\n--' + boundary + '--';

    var data = localStorage.getItem(key);
    var meta = {
      title: key + '.splits.json',
      mimeType: 'application/json',
    }

    var jsonHeader = 'Content-Type: application/json\r\n\r\n';

    var body = delim + jsonHeader + JSON.stringify(meta);
    body += delim + jsonHeader + data + end_delim;

    // using v2 because v3 gave 404s
    var path = '/upload/drive/v2/files';
    if (game.fileId) path += '/' + game.fileId;

    gapi.client.request({
      path: path,
      method: game.fileId ? 'PUT' : 'POST',
      params: { 'uploadType': 'multipart' },
      body: body,
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
      }
    }).execute(function(response) {
      if (response) {
        console.log('Saved data to google drive');
      } else {
        console.log('Error saving to drive');
      }
    });
  }

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
    } else if (isNaN(save))  {
      $('#time_save').text('Unknown');
    } else {
      $('#time_save').text(formatTime(save));
      $('#time_save').removeClass('over');
    }
  };

  var nextSplit = function(index) {
    if (index != undefined) timer.index = index;

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

  var checkAutoSplit = function() {
    autosplit.checkUpdate(function(command) {
      if (command['command'] == 'start') {
          if (running()) { stop(); reset(); }
          start();
      } else if (command['command'] == 'reset') {
          stop();
          reset();
      } else if (command['command'] == 'split') {
          n = nicname[command['data']];
          if (n != undefined) {
              nextSplit(n);
          }
      } else {
          console.log('Unknown autosplit command: ', command);
      }
    });
  }

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

    var hms = formatTime(current);
    if (hms.indexOf('.') > 0) hms = hms.slice(0, -2);
    $('#hms').text(hms);

    var ms = Math.abs(Math.floor(current / 10) % 100);
    if (ms < 10) ms = '0' + ms;
    $('#ms').text(ms);
  };

  var formatTime = function(time, sign) {
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

  const currentVersion = 3;
  var saveRun = function() {
    var run = { v: currentVersion, golds: {}, best: {} };
    for (var i = 0; i < game.splits.length; ++i) {
      run.golds[game.splits[i].id] = golds[i];
      run.best[game.splits[i].id] = bests[i];
    }

    console.log('Saving data: ' + JSON.stringify(run));
    localStorage.setItem(game.key, JSON.stringify(run));
    if (driveSignedIn) driveSave(game.key);
  };

  var checkForPB = function() {
    const thisTime = timer.times[game.splits.length - 1];
    const bestTime = bests[game.splits.length - 1];

    var dirty = false;
    for (var i = 0; i < game.splits.length; ++i) {
      const delta = i > 0 ? timer.times[i] - timer.times[i - 1] : timer.times[i];
      if (golds[i] == undefined || delta < golds[i]) {
        console.log('Saving gold for ' + game.splits[i].name);
        golds[i] = delta;
        dirty = true;
      }
    }

    if (bestTime == undefined || bestTime == 0 || thisTime < bestTime) {
      new FireworkBurst($('.viewable'), 100);
      bests = timer.times;
      console.log('New PB, saving run');
      dirty = true;
    } else {
      console.log('Not better than PB (' + thisTime + ' > ' + bestTime + '), ignoring');
    }

    if (dirty) saveRun();
  };

  var addInfo = function(label, id, value) {
    var tds = [
      '<td>' + label + '</td>',
      '<td id="' + id + '" class="time">' + formatTime(value) + '</td>'
    ];
    $('#info').append('<tr>' + tds.join('') + '</tr>');
  };

  var parseData = function(data) {
    var result = {
      bests: [],
      golds: [],
    };

    if (data[0] == '{') {
      var parsedData = JSON.parse(data);
      switch (parsedData.v) {
        case 2:
          result.bests = parsedData.best;
          result.golds = parsedData.golds;
          break;

        case 3:
          for (var i = 0; i < game.splits.length; ++i) {
            const id = game.splits[i].id;
            result.bests.push(parsedData.best[id]);
            result.golds.push(parsedData.golds[id]);
          }
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
    nicname = {};
    for (var i = 0; i < game.splits.length; ++i) {
      $('#splits').append('<tr><td>' + game.splits[i].name + '</td><td class="time"></td><td class="time"></td></tr>');
      nicname[game.splits[i].id] = i;
    }

    var data = localStorage.getItem(key);
    if (data) {
      var result = parseData(data);
      bests = result.bests;
      golds = result.golds;
    }
    if (driveSignedIn) driveLoad(key);

    $('#info').empty();
    var sumOfBest = 0;
    for (var i = 0; i < golds.length; ++i) {
      sumOfBest += golds[i];
    }

    addInfo('Sum of best', 'sum_best', sumOfBest);
    addInfo('Possible time save', 'time_save', 0);

    if (sumOfBest == 0) $('#sum_best').text('None');
    calculateTimeSave();

    $('#background').attr('src', key + '.png');
    reset();
  };

  var titleSort = function(a, b) {
    if (games[a].title < games[b].title) return -1;
    if (games[a].title > games[b].title) return 1;
    return 0;
  };

  var listGames = function() {
    $('#category').text('');
    $('#background').attr('src', '');
    $('#current').text('');
    $('#info').empty();

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

  $('#auth').click(function() {
    gapi.auth2.getAuthInstance().signIn();
  })

  $('#reset').click(function() {
    golds[0] = bests[0];
    for (var i = 1; i < golds.length; ++i) {
      golds[i] = bests[i] - bests[i - 1];
    }
    saveRun();
    calculateTimeSave();
  })

  var load = function() {
    if (location.hash) {
      loadGame(location.hash.replace('#',''));
    } else {
      listGames();
    }
  };

  $(window).on('hashchange', load);

  load();
  gapi.load('client:auth2', initClient);
  autosplit = new AutoSplit();
  $('#autosplitfile').on('change', function() {
      autosplit.setFile('autosplitfile');
  });
  timer.auto_id = setInterval(checkAutoSplit, 20);
});
