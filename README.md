# IPVision

Um site pequeno que responde uma pergunta chata: "qual é o meu IP e o que dá pra saber sobre ele?". Abre no navegador, pergunta a um serviço público de geolocalização e devolve cidade, país, operadora, horário local e um palpite sobre VPN ou proxy. Também tem um botão que mede latência, download e upload da conexão. Sem cadastro, sem conta, sem banco de dados.

Endereço público: <https://notvictornw.github.io/IPVision/>

## O que aparece na tela

Ao carregar, a página mostra:

- o IP público da conexão;
- a região aproximada (cidade, estado e país);
- a operadora e o horário local daquele IP;
- uma frase sobre a conexão: "Conexão comum", "Parece VPN ou proxy", "Parece um servidor" ou "Sem dados suficientes".

Em baixo tem um botão de teste de velocidade. Ele mede latência, oscilação, download e upload e mostra os quatro números na hora.

ASN, coordenadas, navegador, idioma e o nome exato que disparou a classificação ficam em "Ver detalhes técnicos". Quem só quer entender o próprio IP não precisa passar por esse bloco.

Tem também um campo para colar outro IP. Útil quando chega um endereço suspeito por e-mail ou quando você vê um acesso que não reconhece num log. O resultado aparece com um aviso dizendo que aquele não é o seu IP e um botão para voltar.

## Rodando local

É HTML estático. Não tem `package.json`, build ou variável de ambiente.

```bash
git clone https://github.com/notvictornw/IPVision.git
cd IPVision
python -m http.server 8000
```

Abre <http://localhost:8000>.

Não abra o `index.html` com duplo clique. Com `file://` o navegador barra a consulta ao serviço de geolocalização por CORS e a página mostra erro. Tem que servir por HTTP, mesmo em localhost.

## Os arquivos

- `index.html` — a página que as pessoas usam. Consulta, veredito, cartões e formulário.
- `project.html` — a página "Entenda melhor". Explica em três passos: a consulta, o significado de cada resultado e o que acontece com os dados.
- `app.js` — faz a requisição, trata erro, preenche os campos, cuida do formulário e do botão de copiar.
- `speedtest.js` — mede latência, download e upload e cuida do estado do botão de teste.
- `vpn.js` — decide se a conexão parece VPN, servidor ou casa. É o único lugar com listas de palavras-chave.
- `site.js` — duas tarefas compartilhadas: esconder links externos quando não há URL configurada e preencher o ano do rodapé.
- `config.js` — as URLs opcionais de uma API própria.
- `style.css` — tema escuro, grid, responsividade e os estados do veredito.
- `.nojekyll` — diz ao GitHub Pages para não ignorar arquivos especiais.

## Como a classificação de VPN funciona

O `ipapi.co/json/` devolve `org` e `asn`, mas não devolve campo nenhum de VPN. Então a classificação acontece no navegador, no `vpn.js`: as duas strings são baixadas para minúsculas e comparadas com listas de nomes conhecidos.

- Bateu em nome de VPN conhecida: "Parece VPN ou proxy", confiança alta.
- Bateu em nome de hosting conhecido: "Parece um servidor", confiança média.
- Não bateu em nada: "Conexão comum", confiança baixa.
- Não veio operadora: "Sem dados suficientes".

A palavra que bateu aparece em "Sinal encontrado" nos detalhes técnicos.

É um palpite informado. Operadora muda de nome, VPN aluga servidor de datacenter e datacenter às vezes é de VPN. A página avisa que não é prova.

## Como o teste de velocidade funciona

Não tem servidor próprio nem arquivo pesado no repositório. O `speedtest.js` conversa com os endpoints públicos da Cloudflare, que liberam CORS para qualquer origem:

- latência: quatro buscas de 1 KB, uma atrás da outra, com a mediana como resultado. A diferença entre a mais rápida e a mais lenta vira oscilação;
- download: um arquivo de 5 MB gerado pela própria Cloudflare, lido até o fim e dividido pelo tempo gasto;
- upload: 2 MB de bytes aleatórios enviados por `XMLHttpRequest`, com o tempo tirado do evento de progresso que marca o fim do envio.

O botão fica desativado enquanto o teste roda e mostra em qual etapa está. Se alguma etapa falhar, a mensagem de erro aparece no lugar do status e o botão volta. Nenhum resultado é guardado.

Esses números são aproximados. O servidor mais perto, o horário e o tráfego da rede mudam o resultado, e o teste da Cloudflare não usa a mesma metodologia do Ookla. Serve para ter uma ideia da conexão, não para comparar com o contrato da operadora.

## Testando a classificação sem navegador

O `vpn.js` não depende de DOM, então dá para testar com Node:

```bash
node -e "require('./vpn.js'); for (const [org,asn] of [['Fibra Exemplo Ltda','AS64500'],['VPN Exemplo Ltda','AS64501'],['Hosting Exemplo Ltda','AS64502']]) { const r = detectConnection(org,asn); console.log(org,'=>',r.type,r.confidence); }"
```

Saída esperada:

```text
Fibra Exemplo Ltda => home baixa
VPN Exemplo Ltda => vpn alta
Hosting Exemplo Ltda => hosting média
```

Se você adicionar um serviço novo às listas, roda esse comando com o nome dele antes de mexer na interface.

## Configuração

`config.js` hoje está assim:

```js
window.SITE_CONFIG = {
  trackerUrl: "",
  projectUrl: ""
};
```

Com os dois vazios, o `site.js` esconde os links externos marcados com `data-tracker-link` e a consulta vai direto no `ipapi.co`.

Se você tiver uma API própria com esses campos, preencha `trackerUrl` com a base dela. O `app.js` tenta `trackerUrl + '/api/ip'` primeiro e cai para o `ipapi.co` se falhar. A API precisa devolver os mesmos campos que o serviço público usa: `ip`, `city`, `region`, `country_name`, `country_code`, `org` (ou `isp`), `asn`, `timezone`, `latitude` e `longitude`. `projectUrl` é só o link "Abrir Tracker"; pode ficar vazio mesmo com `trackerUrl` preenchido.

## Publicando no GitHub Pages

1. Deixe o repositório público.
2. Em Settings → Pages, escolha Deploy from a branch, branch `main`, pasta `/ (root)`.
3. Salve e espere o primeiro deploy terminar.

O `.nojekyll` já está no root, então não tem problema com nomes de arquivo começando por underscore. Como este é um repositório de projeto, o endereço é <https://notvictornw.github.io/IPVision/>, não a raiz do domínio.

## Privacidade

Não tem servidor próprio. A consulta sai do navegador direto para o `ipapi.co`, que pode registrar o IP conforme a política dele. No teste de velocidade, o navegador conversa com `speed.cloudflare.com`, que também vê o IP da conexão durante o teste. O site não grava nada, não usa cookie e não tem analytics.

O campo de outro IP só consulta dados públicos, na mesma linha de um `whois`. Quem não quer que apareça a cidade aproximada da operadora pode navegar com VPN. Nesse caso a página mostra a operadora da VPN, não a de casa.

## Limitações conhecidas

- A cidade é a do cadastro da operadora, não a posição real do dispositivo. Você está em uma cidade e aparece em outra: normal.
- A classificação usa só o nome da operadora. Confiança baixa não é garantia de nada.
- O `ipapi.co` pode falhar ou aplicar limite de requisições. A interface mostra uma mensagem e oferece "Atualizar".
- O teste de velocidade depende da Cloudflare. Se os endpoints estiverem fora do ar ou a rede bloquear o domínio, o teste falha e mostra o motivo.
- Por padrão o IP exibido é o de quem abriu a página, não o meu. O campo "Analisar" é que consulta um IP específico.
- O formulário não verifica se o IP consultado pertence a quem digitou. É leitura pública, sem autenticação.

## Autor

notvictornw — <https://github.com/notvictornw>
