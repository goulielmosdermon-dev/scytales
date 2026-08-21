/* ============================================================
   SCYTÁLES — PHONE (Digital ID Wallet)
   Drives every [data-phone="digital-id-wallet"] instance.
   ============================================================ */
(function () {
  'use strict';

  var DETAILS = [
    { t: 'Driver License', rows: [['Holder', 'Greta Svensson'], ['Number', 'SE-4821 993'], ['Class', 'B'], ['Valid to', '2029-11-04'], ['Issued by', 'Transportstyrelsen']] },
    { t: 'Vehicle Registration', rows: [['Plate', 'ABC 123'], ['Model', 'Volvo XC60'], ['Year', '2022'], ['Owner', 'Greta Svensson'], ['Issued by', 'Transportstyrelsen']] },
    { t: 'Safety Inspection', rows: [['Status', 'Passed'], ['Plate', 'ABC 123'], ['Checked', '2025-03-12'], ['Next check', '2027-03-12'], ['Station', 'Bilprovningen']] },
    { t: 'Vehicle Title', rows: [['Vehicle', 'Volvo XC60'], ['Owner', 'Greta Svensson'], ['Liens', 'None'], ['Registered', '2022-06-01'], ['Issued by', 'Transportstyrelsen']] }
  ];

  var ACTS = [
    { i: 'i-qr', bg: '#FDEEE4', c: '#EA6720', t: 'Shared Driver License', d: 'ICA Supermarket · age check', time: '2m' },
    { i: 'i-login', bg: '#E8EEF5', c: '#103154', t: 'Logged in with ID', d: 'Skatteverket portal', time: '1h' },
    { i: 'i-nfc', bg: '#FDEEE4', c: '#EA6720', t: 'NFC verification', d: 'Police roadside check', time: 'Yesterday' },
    { i: 'i-plus', bg: '#E8EEF5', c: '#103154', t: 'Added Vehicle Title', d: 'Transportstyrelsen', time: '20 Dec' },
    { i: 'i-shield', bg: '#FDEEE4', c: '#EA6720', t: 'Wallet verified', d: 'Identity confirmed', time: '18 Dec' }
  ];

  function setUp(root) {
    if (root.dataset.phoneReady) return;
    var phone = root.querySelector('.phone');
    if (!phone) return;
    root.dataset.phoneReady = '1';

    var activityList = phone.querySelector('[data-phone-activity]');
    if (activityList && !activityList.children.length) {
      ACTS.forEach(function (a) {
        var el = document.createElement('div');
        el.className = 'phone__act';
        el.innerHTML =
          '<div class="phone__act-ico" style="background:' + a.bg + ';color:' + a.c + '">' +
            '<svg class="phone__ic"><use href="#' + a.i + '"></use></svg></div>' +
          '<div><div class="phone__act-title">' + a.t + '</div>' +
          '<div class="phone__act-desc">' + a.d + '</div></div>' +
          '<div class="phone__act-time">' + a.time + '</div>';
        activityList.appendChild(el);
      });
    }

    var cards = phone.querySelector('[data-phone-cards]');
    var dots = phone.querySelector('[data-phone-dots]');
    if (cards && dots) {
      cards.addEventListener('scroll', function () {
        var idx = Math.round(cards.scrollLeft / 250);
        Array.prototype.forEach.call(dots.children, function (s, i) {
          s.className = i === idx ? 'is-on' : '';
        });
      });
    }

    var toastEl = phone.querySelector('[data-phone-toast]');
    var toastTimer;
    function toast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add('is-show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toastEl.classList.remove('is-show');
      }, 1800);
    }

    var timerInt;
    var secs = 60;
    var timerEl = phone.querySelector('[data-phone-timer]');
    var timerNum = phone.querySelector('[data-phone-timer-num]');

    function renderTimer() {
      if (!timerEl || !timerNum) return;
      timerNum.textContent = secs;
      var deg = (secs / 60) * 360;
      timerEl.style.background = 'conic-gradient(#EA6720 ' + deg + 'deg, #EEF0F3 ' + deg + 'deg)';
    }

    function startTimer() {
      clearInterval(timerInt);
      secs = 60;
      renderTimer();
      timerInt = setInterval(function () {
        secs--;
        if (secs < 0) secs = 60;
        renderTimer();
      }, 1000);
    }

    function go(name, el) {
      phone.querySelectorAll('.phone__screen').forEach(function (s) {
        s.classList.remove('is-active');
      });
      var screen = phone.querySelector('[data-phone-screen="' + name + '"]');
      if (screen) screen.classList.add('is-active');
      phone.querySelectorAll('.phone__nav-item').forEach(function (i) {
        i.classList.remove('is-active');
      });
      if (el) el.classList.add('is-active');
      if (name === 'share') startTimer();
      else clearInterval(timerInt);
    }

    var sheet = phone.querySelector('[data-phone-sheet]');
    var sheetTitle = phone.querySelector('[data-phone-sheet-title]');
    var sheetRows = phone.querySelector('[data-phone-sheet-rows]');

    function openSheet(i) {
      var d = DETAILS[i];
      if (!d || !sheet) return;
      sheetTitle.textContent = d.t;
      sheetRows.innerHTML = d.rows.map(function (r) {
        return '<div class="phone__sheet-row"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>';
      }).join('');
      sheet.classList.add('is-show');
    }

    function closeSheet() {
      if (sheet) sheet.classList.remove('is-show');
    }

    phone.addEventListener('click', function (event) {
      var t = event.target.closest('[data-phone-action]');
      if (!t || !phone.contains(t)) return;
      var action = t.getAttribute('data-phone-action');
      if (action === 'toast') toast(t.getAttribute('data-phone-msg') || '');
      else if (action === 'go') go(t.getAttribute('data-phone-go'), t);
      else if (action === 'sheet') openSheet(Number(t.getAttribute('data-phone-sheet-i')));
      else if (action === 'close-sheet') closeSheet();
      else if (action === 'share-doc') {
        closeSheet();
        var shareNav = phone.querySelector('[data-phone-go="share"]');
        go('share', shareNav);
      }
    });

    if (sheet) {
      sheet.addEventListener('click', function (event) {
        if (event.target === sheet) closeSheet();
      });
    }
  }

  function init(scope) {
    var root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll('[data-phone="digital-id-wallet"]').forEach(setUp);
  }

  window.ScytalesPhone = { init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }
})();
