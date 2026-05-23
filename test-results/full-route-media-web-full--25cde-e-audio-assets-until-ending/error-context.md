# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-route-media.spec.js >> web full route loads image/audio assets until ending
- Location: tests/e2e/full-route-media.spec.js:13:1

# Error details

```
Error: page.evaluate: Target page, context or browser has been closed
```

# Test source

```ts
  42  |         }
  43  | 
  44  |         const status = response.status();
  45  |         if (status >= 400) {
  46  |             badMediaResponses.push({ url, status });
  47  |             return;
  48  |         }
  49  | 
  50  |         if (/\/img\//i.test(url) || /\.(png|jpg|jpeg|webp|bmp|gif)(\?|$)/i.test(url)) {
  51  |             loadedImageUrls.add(url);
  52  |         }
  53  |         if (/\/audio\//i.test(url) || /\.(ogg|m4a|mp3|wav)(\?|$)/i.test(url)) {
  54  |             loadedAudioUrls.add(url);
  55  |         }
  56  |     });
  57  | 
  58  |     page.on("pageerror", (error) => {
  59  |         pageErrors.push(error.message || String(error));
  60  |     });
  61  | 
  62  |     await page.goto("/index.html?testMode=1&testCase=full-route-media");
  63  | 
  64  |     await page.waitForFunction(() => {
  65  |         const harness = window.__CLUBECAIXAO_TEST__;
  66  |         return harness && harness.ready && harness.sceneName === "Scene_Title";
  67  |     }, { timeout: 30000 });
  68  | 
  69  |     await page.evaluate(() => {
  70  |         const scene = SceneManager._scene;
  71  |         if (scene && scene._vnButtons && scene._vnButtons[0] && scene._vnButtons[0]._callback) {
  72  |             scene._vnButtons[0]._callback();
  73  |         }
  74  |     });
  75  | 
  76  |     await page.click("#gameCanvas", { force: true }).catch(() => {});
  77  | 
  78  |     const startedAt = Date.now();
  79  |     const maxRouteDurationMs = 22 * 60 * 1000;
  80  |     let reachedEnding = false;
  81  |     let reachedMapAtLeastOnce = false;
  82  |     let lastState = null;
  83  | 
  84  |     for (let i = 0; i < 35000; i++) {
  85  |         await page.evaluate(() => {
  86  |             const scene = SceneManager._scene;
  87  | 
  88  |             if (window.Input && Input.virtualClick) {
  89  |                 Input.virtualClick("ok");
  90  |             }
  91  | 
  92  |             const messageWindow = scene && scene._messageWindow;
  93  |             if (messageWindow) {
  94  |                 messageWindow._waitCount = 0;
  95  |                 messageWindow._showFast = true;
  96  |                 messageWindow._lineShowFast = true;
  97  |                 messageWindow.pause = false;
  98  |                 if (messageWindow.pause && messageWindow.terminateMessage) {
  99  |                     messageWindow.terminateMessage();
  100 |                 }
  101 |             }
  102 | 
  103 |             const choiceWindow = scene && scene._choiceListWindow;
  104 |             if (choiceWindow && choiceWindow.active && choiceWindow.processOk) {
  105 |                 choiceWindow.select(0);
  106 |                 choiceWindow.processOk();
  107 |             }
  108 | 
  109 |             const clearInterpreterWaits = (interpreter) => {
  110 |                 if (!interpreter) {
  111 |                     return;
  112 |                 }
  113 |                 interpreter._waitCount = 0;
  114 |                 interpreter._waitMode = "";
  115 |                 if (interpreter._childInterpreter) {
  116 |                     clearInterpreterWaits(interpreter._childInterpreter);
  117 |                 }
  118 |             };
  119 | 
  120 |             if (window.$gameMap && $gameMap._interpreter) {
  121 |                 clearInterpreterWaits($gameMap._interpreter);
  122 |             }
  123 |             if (window.$gameTroop && $gameTroop._interpreter) {
  124 |                 clearInterpreterWaits($gameTroop._interpreter);
  125 |             }
  126 | 
  127 |             if (scene && scene.constructor && scene.constructor.name === "Scene_Title") {
  128 |                 if (scene._vnButtons && scene._vnButtons[0] && scene._vnButtons[0]._callback) {
  129 |                     scene._vnButtons[0]._callback();
  130 |                 }
  131 |             }
  132 |         });
  133 | 
  134 |         if (i % 20 === 0) {
  135 |             await page.click("#gameCanvas", { force: true, position: { x: 640, y: 360 } }).catch(() => {});
  136 |             await page.click("#gameCanvas", { force: true, position: { x: 320, y: 360 } }).catch(() => {});
  137 |             await page.click("#gameCanvas", { force: true, position: { x: 960, y: 360 } }).catch(() => {});
  138 |         }
  139 | 
  140 |         await page.waitForTimeout(10);
  141 | 
> 142 |         lastState = await page.evaluate(() => {
      |                                ^ Error: page.evaluate: Target page, context or browser has been closed
  143 |             const harness = window.__CLUBECAIXAO_TEST__;
  144 |             const sceneName = harness ? harness.sceneName : "";
  145 |             const switches = window.$gameSwitches;
  146 | 
  147 |             const endingFlags = {
  148 |                 finalAlex: !!(switches && switches.value(22)),
  149 |                 finalCarol: !!(switches && switches.value(23)),
  150 |                 finalNi: !!(switches && switches.value(24)),
  151 |                 finalSecreto: !!(switches && switches.value(25)),
  152 |                 creditos: !!(switches && switches.value(29))
  153 |             };
  154 | 
  155 |             const anyEndingFlag =
  156 |                 endingFlags.finalAlex
  157 |                 || endingFlags.finalCarol
  158 |                 || endingFlags.finalNi
  159 |                 || endingFlags.finalSecreto
  160 |                 || endingFlags.creditos;
  161 | 
  162 |             return {
  163 |                 sceneName,
  164 |                 anyEndingFlag,
  165 |                 endingFlags,
  166 |                 transitions: harness ? harness.transitions.length : 0,
  167 |                 marks: harness ? harness.marks.length : 0,
  168 |                 frameCount: window.Graphics ? Graphics.frameCount : 0
  169 |             };
  170 |         });
  171 | 
  172 |         if (lastState.sceneName === "Scene_Map") {
  173 |             reachedMapAtLeastOnce = true;
  174 |         }
  175 | 
  176 |         if (lastState.anyEndingFlag) {
  177 |             reachedEnding = true;
  178 |             break;
  179 |         }
  180 | 
  181 |         if (Date.now() - startedAt > maxRouteDurationMs) {
  182 |             break;
  183 |         }
  184 |     }
  185 | 
  186 |     expect(reachedMapAtLeastOnce, "A rota nao chegou a Scene_Map").toBe(true);
  187 |     expect(
  188 |         reachedEnding,
  189 |         `A rota nao chegou a um final/creditos no tempo limite. Ultimo estado: ${JSON.stringify(lastState)}`
  190 |     ).toBe(true);
  191 | 
  192 |     expect(
  193 |         loadedImageUrls.size,
  194 |         `Poucas imagens carregadas na rota completa (${loadedImageUrls.size})`
  195 |     ).toBeGreaterThan(20);
  196 | 
  197 |     expect(
  198 |         loadedAudioUrls.size,
  199 |         `Poucos audios carregados na rota completa (${loadedAudioUrls.size})`
  200 |     ).toBeGreaterThan(2);
  201 | 
  202 |     expect(pageErrors, `Erros de runtime: ${JSON.stringify(pageErrors)}`).toEqual([]);
  203 |     expect(
  204 |         failedMediaRequests,
  205 |         `Falhas de request de midia: ${JSON.stringify(failedMediaRequests)}`
  206 |     ).toEqual([]);
  207 |     expect(
  208 |         badMediaResponses,
  209 |         `Midias com status >= 400: ${JSON.stringify(badMediaResponses)}`
  210 |     ).toEqual([]);
  211 | });
  212 | 
```