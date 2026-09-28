/* ============================================================
   marathi-widget.js
   Remote-hosted Marathi phonetic typing widget.
   Host this file on your own server (HTTPS) and any page can
   turn on Marathi phonetic typing with a single line:

     <script src="https://yourdomain.com/marathi-widget.js?mode=all"></script>

   ---------------------------------------------------------------
   QUERY PARAMETERS (put them on the script tag's own src URL)
   ---------------------------------------------------------------
   mode  : all | selective | exclusive | custom     (default: all)
             all        -> every <textarea> and text <input> on the
                            page becomes phonetic
             selective  -> ONLY elements whose CSS class is listed
                            in "c" become phonetic
             exclusive  -> every textarea/text input EXCEPT those
                            whose CSS class is listed in "c"
             custom     -> same behaviour as selective; kept as a
                            separate name for people used to that
                            wording from other widgets
   c     : comma-separated CSS class names, used by selective /
             exclusive / custom, e.g.  c=marathi-input,notes-box
   badge : 0 to hide the small floating ON/OFF badge
             (default: shown when at least one field is attached)

   Examples:
     <script src="https://yourdomain.com/marathi-widget.js"></script>
     <script src="https://yourdomain.com/marathi-widget.js?mode=selective&c=marathi-input"></script>
     <script src="https://yourdomain.com/marathi-widget.js?mode=exclusive&c=no-marathi"></script>
     <script src="https://yourdomain.com/marathi-widget.js?badge=0"></script>

   ---------------------------------------------------------------
   MANUAL / ADVANCED USE (e.g. fields added later by your own JS,
   single-page apps, React/Vue forms, etc.)
   ---------------------------------------------------------------
     window.MarathiWidget.attach(someTextareaOrInputElement)
     window.MarathiWidget.transliterate("namaskaar")   // -> "नमस्कार"
     window.MarathiWidget.toggleAll()                  // returns new on/off state

   Engine ported unchanged from marathi-lekhan-v1.05.html so typing
   behaviour (keys, halant "~", nukta "q", eyelash-र "R~", etc.) is
   identical to the offline tool.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 1. Transliteration engine (unchanged) ---------------- */
  var vowels = {
    'aa': ['आ', 'ा'],
    'ee': ['ई', 'ी'], 'ii': ['ई', 'ी'], 'I': ['ई', 'ी'],
    'oo': ['ऊ', 'ू'], 'uu': ['ऊ', 'ू'], 'U': ['ऊ', 'ू'],
    'ai': ['ऐ', 'ै'], 'ei': ['ऐ', 'ै'],
    'au': ['औ', 'ौ'], 'ou': ['औ', 'ौ'],
    'a^': ['अं', 'ं'],
    'aH': ['अः', 'ः'],
    'a': ['अ', ''],
    'i': ['इ', 'ि'],
    'u': ['उ', 'ु'],
    'e': ['ए', 'े'],
    'A': ['अ\u200Dॅ', 'ॅ'],
    'o': ['ओ', 'ो'],
    'O': ['ऑ', 'ॉ']
  };

  var consonants = {
    'kSh': 'क्ष', 'jNj': 'ज्ञ', 'chh': 'छ', 'Ng': 'ङ', 'Nj': 'ञ',
    'Th': 'ठ', 'Dh': 'ढ', 'th': 'थ', 'dh': 'ध', 'ph': 'फ', 'bh': 'भ',
    'sh': 'श', 'kh': 'ख', 'gh': 'घ', 'jh': 'झ', 'ch': 'च',
    'Gy': 'ज्ञ', 'Tr': 'त्र', 'dny': 'ज्ञ',
    'k': 'क', 'g': 'ग', 'j': 'ज',
    'T': 'ट', 'D': 'ड', 'N': 'ण',
    't': 'त', 'd': 'द', 'n': 'न',
    'p': 'प', 'f': 'फ', 'b': 'ब', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
    'Sh': 'ष', 's': 'स', 'h': 'ह',
    'X': 'क्ष', 'L': 'ळ', 'c': 'च', 'z': 'झ', 'Z': 'झ'
  };

  var extras = { 'M': 'ं', 'H': 'ः', 'OM': 'ॐ' };
  var digits = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };

  var dict = {};
  Object.keys(vowels).forEach(function (k) { dict[k] = { type: 'vowel', val: vowels[k] }; });
  Object.keys(consonants).forEach(function (k) { dict[k] = { type: 'cons', val: consonants[k] }; });
  Object.keys(extras).forEach(function (k) { dict[k] = { type: 'extra', val: extras[k] }; });

  var maxLen = 0;
  Object.keys(dict).forEach(function (k) { if (k.length > maxLen) maxLen = k.length; });

  function matchAt(input, i) {
    var n = input.length;
    for (var len = maxLen; len >= 1; len--) {
      if (i + len > n) continue;
      var sub = input.substr(i, len);
      if (dict.hasOwnProperty(sub)) return { token: sub, entry: dict[sub], len: len };
    }
    return null;
  }

  function transliterate(input) {
    var out = '', i = 0, lastWasConsonant = false, n = input.length;
    while (i < n) {
      var ch = input[i];

      if (ch === '~' && lastWasConsonant) { out += '्'; lastWasConsonant = false; i += 1; continue; }
      if (ch === '~' && !lastWasConsonant) { i += 1; continue; }

      if (ch === 'q' && lastWasConsonant) { out += '\u093C'; i += 1; continue; }
      if (ch === 'q' && !lastWasConsonant) { i += 1; continue; }

      if (digits[ch] !== undefined) { out += digits[ch]; lastWasConsonant = false; i += 1; continue; }

      if (ch === 'R') {
        if (input[i + 1] === '~') {
          out += lastWasConsonant ? '्ऱ्' : 'ऱ्';
          lastWasConsonant = false; i += 2; continue;
        }
        out += lastWasConsonant ? 'ृ' : 'ऋ';
        lastWasConsonant = false; i += 1; continue;
      }

      var m = matchAt(input, i);
      if (m) {
        var matched = m.entry;
        if (matched.type === 'vowel') {
          out += lastWasConsonant ? matched.val[1] : matched.val[0];
          lastWasConsonant = false;
        } else if (matched.type === 'cons') {
          out += lastWasConsonant ? ('्' + matched.val) : matched.val;
          lastWasConsonant = true;
        } else if (matched.type === 'extra') {
          out += matched.val;
          lastWasConsonant = false;
        }
        i += m.len;
      } else {
        out += ch; lastWasConsonant = false; i += 1;
      }
    }
    return out;
  }

  /* ---------------- 2. Live in-place typing (unchanged) ---------------- */
  var WORD_CHAR = /^[A-Za-z0-9~'^]$/;

  var MODIFIER_KEYS = {
    'Shift': 1, 'Control': 1, 'Alt': 1, 'Meta': 1, 'CapsLock': 1, 'AltGraph': 1,
    'ContextMenu': 1, 'OS': 1, 'Fn': 1, 'FnLock': 1, 'Hyper': 1, 'Super': 1,
    'Symbol': 1, 'SymbolLock': 1, 'NumLock': 1, 'ScrollLock': 1
  };

  function attachIME(el, opts) {
    opts = opts || {};
    var enabled = opts.startEnabled !== false;
    var buffer = '';
    var insertStart = null;
    var lastLen = 0;

    function resetBuffer() { buffer = ''; insertStart = null; lastLen = 0; }

    function render() {
      var dev = transliterate(buffer);
      var val = el.value;
      var before = val.slice(0, insertStart);
      var after = val.slice(insertStart + lastLen);
      el.value = before + dev + after;
      var pos = insertStart + dev.length;
      el.setSelectionRange(pos, pos);
      lastLen = dev.length;
    }

    function onKeyDown(e) {
      if (!enabled) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (MODIFIER_KEYS[e.key]) return;

      if (e.key === 'Backspace') {
        if (buffer.length > 0 && el.selectionStart === insertStart + lastLen && el.selectionEnd === insertStart + lastLen) {
          e.preventDefault();
          buffer = buffer.slice(0, -1);
          if (buffer.length === 0) {
            var val = el.value;
            el.value = val.slice(0, insertStart) + val.slice(insertStart + lastLen);
            el.setSelectionRange(insertStart, insertStart);
            resetBuffer();
          } else {
            render();
          }
        }
        return;
      }

      if (e.key.length === 1 && WORD_CHAR.test(e.key)) {
        var pos = el.selectionStart;
        if (insertStart === null || pos !== insertStart + lastLen) {
          resetBuffer();
          insertStart = pos;
        }
        e.preventDefault();
        buffer += e.key;
        render();
        return;
      }

      resetBuffer();
    }

    function onBlurOrClick() { resetBuffer(); }

    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('blur', onBlurOrClick);
    el.addEventListener('click', onBlurOrClick);

    return {
      enable: function () { enabled = true; },
      disable: function () { enabled = false; resetBuffer(); },
      toggle: function () { enabled = !enabled; if (!enabled) resetBuffer(); return enabled; },
      isEnabled: function () { return enabled; }
    };
  }

  /* ---------------- 3. Read config from THIS script tag's own src ---------------- */
  function getConfig() {
    var src = (document.currentScript && document.currentScript.src) || '';
    var qs = src.split('?')[1] || '';
    var q = {};
    qs.split('&').forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split('=');
      q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return {
      mode: q.mode || 'all',
      classes: (q.c || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      showBadge: q.badge !== '0'
    };
  }

  /* ---------------- 4. Decide which fields on the page get attached ---------------- */
  function isTextField(el) {
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      var t = (el.getAttribute('type') || 'text').toLowerCase();
      return t === 'text' || t === 'search';
    }
    return false;
  }

  function matchesAnyClass(el, classes) {
    for (var i = 0; i < classes.length; i++) {
      if (el.classList.contains(classes[i])) return true;
    }
    return false;
  }

  function selectTargets(cfg) {
    var all = Array.prototype.slice.call(document.querySelectorAll('textarea, input')).filter(isTextField);
    if (cfg.mode === 'selective' || cfg.mode === 'custom') {
      return all.filter(function (el) { return matchesAnyClass(el, cfg.classes); });
    }
    if (cfg.mode === 'exclusive') {
      return all.filter(function (el) { return !matchesAnyClass(el, cfg.classes); });
    }
    return all; /* 'all' */
  }

  /* ---------------- 5. Small floating ON/OFF badge (bottom-right) ---------------- */
  function createBadge() {
    var el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', 'Marathi typing on/off');
    el.style.cssText = [
      'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
      'font-family:ui-sans-serif,system-ui,sans-serif', 'font-size:13px', 'font-weight:600',
      'padding:8px 14px', 'border-radius:20px', 'border:1.5px solid #1e7e34',
      'box-shadow:0 2px 8px rgba(0,0,0,0.18)', 'cursor:pointer'
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  function paintBadge(el, on) {
    el.textContent = 'मराठी: ' + (on ? 'ON' : 'OFF') + '  (Ctrl+Space)';
    el.style.background = on ? '#28a745' : '#e0e0e0';
    el.style.borderColor = on ? '#1e7e34' : '#888888';
    el.style.color = on ? '#ffffff' : '#333333';
  }

  /* ---------------- 6. Init ---------------- */
  function init() {
    var cfg = getConfig();
    var targets = selectTargets(cfg);
    var apis = targets.map(function (el) { return attachIME(el, { startEnabled: true }); });

    function toggleAll() {
      var anyOn = apis.some(function (a) { return a.isEnabled(); });
      var newState = !anyOn;
      apis.forEach(function (a) { newState ? a.enable() : a.disable(); });
      return newState;
    }

    var badge = null;
    if (cfg.showBadge && apis.length) {
      badge = createBadge();
      paintBadge(badge, true);
      badge.addEventListener('click', function () { paintBadge(badge, toggleAll()); });
    }

    document.addEventListener('keydown', function (e) {
      var isSpace = (e.code === 'Space') || (e.key === ' ') || (e.keyCode === 32);
      if (e.ctrlKey && isSpace) {
        e.preventDefault();
        var on = toggleAll();
        if (badge) paintBadge(badge, on);
      }
    }, true);

    /* Public API for manual/advanced use (SPA pages, dynamically added fields) */
    window.MarathiWidget = {
      attach: function (el) {
        var api = attachIME(el, { startEnabled: true });
        apis.push(api);
        return api;
      },
      transliterate: transliterate,
      toggleAll: toggleAll,
      targets: targets
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
