(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const btn = $('speed-btn');
  if (!btn) return;

  const BASE = 'https://speed.cloudflare.com';
  const DOWNLOAD_BYTES = 5000000;
  const UPLOAD_BYTES = 2000000;
  const TIMEOUT_MS = 30000;

  const statusEl = $('speed-status');
  const resultsEl = $('speed-results');
  const latencyEl = $('s-latency');
  const jitterEl = $('s-jitter');
  const downloadEl = $('s-download');
  const uploadEl = $('s-upload');

  function nonce() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function Mbps(bytes, ms) {
    if (!bytes || !ms || ms <= 0) return '—';
    return (bytes * 8 / (ms / 1000) / 1000000).toFixed(1) + ' Mbps';
  }

  function status(text) {
    statusEl.textContent = text;
    statusEl.hidden = false;
  }

  async function fetchBytes(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const body = await response.arrayBuffer();
      return Number(response.headers.get('content-length')) || body.byteLength;
    } finally {
      clearTimeout(timer);
    }
  }

  async function measureLatency() {
    const samples = [];
    for (let i = 0; i < 4; i += 1) {
      const start = performance.now();
      await fetchBytes(BASE + '/__down?bytes=1000&cb=' + nonce());
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    return {
      latency: Math.round(samples[Math.floor(samples.length / 2)]),
      jitter: Math.round(samples[samples.length - 1] - samples[0])
    };
  }

  async function measureDownload() {
    const start = performance.now();
    const bytes = await fetchBytes(BASE + '/__down?bytes=' + DOWNLOAD_BYTES + '&cb=' + nonce());
    return Mbps(bytes, performance.now() - start);
  }

  function randomBody(size) {
    const data = new Uint8Array(size);
    const chunk = new Uint8Array(65536);
    for (let offset = 0; offset < size; offset += chunk.length) {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(chunk);
      } else {
        for (let i = 0; i < chunk.length; i += 1) chunk[i] = Math.random() * 256;
      }
      data.set(chunk.subarray(0, Math.min(chunk.length, size - offset)), offset);
    }
    return data;
  }

  function measureUpload() {
    return new Promise((resolve, reject) => {
      const body = randomBody(UPLOAD_BYTES);
      const xhr = new XMLHttpRequest();
      const startedAt = performance.now();
      let finishedAt = 0;

      xhr.open('POST', BASE + '/__up?cb=' + nonce(), true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.timeout = TIMEOUT_MS;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.loaded >= event.total && !finishedAt) {
          finishedAt = performance.now();
        }
      };
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error('HTTP ' + xhr.status));
          return;
        }
        const sentAt = finishedAt || performance.now();
        resolve(Mbps(body.byteLength, sentAt - startedAt));
      };
      xhr.onerror = () => reject(new Error('Falha de rede'));
      xhr.ontimeout = () => reject(new Error('Tempo esgotado'));

      xhr.send(body);
    });
  }

  async function run() {
    btn.disabled = true;
    btn.textContent = 'Medindo...';
    resultsEl.hidden = false;
    latencyEl.textContent = '—';
    jitterEl.textContent = '—';
    downloadEl.textContent = '—';
    uploadEl.textContent = '—';

    try {
      status('Medindo latência...');
      const ping = await measureLatency();
      latencyEl.textContent = ping.latency + ' ms';
      jitterEl.textContent = ping.jitter + ' ms';

      status('Baixando 5 MB...');
      downloadEl.textContent = await measureDownload();

      status('Enviando 2 MB...');
      uploadEl.textContent = await measureUpload();

      status('Pronto. Os números são aproximados.');
    } catch (error) {
      status('Não deu para completar o teste: ' + (error && error.message ? error.message : 'erro desconhecido') + '.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Iniciar teste';
    }
  }

  btn.addEventListener('click', run);
})();
