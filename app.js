(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const cfg = window.SITE_CONFIG || {};
  const trackerUrl = String(cfg.trackerUrl || '').replace(/\/+$/, '');

  let currentTarget = null;

  const ipValue = $('ip-value');
  const ipLocation = $('ip-location');
  const errEl = $('ip-error');
  const note = $('result-note');
  const verdict = $('verdict');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function badge(text, kind) {
    return '<span class="badge ' + kind + '"><span class="bdot"></span>' + esc(text) + '</span>';
  }

  function setLoading() {
    ipValue.textContent = 'Carregando...';
    ipLocation.textContent = 'Consultando a origem da conexão';
    errEl.hidden = true;
    errEl.textContent = '';
    note.hidden = true;
    $('back-btn').hidden = true;
    verdict.hidden = true;
  }

  function normalize(raw) {
    return {
      ip: raw.ip || raw.query || '',
      city: raw.city || '',
      region: raw.region || '',
      country: raw.country_name || raw.country || '',
      countryCode: raw.country_code || raw.countryCode || '',
      isp: raw.isp || raw.org || '',
      asn: raw.asn || raw.as || '',
      timezone: raw.timezone || '',
      lat: raw.latitude ?? raw.lat,
      lon: raw.longitude ?? raw.lon
    };
  }

  function fetchJson(url, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 7000);
    return fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((r) => {
        if (!r.ok) {
          const e = new Error('HTTP ' + r.status);
          e.status = r.status;
          throw e;
        }
        return r.json();
      })
      .finally(() => clearTimeout(timer));
  }

  function validIp(value) {
    const v = String(value || '').trim();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) {
      return v.split('.').every((part) => Number(part) <= 255);
    }
    return v.includes(':') && /^[0-9a-fA-F:]+$/.test(v);
  }

  async function lookup(target) {
    currentTarget = target || null;
    setLoading();

    const sources = [];
    if (!currentTarget && trackerUrl) sources.push({ url: trackerUrl + '/api/ip', name: 'API do projeto' });
    const ipPath = currentTarget ? '/' + encodeURIComponent(currentTarget) : '';
    sources.push({ url: 'https://ipapi.co' + ipPath + '/json/', name: 'ipapi.co' });

    let lastErr;
    for (const source of sources) {
      try {
        const data = normalize(await fetchJson(source.url, 7000));
        if (!data.ip) throw new Error('Resposta sem IP');
        render(data, Boolean(currentTarget));
        return;
      } catch (e) {
        lastErr = e;
      }
    }

    ipValue.textContent = 'Indisponível';
    ipLocation.textContent = 'Não conseguimos consultar este IP';
    verdict.hidden = true;
    errEl.hidden = false;
    errEl.textContent = lastErr && lastErr.status === 429
      ? 'O serviço de consulta está ocupado agora. Tente de novo em instantes.'
      : 'Não conseguimos consultar este IP. Confere o endereço e tenta de novo.';
  }

  function render(d, isCustom) {
    ipValue.textContent = d.ip;
    ipLocation.textContent = [d.city, d.region, d.country].filter(Boolean).join(', ')
      || 'Localização indisponível';

    const connection = (window.detectConnection || function () {
      return { type: 'unknown', title: 'Sem classificação', text: 'Não foi possível classificar.', confidence: 'baixa', evidence: null };
    })(d.isp, d.asn);

    verdict.className = 'verdict ' + connection.type;
    $('verdict-label').textContent = connection.title;
    $('verdict-text').textContent = connection.text;
    verdict.hidden = false;

    $('v-city').textContent = [d.city, d.region].filter(Boolean).join(', ') || '—';
    $('v-country').textContent = d.country
      ? d.country + (d.countryCode ? ' (' + d.countryCode + ')' : '')
      : '—';
    $('v-isp').textContent = d.isp || '—';
    $('v-tz').textContent = d.timezone || '—';

    $('v-asn').textContent = d.asn || '—';
    $('v-coords').textContent = (d.lat != null && d.lon != null && d.lat !== '' && d.lon !== '')
      ? d.lat + ', ' + d.lon
      : '—';
    $('v-type').textContent = d.ip.includes(':') ? 'IPv6' : 'IPv4';
    $('v-evidence').textContent = connection.evidence || 'Nenhum';
    $('v-confidence').textContent = connection.confidence;
    $('v-ua').textContent = navigator.userAgent || '—';
    $('v-client').textContent = [screen.width + 'x' + screen.height, navigator.language || null]
      .filter(Boolean).join(' · ');

    note.hidden = !isCustom;
    if (isCustom) note.textContent = 'Você está vendo o IP digitado, não o seu.';
    $('back-btn').hidden = !isCustom;
  }

  async function copyIp() {
    const ip = ipValue.textContent.trim();
    if (!ip || ip === 'Carregando...' || ip === 'Indisponível') return;

    const btn = $('copy-btn');
    try {
      await navigator.clipboard.writeText(ip);
      btn.textContent = 'Copiado';
    } catch (_) {
      btn.textContent = 'Não deu';
    }
    setTimeout(() => { btn.textContent = 'Copiar IP'; }, 1500);
  }

  $('refresh-btn').addEventListener('click', () => lookup(currentTarget));
  $('copy-btn').addEventListener('click', copyIp);

  $('ip-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = $('ip-input').value.trim();
    if (!validIp(value)) {
      errEl.hidden = false;
      errEl.textContent = 'Esse endereço não parece um IP válido. Tenta de novo.';
      return;
    }
    lookup(value);
  });

  $('back-btn').addEventListener('click', () => {
    $('ip-input').value = '';
    lookup(null);
  });

  lookup(null);
})();
