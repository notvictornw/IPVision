(function () {
  var cfg = window.SITE_CONFIG || {};
  var tracker = String(cfg.trackerUrl || '').replace(/\/+$/, '');
  var project = String(cfg.projectUrl || '').replace(/\/+$/, '');
  var href = tracker || project || '';

  var links = document.querySelectorAll('[data-tracker-link]');
  for (var i = 0; i < links.length; i++) {
    if (!href) {
      links[i].hidden = true;
      continue;
    }
    links[i].href = href;
    links[i].hidden = false;
  }

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
