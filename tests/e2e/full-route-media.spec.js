const { test, expect } = require("@playwright/test");

function isMediaUrl(url) {
    return /\/img\//i.test(url)
        || /\/audio\//i.test(url)
        || /\.(png|jpg|jpeg|webp|bmp|gif|ogg|m4a|mp3|wav)(\?|$)/i.test(url);
}

function isExpectedAbort(errorText) {
    return /ERR_ABORTED|aborted|AbortError/i.test(String(errorText || ""));
}

test("web full route loads image/audio assets until ending", async ({ page }) => {
    test.setTimeout(25 * 60 * 1000);

    const failedMediaRequests = [];
    const badMediaResponses = [];
    const loadedImageUrls = new Set();
    const loadedAudioUrls = new Set();
    const pageErrors = [];

    page.on("requestfailed", (request) => {
        const url = request.url();
        if (!isMediaUrl(url)) {
            return;
        }
        const failure = request.failure();
        const errorText = failure ? failure.errorText : "unknown";

        // Partial audio preload intentionally aborts non-SE fetches.
        if (isExpectedAbort(errorText) && /\/audio\//i.test(url)) {
            return;
        }

        failedMediaRequests.push({ url, errorText });
    });

    page.on("response", (response) => {
        const url = response.url();
        if (!isMediaUrl(url)) {
            return;
        }

        const status = response.status();
        if (status >= 400) {
            badMediaResponses.push({ url, status });
            return;
        }

        if (/\/img\//i.test(url) || /\.(png|jpg|jpeg|webp|bmp|gif)(\?|$)/i.test(url)) {
            loadedImageUrls.add(url);
        }
        if (/\/audio\//i.test(url) || /\.(ogg|m4a|mp3|wav)(\?|$)/i.test(url)) {
            loadedAudioUrls.add(url);
        }
    });

    page.on("pageerror", (error) => {
        pageErrors.push(error.message || String(error));
    });

    await page.goto("/index.html?testMode=1&testCase=full-route-media");

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return harness && harness.ready && harness.sceneName === "Scene_Title";
    }, { timeout: 30000 });

    await page.evaluate(() => {
        const scene = SceneManager._scene;
        if (scene && scene._vnButtons && scene._vnButtons[0] && scene._vnButtons[0]._callback) {
            scene._vnButtons[0]._callback();
        }
    });

    await page.click("#gameCanvas", { force: true }).catch(() => {});

    const startedAt = Date.now();
    const maxRouteDurationMs = 22 * 60 * 1000;
    let reachedEnding = false;
    let reachedMapAtLeastOnce = false;
    let lastState = null;

    for (let i = 0; i < 35000; i++) {
        await page.evaluate(() => {
            const scene = SceneManager._scene;

            if (window.Input && Input.virtualClick) {
                Input.virtualClick("ok");
            }

            const messageWindow = scene && scene._messageWindow;
            if (messageWindow) {
                messageWindow._waitCount = 0;
                messageWindow._showFast = true;
                messageWindow._lineShowFast = true;
                messageWindow.pause = false;
                if (messageWindow.pause && messageWindow.terminateMessage) {
                    messageWindow.terminateMessage();
                }
            }

            const choiceWindow = scene && scene._choiceListWindow;
            if (choiceWindow && choiceWindow.active && choiceWindow.processOk) {
                choiceWindow.select(0);
                choiceWindow.processOk();
            }

            const clearInterpreterWaits = (interpreter) => {
                if (!interpreter) {
                    return;
                }
                interpreter._waitCount = 0;
                interpreter._waitMode = "";
                if (interpreter._childInterpreter) {
                    clearInterpreterWaits(interpreter._childInterpreter);
                }
            };

            if (window.$gameMap && $gameMap._interpreter) {
                clearInterpreterWaits($gameMap._interpreter);
            }
            if (window.$gameTroop && $gameTroop._interpreter) {
                clearInterpreterWaits($gameTroop._interpreter);
            }

            if (scene && scene.constructor && scene.constructor.name === "Scene_Title") {
                if (scene._vnButtons && scene._vnButtons[0] && scene._vnButtons[0]._callback) {
                    scene._vnButtons[0]._callback();
                }
            }
        });

        if (i % 20 === 0) {
            await page.click("#gameCanvas", { force: true, position: { x: 640, y: 360 } }).catch(() => {});
            await page.click("#gameCanvas", { force: true, position: { x: 320, y: 360 } }).catch(() => {});
            await page.click("#gameCanvas", { force: true, position: { x: 960, y: 360 } }).catch(() => {});
        }

        await page.waitForTimeout(10);

        lastState = await page.evaluate(() => {
            const harness = window.__CLUBECAIXAO_TEST__;
            const sceneName = harness ? harness.sceneName : "";
            const switches = window.$gameSwitches;

            const endingFlags = {
                finalAlex: !!(switches && switches.value(22)),
                finalCarol: !!(switches && switches.value(23)),
                finalNi: !!(switches && switches.value(24)),
                finalSecreto: !!(switches && switches.value(25)),
                creditos: !!(switches && switches.value(29))
            };

            const anyEndingFlag =
                endingFlags.finalAlex
                || endingFlags.finalCarol
                || endingFlags.finalNi
                || endingFlags.finalSecreto
                || endingFlags.creditos;

            return {
                sceneName,
                anyEndingFlag,
                endingFlags,
                transitions: harness ? harness.transitions.length : 0,
                marks: harness ? harness.marks.length : 0,
                frameCount: window.Graphics ? Graphics.frameCount : 0
            };
        });

        if (lastState.sceneName === "Scene_Map") {
            reachedMapAtLeastOnce = true;
        }

        if (lastState.anyEndingFlag) {
            reachedEnding = true;
            break;
        }

        if (Date.now() - startedAt > maxRouteDurationMs) {
            break;
        }
    }

    expect(reachedMapAtLeastOnce, "A rota nao chegou a Scene_Map").toBe(true);
    expect(
        reachedEnding,
        `A rota nao chegou a um final/creditos no tempo limite. Ultimo estado: ${JSON.stringify(lastState)}`
    ).toBe(true);

    expect(
        loadedImageUrls.size,
        `Poucas imagens carregadas na rota completa (${loadedImageUrls.size})`
    ).toBeGreaterThan(20);

    expect(
        loadedAudioUrls.size,
        `Poucos audios carregados na rota completa (${loadedAudioUrls.size})`
    ).toBeGreaterThan(2);

    expect(pageErrors, `Erros de runtime: ${JSON.stringify(pageErrors)}`).toEqual([]);
    expect(
        failedMediaRequests,
        `Falhas de request de midia: ${JSON.stringify(failedMediaRequests)}`
    ).toEqual([]);
    expect(
        badMediaResponses,
        `Midias com status >= 400: ${JSON.stringify(badMediaResponses)}`
    ).toEqual([]);
});
