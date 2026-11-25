(function (root) {
  'use strict';

  var VPN_WORDS = [
    'mullvad', 'nordvpn', 'nord vpn', 'expressvpn', 'express vpn',
    'protonvpn', 'proton vpn', 'proton ag', 'surfshark', 'cyberghost',
    'private internet access', 'pia ', 'ipvanish', 'purevpn', 'pure vpn',
    'torguard', 'astrill', 'windscribe', 'hide.me', 'hidemy', 'hotspot shield',
    'tunnelbear', 'strongvpn', 'vyprvpn', 'ivacy', 'zenmate', 'opera vpn',
    'mozilla vpn', 'wireguard', 'azirevpn', 'airvpn', 'vpn', 'proxy',
    'anonymizer', 'tor exit', 'torproject'
  ];

  var HOSTING_WORDS = [
    'digitalocean', 'amazon', 'aws', 'ec2', 'google cloud', 'google llc', 'gcp',
    'microsoft azure', 'azure', 'linode', 'akamai', 'vultr', 'hetzner',
    'ovh', 'oracle cloud', 'rackspace', 'choopa', 'contabo', 'scaleway',
    'upcloud', 'kamatera', 'hostinger', 'ionos', 'leaseweb', 'hostwinds',
    'cloudflare', 'fastly', 'incapsula', 'sucuri', 'stackpath', 'quadranet',
    'psychz', 'cogent', 'zscaler', 'forcepoint', 'data center', 'datacenter',
    'hosting', 'colocation', 'vps '
  ];

  function findWord(text, words) {
    for (var i = 0; i < words.length; i++) {
      if (text.indexOf(words[i]) !== -1) return words[i].trim();
    }
    return null;
  }

  function result(type, title, text, confidence, evidence) {
    return {
      type: type,
      title: title,
      text: text,
      confidence: confidence,
      evidence: evidence || null
    };
  }

  function detectConnection(org, asn) {
    var text = (String(org || '') + ' ' + String(asn || '')).toLowerCase();

    if (!text.trim()) {
      return result('unknown', 'Sem dados suficientes',
        'Não recebemos o nome da operadora deste IP, então não dá para classificar.', 'baixa', null);
    }

    var vpn = findWord(text, VPN_WORDS);
    if (vpn) {
      return result('vpn', 'Parece VPN ou proxy',
        'A operadora deste IP tem nome associado a serviços de VPN ou proxy.', 'alta', vpn);
    }

    var hosting = findWord(text, HOSTING_WORDS);
    if (hosting) {
      return result('hosting', 'Parece um servidor',
        'Este IP pertence a uma empresa de hospedagem, não a uma conexão caseira.', 'média', hosting);
    }

    return result('home', 'Conexão comum',
      'Não encontramos sinal de VPN, proxy ou servidor neste IP.', 'baixa', null);
  }

  root.detectConnection = detectConnection;
})(typeof window !== 'undefined' ? window : globalThis);
