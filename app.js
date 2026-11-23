// Poké City on its own page: plays game.riv full-window and keeps the city in this browser (localStorage).
//
// The save. The Rive runtime has no storage, so the game keeps the whole city (who lives on which lot,
// friendship hearts, decorations, time of day) in one string, CityVM `save` ("PC1;..."). The game reads it
// once on its first frame and rewrites it when something changes (and every 20 s). This page hands the stored
// string over before that first frame and copies every change back.
//
//   ?reset=1  forgets the city in this browser and starts fresh.
(function () {
  'use strict';
  var SAVE_KEY = 'pokeCity.save';
  var canvas = document.getElementById('game');
  var msg = document.getElementById('msg');
  var saveProp = null;
  var game = null;

  function readStored() { try { return localStorage.getItem(SAVE_KEY) || ''; } catch (e) { return ''; } }
  function writeStored(v) { try { if (v) localStorage.setItem(SAVE_KEY, v); else localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function isSave(v) { return typeof v === 'string' && v.indexOf('PC1;') === 0; }

  var params = new URLSearchParams(location.search);
  if (params.get('reset') === '1') {
    writeStored('');
    params.delete('reset');
    var q = params.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }

  // iPhone Safari draws with 4x MSAA; past 2x device pixels it gets slow for little gain
  function pixelRatio() { return Math.min(2, window.devicePixelRatio || 1); }

  game = new rive.Rive({
    src: 'game.riv',
    canvas: canvas,
    autoplay: false,   // starts paused: the save is handed over first, then it plays
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Layout, layoutScaleFactor: 1 }),
    onLoad: function () {
      var vm = game.viewModelInstance;
      saveProp = vm ? vm.string('save') : null;
      if (saveProp) {
        var stored = readStored();
        if (isSave(stored)) saveProp.value = stored;
        saveProp.on(function (v) { if (isSave(v)) writeStored(v); });
      } else {
        console.warn('Poké City: no save property; the city won’t be kept.');
      }
      game.resizeDrawingSurfaceToCanvas(pixelRatio());
      game.play();
      msg.remove();
    },
    onLoadError: function () { msg.textContent = 'Poké City didn’t load. Try reloading the page.'; }
  });

  window.addEventListener('resize', function () { if (game) game.resizeDrawingSurfaceToCanvas(pixelRatio()); });

  // a last copy when the page hides (iOS can drop a background tab without another event)
  function flush() { if (saveProp && isSave(saveProp.value)) writeStored(saveProp.value); }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
})();
