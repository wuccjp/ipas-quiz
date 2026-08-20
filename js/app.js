(function () {
  'use strict';

  var LS_KEY = 'ipas_bank.v1';
  var BANK = null;
  var state = {
    filter: { level: null, subject: null, rounds: [] },
    mode: 'order',
    queue: [],
    cursor: 0,
    answers: {},
    optOrder: {},
    rangeCache: []
  };

  var els = {
    levelSel: document.getElementById('levelSel'),
    subjectSel: document.getElementById('subjectSel'),
    roundsBox: document.getElementById('roundsBox'),
    rangeInfo: document.getElementById('rangeInfo'),
    startBtn: document.getElementById('startBtn'),
    clearBtn: document.getElementById('clearBtn'),
    setup: document.getElementById('setup'),
    quiz: document.getElementById('quiz'),
    result: document.getElementById('result'),
    counter: document.getElementById('counter'),
    score: document.getElementById('score'),
    progressFill: document.getElementById('progressFill'),
    cardWrap: document.getElementById('cardWrap'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    resultBtn: document.getElementById('resultBtn'),
    resultSummary: document.getElementById('resultSummary'),
    wrongList: document.getElementById('wrongList'),
    againBtn: document.getElementById('againBtn'),
    wrongBtn: document.getElementById('wrongBtn'),
    backBtn: document.getElementById('backBtn'),
    homeBtn: document.getElementById('homeBtn')
  };

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveProgress(p) { localStorage.setItem(LS_KEY, JSON.stringify(p)); }

  function qById(id) {
    for (var i = 0; i < BANK.questions.length; i++) {
      if (BANK.questions[i].id === id) return BANK.questions[i];
    }
    return null;
  }

  function fmtRound(r) {
    if (r && r.name) return r.name;
    if (r && r.round_name) return r.round_name;
    if (r && r.round != null) return String(r.round);
    return String(r || '');
  }
  function roundKey(q) {
    var r = q.round && q.round.round != null ? q.round.round : q.round;
    return r;
  }

  function correctOption(q) {
    for (var i = 0; i < q.options.length; i++) {
      if (q.options[i].key === q.answer.key) return q.options[i];
    }
    return null;
  }

  function answerText(q) {
    var o = correctOption(q);
    if (!o) return '（正解 ' + q.answer.key + '）';
    if (o.text) return truncate(o.text, 24);
    return '（正解為圖片選項）';
  }

  function uniq(arr) {
    var out = [], seen = {};
    for (var i = 0; i < arr.length; i++) {
      if (!seen[arr[i]]) { seen[arr[i]] = 1; out.push(arr[i]); }
    }
    return out;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- 設定畫面 ---------- */
  function renderSetup() {
    var levels = uniq(BANK.questions.map(function (q) { return q.level; }));
    levels.sort(function (a, b) { return a === b ? 0 : (a.indexOf('初') >= 0 ? -1 : 1); });

    els.levelSel.innerHTML = levels.map(function (l) {
      return '<option value="' + l + '">' + l + '</option>';
    }).join('');
    state.filter.level = levels[0] || null;

    renderSubjects();
  }

  function subjectName(level, subject) {
    for (var i = 0; i < BANK.questions.length; i++) {
      var q = BANK.questions[i];
      if (q.level === level && q.subject === subject && q.subject_name) return q.subject_name;
    }
    return '';
  }

  function subjectsFor(level) {
    return uniq(BANK.questions.map(function (q) {
      return q.level === level ? q.subject : null;
    }).filter(function (s) { return s != null; })).sort(function (a, b) { return a - b; });
  }

  function roundsFor(level, subject) {
    return uniq(BANK.questions.map(function (q) {
      return (q.level === level && q.subject === subject) ? roundKey(q) : null;
    }).filter(function (r) { return r != null; }));
  }

  function renderSubjects() {
    var subs = subjectsFor(state.filter.level);
    if (!subs.length) return;
    els.subjectSel.innerHTML = subs.map(function (s) {
      var nm = subjectName(state.filter.level, s);
      return '<option value="' + s + '">科目 ' + s + (nm ? ' — ' + esc(nm) : '') + '</option>';
    }).join('');
    state.filter.subject = subs[0];
    renderRounds();
  }

  function renderRounds() {
    var rounds = roundsFor(state.filter.level, state.filter.subject);
    state.filter.rounds = rounds.slice();

    els.roundsBox.innerHTML = rounds.map(function (r) {
      var q0 = BANK.questions.filter(function (q) {
        return q.level === state.filter.level && q.subject === state.filter.subject && roundKey(q) === r;
      })[0];
      return '<span class="round-chip on" data-r="' + esc(r) + '">' + esc(fmtRound(q0)) + '</span>';
    }).join('');

    els.roundsBox.querySelectorAll('.round-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var r = chip.getAttribute('data-r');
        var i = state.filter.rounds.indexOf(r);
        if (i >= 0) {
          state.filter.rounds.splice(i, 1);
          chip.classList.remove('on');
        } else {
          state.filter.rounds.push(r);
          chip.classList.add('on');
        }
        updateRangeInfo();
      });
    });

    updateRangeInfo();
  }

  function rangeQuestions() {
    return BANK.questions.filter(function (q) {
      return q.level === state.filter.level &&
             q.subject === state.filter.subject &&
             state.filter.rounds.indexOf(roundKey(q)) >= 0;
    });
  }

  function updateRangeInfo() {
    var qs = rangeQuestions();
    var p = loadProgress();
    var attempts = 0, ok = 0;
    qs.forEach(function (q) {
      var rec = p[q.id];
      if (rec) { attempts += rec.ok + rec.wrong; ok += rec.ok; }
    });
    var rate = attempts ? Math.round(ok / attempts * 100) + '%' : '--';
    els.rangeInfo.textContent = '範圍內 ' + qs.length + ' 題，歷次正確率 ' + rate + '（答 ' + attempts + ' 次）';
  }

  /* ---------- 出題 ---------- */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function optOrderFor(q) {
    var order = state.optOrder[q.id];
    if (!order) {
      order = [];
      for (var i = 0; i < q.options.length; i++) order.push(i);
      state.optOrder[q.id] = shuffle(order);
    }
    return state.optOrder[q.id];
  }

  function cmpRound(a, b) {
    return (a && a.round != null ? String(a.round) : String(a || '')) <
           (b && b.round != null ? String(b.round) : String(b || '')) ? -1 : 1;
  }

  function buildQueue() {
    var base = rangeQuestions();
    var qs;
    if (state.mode === 'wrong') {
      var p = loadProgress();
      qs = base.filter(function (q) {
        var rec = p[q.id];
        return rec && rec.wrong > 0;
      });
      qs.sort(function (a, b) {
        return roundKey(a) === roundKey(b) ? a.num - b.num : cmpRound(a, b);
      });
    } else if (state.mode === 'random') {
      qs = shuffle(base);
    } else {
      qs = base.slice().sort(function (a, b) {
        return roundKey(a) === roundKey(b) ? a.num - b.num : cmpRound(a, b);
      });
    }
    return qs;
  }

  function startQuiz() {
    var qs = buildQueue();
    if (state.mode === 'wrong' && !qs.length) {
      alert('目前範圍內沒有錯題，先去一般模式練習吧！');
      return;
    }
    state.queue = qs;
    state.cursor = 0;
    state.answers = {};
    state.optOrder = {};
    state.rangeCache = qs;
    els.setup.classList.add('hidden');
    els.result.classList.add('hidden');
    els.quiz.classList.remove('hidden');
    renderCard();
  }

  /* ---------- 答題畫面 ---------- */
  function renderCard() {
    var q = state.queue[state.cursor];
    var n = state.queue.length;
    var answered = answeredCount();
    var correct = correctCount();

    els.counter.textContent = '第 ' + (state.cursor + 1) + ' / ' + n + ' 題';
    els.score.textContent = '答對 ' + correct + ' / ' + answered;
    els.progressFill.style.width = Math.round(answered / n * 100) + '%';

    els.prevBtn.disabled = state.cursor === 0;
    els.nextBtn.disabled = false;
    var allDone = answered === n;
    els.resultBtn.classList.toggle('hidden', !allDone);

    var subjNm = subjectName(q.level, q.subject);
    var meta = esc(q.level + ' · 科目 ' + q.subject + (subjNm ? ' ' + subjNm : '') + ' · ' + fmtRound(q) + ' · 第 ' + q.num + ' 題');
    var imgs = (q.images || []).map(function (src) {
      return '<img src="' + esc(src) + '" alt="題目圖" loading="lazy">';
    }).join('');

    var opts = optOrderFor(q).map(function (oi) {
      var o = q.options[oi];
      var oImgs = (o.images || []).map(function (src) {
        return '<img src="' + esc(src) + '" alt="選項圖" loading="lazy">';
      }).join('');
      var text = o.text ? '<span class="opt-text">' + esc(o.text) + '</span>' : '';
      var cls = 'option';
      var chosen = state.answers[q.id] === o.key;
      if (state.answers[q.id]) {
        var isCorrect = o.key === q.answer.key;
        if (isCorrect) cls += ' correct';
        else if (chosen) cls += ' wrong';
      }
      var checked = chosen ? ' checked="checked"' : '';
      return '<button type="button" class="' + cls + '" data-letter="' + esc(o.key) + '"' + checked + '>' +
        text + '<span class="opt-imgs">' + oImgs + '</span>' +
        '</button>';
    }).join('');

    var expl = '';
    if (state.answers[q.id]) {
      expl = '<div class="expl"><b>正解：' + esc(answerText(q)) + '</b>' +
        (q.explanation ? '<div>' + q.explanation + '</div>' : '') + '</div>';
    }

    els.cardWrap.innerHTML =
      '<div class="card">' +
      '<div class="q-meta">' + meta + '</div>' +
      '<div class="q-text">' + esc(q.text) + '</div>' +
      (imgs ? '<div class="q-imgs">' + imgs + '</div>' : '') +
      opts +
      expl +
      '</div>';

    els.cardWrap.querySelectorAll('.option').forEach(function (btn) {
      if (state.answers[q.id]) btn.disabled = true;
      btn.addEventListener('click', function () {
        onAnswer(btn.getAttribute('data-letter'));
      });
    });
  }

  function onAnswer(letter) {
    var q = state.queue[state.cursor];
    if (state.answers[q.id]) return;
    state.answers[q.id] = letter;
    renderCard();
  }

  function answeredCount() {
    var c = 0;
    for (var i = 0; i < state.queue.length; i++) if (state.answers[state.queue[i].id]) c++;
    return c;
  }

  function correctCount() {
    var c = 0;
    for (var i = 0; i < state.queue.length; i++) {
      var q = qById(state.queue[i].id);
      if (state.answers[q.id] === q.answer.key) c++;
    }
    return c;
  }

  /* ---------- 結果 ---------- */
  function showResult() {
    var n = state.queue.length;
    var correct = correctCount();
    var unanswered = 0;
    for (var i = 0; i < n; i++) if (!state.answers[state.queue[i].id]) unanswered++;

    var p = loadProgress();
    for (var j = 0; j < n; j++) {
      var q = qById(state.queue[j].id);
      var rec = p[q.id] || { ok: 0, wrong: 0 };
      var pick = state.answers[q.id];
      if (!pick) rec.wrong++;
      else if (pick === q.answer.key) {
        rec.ok++;
        if (state.mode === 'wrong') rec.wrong = 0;
      }
      else rec.wrong++;
      p[q.id] = rec;
    }
    saveProgress(p);

    var pct = n ? Math.round(correct / n * 100) : 0;
    var wrongQs = state.queue.filter(function (qb) {
      return state.answers[qb.id] !== qById(qb.id).answer.key;
    });
    var wrongInfo = wrongQs.length
      ? '<div id="wrongList"><h3>錯題清單（' + wrongQs.length + ' 題）</h3><ol>' +
        wrongQs.map(function (qb) {
          var q = qById(qb.id);
          return '<li>『' + esc(q.level + ' 科目' + q.subject + ' 第' + q.num + '題') + '』· ' + esc(truncate(q.text, 40)) + '（正解：' + esc(answerText(q)) + '）</li>';
        }).join('') + '</ol></div>'
      : '<p style="color:var(--good);font-weight:700">全部答對，太棒了！</p>';

    els.resultSummary.innerHTML =
      '<div>共 ' + n + ' 題，答對 <span class="big">' + correct + '</span> / ' + n +
      '（正確率 ' + pct + '%）' + (unanswered ? '，未作答 ' + unanswered + ' 題計入錯題' : '') + '</div>' +
      (wrongQs.length ? '<div style="margin-top:6px">推薦接著練『只練錯題』鞏固記憶。</div>' : '');

    els.wrongList.innerHTML = wrongInfo;

    els.quiz.classList.add('hidden');
    els.result.classList.remove('hidden');
  }

  function truncate(s, len) {
    if (!s) return '';
    s = s.replace(/\s+/g, ' ').trim();
    return s.length > len ? s.slice(0, len) + '…' : s;
  }

  /* ---------- 事件 ---------- */
  els.levelSel.addEventListener('change', function () {
    state.filter.level = els.levelSel.value;
    renderSubjects();
  });

  els.subjectSel.addEventListener('change', function () {
    state.filter.subject = +els.subjectSel.value;
    renderRounds();
  });

  document.querySelectorAll('input[name="mode"]').forEach(function (r) {
    r.addEventListener('change', function () { state.mode = r.value; });
  });

  els.startBtn.addEventListener('click', startQuiz);
  els.prevBtn.addEventListener('click', function () {
    if (state.cursor > 0) { state.cursor--; renderCard(); }
  });
  els.nextBtn.addEventListener('click', function () {
    if (state.cursor < state.queue.length - 1) { state.cursor++; renderCard(); }
  });
  els.resultBtn.addEventListener('click', showResult);
  els.againBtn.addEventListener('click', startQuiz);
  els.wrongBtn.addEventListener('click', function () {
    state.mode = 'wrong';
    document.querySelector('input[name="mode"][value="wrong"]').checked = true;
    startQuiz();
  });
  els.backBtn.addEventListener('click', exitToSetup);

  function exitToSetup() {
    els.result.classList.add('hidden');
    els.quiz.classList.add('hidden');
    els.setup.classList.remove('hidden');
    updateRangeInfo();
  }

  els.homeBtn.addEventListener('click', exitToSetup);

  els.clearBtn.addEventListener('click', function () {
    var ok = confirm('確定清除本機全部練習進度（含錯題本）？此動作無法復原。');
    if (ok) {
      localStorage.removeItem(LS_KEY);
      updateRangeInfo();
      alert('已清除。');
    }
  });

  function boot(data) {
    BANK = data;
    renderSetup();
  }

  if (window.IPAS_BANK) {
    boot(window.IPAS_BANK);
  } else {
    fetch('questions.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(boot)
      .catch(function (err) {
        els.setup.innerHTML = '<p style="color:var(--bad)">資料載入失敗：' + err.message +
          '<br>找不到 js/bank.js 也無法 fetch questions.json。請確認以下任一：' +
          '① 檔案與 index.html 同層放置，並透過本地伺服器（python -m http.server）開啟；' +
          '② 部署至 GitHub Pages；' +
          '③ 直接雙擊開啟時需 js/bank.js 與本頁同目錄（本頁已支援）。</p>';
      });
  }
})();