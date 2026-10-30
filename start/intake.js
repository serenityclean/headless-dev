(function () {
  const INTAKE_ENDPOINT = "";
  var DRAFT_KEY = "hd-intake-draft-v1";
  var TOTAL = 7;

  var form = document.getElementById('intake-form');
  var app = document.getElementById('intake-app');
  var done = document.getElementById('intake-done');
  var steps = form.querySelectorAll('.istep');
  var back = document.getElementById('btn-back');
  var next = document.getElementById('btn-next');
  var submit = document.getElementById('btn-submit');
  var label = document.getElementById('progress-label');
  var fill = document.getElementById('progress-fill');
  var bar = document.querySelector('.progress-bar');
  var stepError = document.getElementById('step-error');
  var submitError = document.getElementById('submit-error');
  var review = document.getElementById('review');
  var current = 1;

  var TITLES = ['About you', 'What you want built', 'Where you are today', 'Must-haves and nice-to-haves', 'Timeline and budget', 'Anything else', 'Review and submit'];
  var LABELS = {
    name: 'Name', email: 'Email', company: 'Company', role: 'Role', website: 'Website', company_size: 'Company size',
    decision_maker: 'Decision maker for this budget', project_types: 'Project type', description: 'Description',
    success_90_days: 'Success in 90 days', current_tools: 'Current tools', integrations: 'Integrations',
    integrations_other: 'Other integrations', data_migration: 'Data to migrate', data_details: 'Data details',
    users_who: 'Who will use it', users_count: 'Number of users', must_haves: 'Must-haves', nice_to_haves: 'Nice-to-haves',
    reference_url: 'Reference link', target_launch: 'Target launch', hard_deadline: 'Hard deadline', budget: 'Budget range',
    structure: 'Structure', payment_style: 'Payment preference', annual_revenue: 'Annual revenue',
    gross_margin: 'Gross margin', revenue_growth: 'Revenue growth, last 12 months', ownership: 'Ownership',
    financials_access: 'Read-only access to financials', ten_x: 'What 10x looks like', anything_else: 'Anything else', heard_about_us: 'How you heard about us'
  };
  var ORDER = [
    [1, ['name', 'email', 'company', 'role', 'website', 'company_size', 'decision_maker']],
    [2, ['project_types', 'description', 'success_90_days']],
    [3, ['current_tools', 'integrations', 'integrations_other', 'data_migration', 'data_details', 'users_who', 'users_count']],
    [4, ['must_haves', 'nice_to_haves', 'reference_url']],
    [5, ['target_launch', 'hard_deadline', 'structure', 'budget', 'payment_style', 'annual_revenue', 'gross_margin', 'revenue_growth', 'ownership', 'financials_access', 'ten_x']],
    [6, ['anything_else', 'heard_about_us']]
  ];

  function structure() {
    var c = form.querySelector('input[name="structure"]:checked');
    return c ? c.value : '';
  }

  function condVisible(el) {
    var list = el.getAttribute('data-cond').split(',');
    return list.indexOf(structure()) > -1;
  }

  // True when the field sits inside a conditional block that is not showing
  function nameHidden(name) {
    var el = form.querySelector('[name="' + name + '"]');
    var c = el && el.closest ? el.closest('.cond') : null;
    return !!c && c.hidden;
  }

  function reqFor(f) {
    var r = f.getAttribute('data-req-for');
    return r ? r.split(',').indexOf(structure()) > -1 : true;
  }

  function updateCond() {
    var conds = form.querySelectorAll('.cond');
    for (var i = 0; i < conds.length; i++) conds[i].hidden = !condVisible(conds[i]);
    var badges = form.querySelectorAll('[data-req-badge]');
    for (var j = 0; j < badges.length; j++) {
      var f = badges[j].closest('.field');
      badges[j].textContent = reqFor(f) ? 'Required' : 'Optional';
    }
  }

  function collect(raw) {
    var data = {};
    var els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.name || el.name === 'hp_field') continue;
      if (el.type === 'checkbox') {
        if (!data[el.name]) data[el.name] = [];
        if (el.checked) data[el.name].push(el.value);
      } else if (el.type === 'radio') {
        if (data[el.name] === undefined) data[el.name] = '';
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value.trim();
      }
    }
    if (!raw) {
      for (var n in data) {
        if (nameHidden(n)) data[n] = Array.isArray(data[n]) ? [] : '';
      }
    }
    return data;
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step: current, data: collect(true) }));
    } catch (e) {}
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  function loadDraft() {
    var raw = null;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
    if (!raw) return;
    var draft;
    try { draft = JSON.parse(raw); } catch (e) { return; }
    if (!draft || !draft.data) return;
    var els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var v = draft.data[el.name];
      if (!el.name || v === undefined || el.name === 'hp_field') continue;
      if (el.type === 'checkbox') el.checked = v.indexOf(el.value) > -1;
      else if (el.type === 'radio') el.checked = (v === el.value);
      else el.value = v;
    }
    updateCond();
    var s = parseInt(draft.step, 10);
    if (s >= 1) current = Math.min(s, TOTAL - 1);
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.hidden = !msg;
  }

  function fieldError(field, msg) {
    var err = field.querySelector('.field-error');
    if (!msg) {
      if (err) err.remove();
      field.classList.remove('invalid');
      return;
    }
    if (!err) {
      err = document.createElement('p');
      err.className = 'field-error';
      field.appendChild(err);
    }
    err.textContent = msg;
    field.classList.add('invalid');
  }

  function validateStep(n) {
    var section = form.querySelector('[data-step="' + n + '"]');
    var firstBad = null;
    var fields = section.querySelectorAll('.field');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var cb = f.closest('.cond');
      if (cb && cb.hidden) { fieldError(f, ''); continue; }
      var msg = '';
      var focusEl = null;
      var kind = f.getAttribute('data-required');
      var needed = reqFor(f);
      if (kind === 'radio') {
        if (needed && !f.querySelector('input:checked')) { msg = 'Choose one option.'; focusEl = f.querySelector('input'); }
      } else if (kind === 'check') {
        if (!f.querySelector('input:checked')) { msg = 'Choose at least one option.'; focusEl = f.querySelector('input'); }
      } else {
        var input = f.querySelector('input, textarea');
        if (input) {
          var val = input.value.trim();
          if ((input.required || (f.hasAttribute('data-req-for') && needed)) && !val) { msg = 'This field is required.'; focusEl = input; }
          else if (val && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { msg = 'Enter a valid email address.'; focusEl = input; }
          else if (val && input.type === 'url' && !/^https?:\/\/\S+\.\S+/i.test(val)) { msg = 'Enter a full link starting with http:// or https://.'; focusEl = input; }
          if (focusEl) focusEl.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
        }
      }
      fieldError(f, msg);
      if (msg && !firstBad) firstBad = focusEl;
    }
    if (firstBad) {
      showError(stepError, 'Please fix the highlighted fields to continue.');
      firstBad.focus();
      return false;
    }
    showError(stepError, '');
    return true;
  }

  function escapeText(s) { return String(s); }

  function buildReview() {
    var data = collect();
    review.textContent = '';
    for (var g = 0; g < ORDER.length; g++) {
      var sec = document.createElement('section');
      sec.className = 'review-group';
      var head = document.createElement('div');
      head.className = 'review-head';
      var h = document.createElement('h3');
      h.textContent = TITLES[ORDER[g][0] - 1];
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'link-btn';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', 'Edit ' + TITLES[ORDER[g][0] - 1]);
      edit.setAttribute('data-goto', ORDER[g][0]);
      head.appendChild(h); head.appendChild(edit);
      sec.appendChild(head);
      var dl = document.createElement('dl');
      var keys = ORDER[g][1];
      for (var k = 0; k < keys.length; k++) {
        if (nameHidden(keys[k])) continue;
        var v = data[keys[k]];
        if (Array.isArray(v)) v = v.join(', ');
        var dt = document.createElement('dt');
        dt.textContent = LABELS[keys[k]];
        var dd = document.createElement('dd');
        dd.textContent = v ? escapeText(v) : 'Not provided';
        if (!v) dd.className = 'empty';
        dl.appendChild(dt); dl.appendChild(dd);
      }
      sec.appendChild(dl);
      review.appendChild(sec);
    }
  }

  function go(n, focus) {
    current = n;
    for (var i = 0; i < steps.length; i++) steps[i].hidden = (i + 1 !== n);
    label.textContent = 'Step ' + n + ' of ' + TOTAL + ' · ' + TITLES[n - 1];
    fill.style.width = (n / TOTAL * 100) + '%';
    bar.setAttribute('aria-valuenow', n);
    back.hidden = (n === 1);
    next.hidden = (n === TOTAL);
    submit.hidden = (n !== TOTAL);
    showError(stepError, '');
    showError(submitError, '');
    if (n === TOTAL) buildReview();
    saveDraft();
    if (focus) {
      var t = form.querySelector('[data-step="' + n + '"] h2');
      t.focus();
      var top = app.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo(0, Math.max(0, top));
    }
  }

  next.addEventListener('click', function () {
    if (validateStep(current)) go(current + 1, true);
  });
  back.addEventListener('click', function () {
    if (current > 1) go(current - 1, true);
  });
  review.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-goto]') : null;
    if (t) go(parseInt(t.getAttribute('data-goto'), 10), true);
  });
  form.addEventListener('input', function (e) {
    var f = e.target.closest ? e.target.closest('.field') : null;
    if (f && f.classList.contains('invalid')) { fieldError(f, ''); e.target.removeAttribute && e.target.removeAttribute('aria-invalid'); }
    saveDraft();
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'structure') updateCond();
    var f = e.target.closest ? e.target.closest('.field') : null;
    if (f && f.classList.contains('invalid')) fieldError(f, '');
    saveDraft();
  });
  // Enter inside a single-line field advances instead of submitting early
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && current < TOTAL) {
      e.preventDefault();
      next.click();
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (current !== TOTAL) return;
    for (var n = 1; n < TOTAL; n++) {
      if (!validateStep(n)) { go(n, false); validateStep(n); return; }
    }
    showError(stepError, '');
    if (!INTAKE_ENDPOINT) {
      showError(submitError, 'Intake is not open yet, email tyler@headlessdev.io');
      return;
    }
    var payload = collect();
    payload.hp_field = document.getElementById('f-hp').value;
    payload.submitted_at = new Date().toISOString();
    submit.disabled = true;
    submit.textContent = 'Sending...';
    showError(submitError, '');
    fetch(INTAKE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('bad status');
      clearDraft();
      app.hidden = true;
      done.hidden = false;
      done.focus();
      window.scrollTo(0, 0);
    }).catch(function () {
      showError(submitError, 'Something went wrong sending your intake. Try again, or email tyler@headlessdev.io.');
      submit.disabled = false;
      submit.textContent = 'Submit intake';
    });
  });

  loadDraft();
  updateCond();
  go(current, false);
})();
