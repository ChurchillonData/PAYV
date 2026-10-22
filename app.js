(function () {
  'use strict';
  var state = { screen: 'enter', amt: '', bal: 248.5, auto: true, pressed: 'none', cardIn: false, lights: 0 };
  var timers = [];
  var idle = null;
  var reduce = false;
  try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function fmt(n) { return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function stopAll() { timers.forEach(function (t) { clearTimeout(t); }); timers = []; }
  function set(patch) { for (var k in patch) state[k] = patch[k]; render(); }
  function armIdle() {
    if (idle) clearTimeout(idle);
    if (reduce) return;
    idle = setTimeout(function () { stopAll(); runDemo(0); }, 20000);
  }

  function render() {
    var s = state.screen;
    var num = parseFloat(state.amt) || 0;
    qa('[data-screen]').forEach(function (el) {
      var k = el.getAttribute('data-screen');
      var show = k === 'whirl' ? (s === 'tap' || s === 'processing') : k === s;
      el.hidden = !show;
    });
    qa('[data-bind="amtText"]').forEach(function (e) { e.textContent = state.amt === '' ? '0.00' : state.amt; });
    qa('[data-bind="amtFixed"]').forEach(function (e) { e.textContent = fmt(num); });
    qa('[data-bind="balText"]').forEach(function (e) { e.textContent = fmt(state.bal); });
    var wl = q('#whirlLabel');
    if (wl) {
      wl.textContent = s === 'processing' ? 'Authorising…' : 'Tap card to pay';
      wl.style.color = s === 'processing' ? '#F5C542' : 'var(--accent)';
    }
    qa('[data-light]').forEach(function (e) {
      e.style.background = state.lights >= parseInt(e.getAttribute('data-light'), 10) ? '#3DDC84' : '#2E2E2E';
    });
    var leds = { enter: '#3A3A3A', tap: 'var(--accent)', processing: '#F5C542', success: '#3DDC84', balance: '#3A3A3A' };
    var led = q('#led');
    if (led) led.style.background = leds[s] || '#3A3A3A';
    var kp = q('#keypad');
    if (kp) kp.setAttribute('data-pressed', state.pressed || 'none');
    var card = q('#paycard');
    if (card) card.style.transform = state.cardIn ? 'translateY(-12px) rotate(0deg) scale(0.96)' : 'rotate(-6deg)';
    var dl = q('#demoLabel');
    if (dl) dl.textContent = state.auto ? 'Auto demo · tap any key to try it' : 'Your turn · type, confirm, tap';
    var hints = state.auto
      ? { enter: 'The merchant keys in the fare', tap: 'The customer taps their card', processing: 'The customer taps their card', success: 'Payment confirmed', balance: '' }
      : { enter: num > 0 ? 'Press the green check to confirm' : 'Type an amount on the keypad', tap: 'Now tap the PAYV card', processing: 'Authorising the payment…', success: 'Paid. Press the check to charge the same fare again', balance: 'Press X to go back' };
    var h = q('#hint');
    if (h) h.textContent = hints[s] || '';
  }

  function runDemo(i) {
    var fares = ['12.50', '6.00', '25.00'];
    var fare = fares[i % fares.length];
    set({ auto: true, screen: 'enter', amt: '', pressed: 'none', cardIn: false, lights: 0 });
    var t = 700;
    for (var k = 0; k < fare.length; k++) {
      (function (k, t) {
        var ch = fare.charAt(k);
        var key = ch === '.' ? 'dot' : 'd' + ch;
        var val = fare.slice(0, k + 1);
        later(t, function () { set({ pressed: key, amt: val }); });
        later(t + 170, function () { set({ pressed: 'none' }); });
      })(k, t);
      t += 380;
    }
    t += 400;
    later(t, function () { set({ pressed: 'ok', screen: 'tap', lights: 1 }); });
    later(t + 200, function () { set({ pressed: 'none' }); });
    later(t + 700, function () { set({ cardIn: true }); });
    later(t + 900, function () { set({ screen: 'processing', lights: 2 }); });
    later(t + 1250, function () { set({ lights: 3 }); });
    later(t + 1600, function () { set({ lights: 4 }); });
    later(t + 2000, function () {
      set({ screen: 'success', cardIn: false, lights: 0, bal: Math.round((state.bal + parseFloat(fare)) * 100) / 100 });
    });
    later(t + 4800, function () { runDemo(i + 1); });
  }

  function act(kind, d) {
    var wasAuto = state.auto;
    if (wasAuto) stopAll();
    var c = wasAuto ? { screen: 'enter', amt: '' } : { screen: state.screen, amt: state.amt };
    var num = parseFloat(c.amt) || 0;
    var patch = null;
    if (kind === 'digit') {
      if (c.screen === 'enter' || c.screen === 'success') {
        var cur = c.screen === 'enter' ? c.amt : '';
        var ok = true;
        if (d === '.') {
          if (cur.indexOf('.') >= 0) ok = false;
          else cur = (cur === '' ? '0' : cur) + '.';
        } else {
          var dot = cur.indexOf('.');
          if (dot >= 0 && cur.length - dot > 2) ok = false;
          else if (cur.replace('.', '').length >= 6) ok = false;
          else cur = cur === '0' ? d : cur + d;
        }
        if (ok) patch = { screen: 'enter', amt: cur };
      }
    } else if (kind === 'clr') {
      if (c.screen === 'enter' || c.screen === 'success') patch = { screen: 'enter', amt: '' };
    } else if (kind === 'x') {
      if (c.screen === 'tap' || c.screen === 'balance') patch = { screen: 'enter', lights: 0 };
      else if (c.screen !== 'processing') patch = { screen: 'enter', amt: '' };
    } else if (kind === 'ok') {
      if ((c.screen === 'enter' || c.screen === 'success') && num > 0) patch = { screen: 'tap', lights: 1 };
      else if (c.screen === 'balance') patch = { screen: 'enter' };
    } else if (kind === 'bal') {
      if (c.screen !== 'processing' && c.screen !== 'tap') patch = { screen: c.screen === 'balance' ? 'enter' : 'balance' };
    } else if (kind === 'card') {
      if (c.screen === 'tap') {
        patch = { screen: 'processing', cardIn: true, lights: 2 };
        later(400, function () { set({ lights: 3 }); });
        later(800, function () { set({ lights: 4 }); });
        later(2000, function () {
          set({ screen: 'success', cardIn: false, lights: 0, bal: Math.round((state.bal + num) * 100) / 100 });
        });
      }
    }
    var base = wasAuto ? { auto: false, screen: 'enter', amt: '', pressed: 'none', cardIn: false, lights: 0 } : {};
    if (patch) for (var key in patch) base[key] = patch[key];
    if (patch || wasAuto) set(base);
    armIdle();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'card') act('card');
    else if (/^d\d$/.test(a)) act('digit', a.slice(1));
    else if (a === 'dot') act('digit', '.');
    else act(a);
  });

  if (reduce) { state.auto = false; render(); }
  else { render(); later(900, function () { runDemo(0); }); }
})();
