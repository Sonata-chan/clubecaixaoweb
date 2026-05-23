# Automated Testing Guide

Este projeto usa Playwright para rodar testes automatizados contra o jogo carregado no navegador, com um harness de teste injetado no runtime do RPG Maker MZ.

## Visao Geral

Hoje a suite automatizada cobre tres fluxos principais:

1. Boot do jogo ate a tela inicial customizada.
2. Save/load roundtrip com verificacao de estado em memoria.
3. Requisicao do menu de pausa a partir de uma cena de mapa forjada para teste.
4. Validacao de render web para imagens e tela preta nas rotas principais (title, map, pause, save e load).
5. Fluxo de UI customizada de save/load com validacao de slots e acao de clique em slot.
6. Fluxo de UI de escolhas VN com validacao de parametros visuais e callback.
7. Validacao de render web para detectar imagens quebradas e tela preta nas rotas principais.

Os testes ficam em `tests/e2e` e usam a configuracao de `playwright.config.js`.

## Arquivos Envolvidos

- `package.json`
- `playwright.config.js`
- `js/main.js`
- `js/plugins/automation-test-harness.js`
- `js/plugins/WebDeployHardeningMZ.js`
- `tests/e2e/boot.spec.js`
- `tests/e2e/save-load.spec.js`
- `tests/e2e/pause-menu.spec.js`
- `tests/e2e/web-build-render.spec.js`
- `tests/e2e/save-load-ui.spec.js`
- `tests/e2e/choices-ui.spec.js`

## Coverage Matrix

| Teste | Boot/Title | Save Core | Save UI | Load Core | Load UI | Pause Request | Choices VN UI | Imagens HTTP | Tela Preta | Rotas Cober tas |
|---|---|---|---|---|---|---|---|---|---|---|
| `boot.spec.js` | Sim | Nao | Nao | Nao | Nao | Nao | Nao | Parcial | Parcial | title |
| `save-load.spec.js` | Sim | Sim | Nao | Sim | Nao | Nao | Nao | Nao | Nao | title + estado em memoria |
| `pause-menu.spec.js` | Sim | Nao | Nao | Nao | Nao | Sim | Nao | Nao | Nao | title + gate pause |
| `web-build-render.spec.js` | Sim | Nao | Sim | Nao | Sim | Sim | Nao | Sim | Sim | title/map/pause/save/load |
| `save-load-ui.spec.js` | Sim | Sim | Sim | Sim | Sim | Indireto | Nao | Parcial | Nao | title/save/load |
| `choices-ui.spec.js` | Sim | Nao | Nao | Nao | Nao | Nao | Sim | Nao | Nao | title + janela choices |

## Como a Infraestrutura Funciona

### 1. Web server local

O Playwright sobe automaticamente um servidor HTTP local com:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory .
```

Isso e necessario porque o RPG Maker MZ carrega scripts, JSON, imagens, audio e WASM por HTTP. Rodar direto em `file://` nao funciona bem para automacao.

### 2. Entrada do jogo

O Playwright abre a URL base:

```text
http://127.0.0.1:8000/index.html
```

Os testes acrescentam query params como:

```text
?testMode=1&testCase=boot
```

Esses parametros ativam o harness de teste.

### 3. Harness de teste

O arquivo `js/plugins/automation-test-harness.js` e carregado em modo de teste e faz quatro coisas principais:

1. Publica um objeto global de observabilidade:

```js
window.__CLUBECAIXAO_TEST__
```

2. Monitora transicoes de cena e operacoes de save/load:

- `SceneManager.goto`
- `SceneManager.push`
- `SceneManager.pop`
- `SceneManager.clearStack`
- `DataManager.saveGame`
- `DataManager.loadGame`

3. Exponibiliza um snapshot legivel pelo Playwright:

- `active`
- `currentTestCase`
- `ready`
- `sceneName`
- `sceneBusy`
- `stackSize`
- `marks`
- `transitions`
- `saveCalls`
- `loadCalls`
- `failures`

4. Aplica um fallback grafico para o ambiente headless.

Esse ponto e importante: o RPG Maker MZ falhava ao inicializar graficos em Chromium headless. O harness substitui a criacao padrao de app grafico por uma versao compativel com a automacao e pula o uso de Effekseer quando o contexto grafico necessario nao esta disponivel.

### 4. Configuracao do Playwright

O `playwright.config.js` define:

- `testDir: ./tests/e2e`
- timeout total por teste de `60000ms`
- `trace: on-first-retry`
- screenshot automatico em falha
- viewport de `816x624`
- argumentos de launch para WebGL/software rendering

Os argumentos mais importantes sao:

```text
--enable-webgl
--ignore-gpu-blocklist
--use-gl=swiftshader
--enable-unsafe-swiftshader
--disable-dev-shm-usage
```

Eles existem para tornar o renderer do jogo estavel no browser headless.

## Cobertura Exata dos Testes

## Preload Manual de Midia (Web)

Para reduzir flicker de imagem e atraso de audio em export web, o projeto agora inclui dois plugins:

- `ImagePreloadFreefMZ`
- `AudioPreloadFreefMZ`

Ambos estao registrados no carregamento de plugins do jogo e expostos como comandos de evento no RPG Maker MZ.

## Warmup de Textura GPU para Show Picture

Para o caso de WebGL em que o arquivo ja baixou, mas o sprite ainda pode falhar no primeiro frame, o projeto agora inclui:

- `PictureTextureWarmupMZ`

Esse plugin faz:

1. preload da imagem de `img/pictures`;
2. tentativa de upload da `baseTexture` no renderer PIXI;
3. `Show Picture` apenas depois do warmup (quando configurado para aguardar).

## Hardening Web Para Itch.io

O projeto agora inclui:

- `WebDeployHardeningMZ`

Medidas aplicadas:

1. `assetVersion` para cache-busting de imagens, audios e JSON de data.
2. Detecao de `webglcontextlost` com auto-reload opcional para evitar tela preta permanente.
3. Logs de eventos de hardening no console (`[WEB-HARDEN]`).

### Como usar no upload

Antes de subir uma nova build web, altere o parametro `assetVersion` do plugin para um valor novo.

Exemplo:

```text
2026-05-23b
```

Isso força os clientes a baixarem os assets atualizados em vez de reutilizar cache antigo do CDN/browser.

### Comando: Warmup Pictures

- Plugin command: `warmup_pictures`
- Parametro `names`: lista separada por virgula, sem extensao

Exemplo:

```text
names: cenario_cemiterio,cenario_quarto,cenario_rua
```

### Comando: Show Picture After Warmup

- Plugin command: `show_picture_after_warmup`
- Executa o equivalente ao `Show Picture` nativo, mas so depois do warmup da imagem.
- Parametro `waitForWarmup`: recomendado `true` para evitar corrida de render.

### Comando: Release Pictures

- Plugin command: `release_pictures`
- Remove imagens especificadas do cache do `ImageManager` e libera `BaseTexture`/bitmap.
- O plugin nao descarrega imagens que ainda estejam em uso na tela.

Exemplo:

```text
names: cenario_quarto_antigo,cenario_corredor_antigo
```

### Comando: Trim Tracked Pictures

- Plugin command: `trim_tracked_pictures`
- Descarta imagens antigas que passaram por warmup/show, mantendo apenas as mais recentes.
- Parametro `keepLast`: quantas imagens recentes manter.
- Parametro `keepNames`: nomes extras que devem permanecer carregados.

Exemplo:

```text
keepLast: 2
keepNames: cenario_atual,proximo_cenario
```

Uso recomendado em evento:

1. Chamar `warmup_pictures` com a proxima imagem alguns comandos antes.
2. No momento de trocar cenario, usar `show_picture_after_warmup` com `waitForWarmup=true`.
3. Depois que o cenario anterior sair de uso, chamar `trim_tracked_pictures` ou `release_pictures` para liberar memoria.

### Comando: Preload Images

- Plugin command: `preload_images`
- Parametro `folderSelect`: pasta sob `img/` (por exemplo `pictures`, `titles1`)
- Parametro `names`: lista separada por virgula, sem extensao

Exemplo:

```text
folderSelect: pictures
names: aviso_01,aviso_02,aviso_03
```

### Comando: Preload Audios

- Plugin command: `preload_audios`
- Parametro `folderSelect`: pasta sob `audio/` (`se`, `me`, `bgs`, `bgm`)
- Parametro `names`: lista separada por virgula, sem extensao
- Regra: `se` tenta download completo; demais pastas fazem preload parcial dos primeiros 500kb

Exemplo:

```text
folderSelect: bgm
names: bgm_theme_something_happening_at_the_cemetery
```

### Estrategia de Uso

- Precarregar de 1 a 4 assets por vez.
- Disparar preload alguns eventos antes do uso real.
- Evitar rajadas grandes de preload junto de troca de trilha/efeito para nao disputar banda.

### Validacao Recomendada

- Servir build por HTTP local (nao usar `file://`).
- Abrir DevTools > Network.
- Aplicar throttle (Slow 4G ou 3G) para reproduzir condicoes reais.
- Verificar se os requests dos assets criticos acontecem antes do frame em que sao exibidos/tocados.

## `boot.spec.js`

Objetivo: validar que o jogo sobe corretamente em modo de teste e chega ate a tela inicial customizada.

O que esse teste faz:

1. Abre `index.html?testMode=1&testCase=boot`.
2. Espera o harness ficar pronto.
3. Espera a cena atual virar `Scene_Title`.
4. Em caso de falha, coleta diagnostico:
   - mensagens de console
   - page errors
   - snapshot do harness
   - texto do body
5. Valida que:
   - o harness esta ativo
   - o `testCase` lido e `boot`
   - a cena atual e `Scene_Title`
   - o harness marcou `title-ready`

Cobertura real desse teste:

- Carregamento de `index.html`
- Carregamento de `js/main.js`
- Carregamento do core do RPG Maker MZ
- Carregamento de plugins
- Inicializacao do fallback grafico de teste
- Boot ate a title customizada

O que ele nao cobre:

- clique nos botoes da title
- carregamento completo de mapa jogavel
- save/load
- menu de pausa
- dialogos

## `save-load.spec.js`

Objetivo: validar persistencia de estado de jogo via `DataManager.saveGame` e `DataManager.loadGame`.

O que esse teste faz:

1. Abre `index.html?testMode=1&testCase=save-load`.
2. Espera a title ficar pronta.
3. Cria um novo jogo em memoria com `DataManager.setupNewGame()`.
4. Altera estado do jogo:
   - variavel `13 = 42`
   - gold `+250`
5. Chama `$gameSystem.onBeforeSave()`.
6. Executa `DataManager.saveGame(1)`.
7. Muta o estado depois do save:
   - variavel `13 = 7`
   - gold `-50`
8. Executa `DataManager.loadGame(1)`.
9. Chama `$gameSystem.onAfterLoad()`.
10. Valida que o estado voltou ao valor salvo.

Assercoes atuais:

- `saveGame` retorna `0`
- `loadGame` retorna `0`
- variavel `13` volta para `42`
- gold volta para `250`
- o harness registrou pelo menos uma chamada de save
- o harness registrou pelo menos uma chamada de load
- nao houve falhas registradas no harness

Cobertura real desse teste:

- serializacao de save
- desserializacao de save
- hooks `onBeforeSave` e `onAfterLoad`
- integracao basica entre `DataManager` e `StorageManager`
- persistencia de estado simples do jogo

O que ele nao cobre:

- abrir a tela visual customizada de save/load
- clique em slot real da UI
- screenshot de save
- retorno para `Scene_Map` depois do load visual
- restauracao de posicao/mapa por fluxo completo de cena

## `pause-menu.spec.js`

Objetivo: validar que o jogo aceita a requisicao de abertura do menu de pausa pelo fluxo do plugin.

O que esse teste faz:

1. Abre `index.html?testMode=1&testCase=pause-menu`.
2. Espera a title ficar pronta.
3. Usa um helper do harness para forcar uma `Scene_Map` em memoria:

```js
window.__CLUBECAIXAO_TEST__.forceMapSceneForTests()
```

4. Chama:

```js
window.__CLUBECAIXAO_TEST__.requestPauseMenu()
```

5. Verifica que:
   - `_pauseMenuRequested === true`
   - o snapshot continua com `sceneName === "Scene_Map"`
   - o harness nao registrou falhas

Cobertura real desse teste:

- gate de entrada do plugin de pausa
- aceitacao do request de pause quando a cena atual e de mapa
- observabilidade do estado interno do plugin

O que ele nao cobre:

- renderizacao completa da `Scene_CustomPause`
- clique nos botoes reais do menu de pausa
- fluxo visual de retorno ao mapa
- save/load aberto a partir do pause menu visual

## `web-build-render.spec.js`

Objetivo: detectar em build web falhas de carregamento de imagem e telas pretas nas rotas principais.

O que esse teste faz:

1. Abre `index.html?testMode=1&testCase=web-build-render`.
2. Espera o title carregar.
3. Percorre rotas principais:
   - `title`
   - `map`
   - `pause`
   - `save`
   - `load`
4. Em cada rota, analisa o `gameCanvas` e calcula proporcao de pixels praticamente pretos.
5. Falla se a tela estiver quase toda preta (`blackRatio >= 0.985`).
6. Captura falhas de rede de imagem durante todo o fluxo:
   - request de imagem com erro (`requestfailed`)
   - responses de imagem com status `>= 400`
7. Valida que o harness nao reportou falhas internas.

Cobertura real desse teste:

- deteccao de falha de carregamento de imagens de personagens/background por request HTTP
- deteccao de tela preta por analise de pixels no canvas
- verificacao da cadeia principal de rotas visuais web

O que ele nao cobre:

- 100% de todos os mapas/eventos de historia automaticamente
- todos os dialogos e common events do jogo inteiro
- regressao visual por baseline de screenshot

## `save-load-ui.spec.js`

Objetivo: validar o fluxo da UI customizada de save/load (cenas `Scene_VNSave` e `Scene_VNLoad`) com acao real de slot.

O que esse teste faz:

1. Abre `index.html?testMode=1&testCase=save-load-ui`.
2. Espera title pronta.
3. Prepara estado de jogo (variavel e gold).
4. Abre UI de save (`openVNSave`) e espera `Scene_VNSave`.
5. Valida quantidade de slots carregados.
6. Aciona `onSlotClick(1)` para salvar no slot 1.
7. Abre UI de load (`openVNLoad(true)`) e espera `Scene_VNLoad`.
8. Valida quantidade de slots carregados.
9. Aciona `onSlotClick(1)` para carregar o slot salvo.
10. Valida estado restaurado e contadores do harness (`saveCalls`/`loadCalls`).

## `choices-ui.spec.js`

Objetivo: validar comportamento da UI de escolhas VN configurada pelos plugins Galv.

O que esse teste faz:

1. Abre `index.html?testMode=1&testCase=choices-ui`.
2. Espera title pronta.
3. Liga `vnChoices` no `Game_System`.
4. Configura escolhas com tags de botao (`\\b[x]`).
5. Instancia `Window_ChoiceList` e roda `setupVNChoices`.
6. Valida:
   - `lineHeight` e `itemHeight` conforme parametro do plugin (`70`).
   - parse do `\\b[2]` para background de escolha.
   - opacidade da janela em modo VN (`0`).
   - callback de escolha executado com indice correto.

## Resumo de Cobertura Atual

Coberto hoje:

- boot do jogo em browser automatizado
- title customizada carregando com sucesso
- infraestrutura de harness e observabilidade
- save/load basico no `DataManager`
- hooks de save/load do sistema
- request interno de pause menu
- validacao de imagens e tela preta nas rotas principais web
- fluxo de UI customizada de save/load (cenas e slots)
- fluxo de UI de escolhas VN (janela e callback)

Nao coberto hoje:

- dialogos de mapas e common events reais
- escolhas de VN por UI real
- tela visual de save/load por clique
- fluxo completo title -> mapa pronto -> pause visual -> retorno
- validacao de todas as rotas do jogo
- cobertura sistematica de mapas e eventos
- regressao visual por screenshot baseline
- validacao de cada dialogo de historia individualmente

Em outras palavras: a suite atual e uma base automatizada util, mas ainda nao e uma cobertura completa de "todas as rotas, funcoes, dialogos e saves" do jogo inteiro.

## Como Rodar os Testes

## Pre-requisitos

Voce precisa ter:

- Node.js
- npm
- Python 3

Se for a primeira vez no projeto:

```sh
npm install
npx playwright install --with-deps
```

## Rodar a suite inteira

Use:

```sh
npm run test:e2e
```

Ou equivalente:

```sh
npx playwright test
```

## Rodar local com renderizacao visivel e log em arquivo

Suite completa local (headed + xvfb + log):

```sh
npm run test:e2e:local
```

Saida persistida em:

- `test_output.txt`

## Rodar um teste especifico

Boot:

```sh
npx playwright test tests/e2e/boot.spec.js --reporter=list
```

Save/load:

```sh
npx playwright test tests/e2e/save-load.spec.js --reporter=list
```

Pause menu:

```sh
npx playwright test tests/e2e/pause-menu.spec.js --reporter=list
```

Web build render/imagens:

```sh
npx playwright test tests/e2e/web-build-render.spec.js --reporter=list
```

Save/load UI custom:

```sh
npx playwright test tests/e2e/save-load-ui.spec.js --reporter=list
```

Choices UI (VN):

```sh
npx playwright test tests/e2e/choices-ui.spec.js --reporter=list
```

## Rodar os tres testes principais explicitamente

```sh
npx playwright test tests/e2e/boot.spec.js tests/e2e/save-load.spec.js tests/e2e/pause-menu.spec.js --reporter=list
```

## Rodar suite com validacao de tela preta/imagens

```sh
npx playwright test tests/e2e/boot.spec.js tests/e2e/save-load.spec.js tests/e2e/pause-menu.spec.js tests/e2e/web-build-render.spec.js --reporter=list
```

## Rodar suite completa atual (6 testes)

```sh
npx playwright test tests/e2e/boot.spec.js tests/e2e/save-load.spec.js tests/e2e/pause-menu.spec.js tests/e2e/web-build-render.spec.js tests/e2e/save-load-ui.spec.js tests/e2e/choices-ui.spec.js --reporter=list
```

## Rodar com browser visivel

```sh
npm run test:e2e:headed
```

Ou:

```sh
npx playwright test --headed
```

Isso e util para ver a sequencia de carregamento e inspecionar falhas visuais.

## Como o fluxo de execucao acontece

Quando voce roda `npm run test:e2e`, o processo e este:

1. O Playwright le `playwright.config.js`.
2. Ele sobe o servidor HTTP local na porta `8000`.
3. O Chromium headless e aberto com flags de WebGL/software rendering.
4. O teste abre `index.html` com `testMode=1`.
5. `js/main.js` detecta `testMode=1`.
6. O harness `js/plugins/automation-test-harness.js` e carregado.
7. O jogo termina o boot usando o fallback grafico de teste.
8. O teste faz leituras e acoes via `page.evaluate(...)`.
9. O Playwright faz assercoes e encerra o browser.

## Onde olhar quando um teste falha

O Playwright gera artefatos automaticamente.

Pastas/arquivos uteis:

- `test-results/`
- screenshots de falha nessa pasta
- trace em retry

No caso especifico de `boot.spec.js`, ele tambem embute diagnostico rico na excecao:

- logs de console
- `pageerror`
- snapshot do harness
- texto do body

## Como debugar melhor

### 1. Rodar um teste isolado em modo visivel

```sh
npx playwright test tests/e2e/boot.spec.js --headed --reporter=list
```

### 2. Usar o inspector do Playwright

```sh
PWDEBUG=1 npx playwright test tests/e2e/boot.spec.js
```

### 3. Inspecionar os snapshots do harness

Todos os testes podem acessar:

```js
window.__CLUBECAIXAO_TEST__.snapshot()
```

Isso ajuda a ver:

- cena atual
- transicoes de cena
- saves efetuados
- loads efetuados
- falhas internas marcadas pelo harness

## Limites Tecnicos Atuais

Esses testes rodam em ambiente headless com fallback grafico. Isso significa que parte da automacao atual foi desenhada para ser estavel, nao para reproduzir 100% do fluxo visual do jogador.

Exemplos:

- o teste de save/load valida persistencia via `DataManager`, nao via clique na UI customizada
- o teste de pausa valida a requisicao de pausa, nao a navegacao visual completa do menu

Isso e intencional nesta primeira etapa: a prioridade foi criar uma base automatizada confiavel.

## Proximos Passos Recomendados

Se voce quiser expandir a cobertura de forma segura, a ordem mais pragmatica e:

1. Criar testes de title button real: novo jogo e load.
2. Criar teste do fluxo visual da `Scene_VNLoad` e `Scene_VNSave`.
3. Adicionar helpers de common events no harness.
4. Parametrizar testes por mapas/eventos principais.
5. Adicionar testes de dialogo e escolhas VN reais.
6. Opcionalmente adicionar screenshot regression para title, pause e save/load.

## Comandos Rapidos

Instalar dependencias:

```sh
npm install
npx playwright install --with-deps
```

Rodar tudo:

```sh
npm run test:e2e
```

Rodar com UI visivel:

```sh
npm run test:e2e:headed
```

Abrir ambiente de teste manual (sem rodar specs automatizadas):

```sh
npm run test:e2e:manual
```

Esse comando:

1. sobe o servidor local na porta `8000`;
2. abre o Chromium via Playwright em `index.html?testMode=1&testCase=manual`;
3. nao executa nenhum teste automatizado;
4. encerra o servidor automaticamente quando voce fecha o navegador.

Rodar um arquivo especifico:

```sh
npx playwright test tests/e2e/boot.spec.js
```

## Estado Atual Esperado

No estado atual da implementacao, a expectativa e que esta execucao passe:

```sh
npx playwright test tests/e2e/boot.spec.js tests/e2e/save-load.spec.js tests/e2e/pause-menu.spec.js --reporter=list
```

Se isso parar de passar, o primeiro ponto a investigar e:

1. `js/main.js`
2. `js/plugins/automation-test-harness.js`
3. `playwright.config.js`
4. os artefatos em `test-results/`
