const { test, expect } = require("@playwright/test");

test("custom save/load UI routes and slot actions work", async ({ page }) => {
    await page.goto("/index.html?testMode=1&testCase=save-load-ui");

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return harness && harness.ready && harness.sceneName === "Scene_Title";
    });

    const result = await page.evaluate(async () => {
        const harness = window.__CLUBECAIXAO_TEST__;

        const waitUntil = (predicate, timeoutMs = 6000) => {
            const started = performance.now();
            return new Promise((resolve, reject) => {
                const tick = () => {
                    if (predicate()) {
                        resolve();
                        return;
                    }
                    if (performance.now() - started > timeoutMs) {
                        reject(new Error("waitUntil timeout"));
                        return;
                    }
                    requestAnimationFrame(tick);
                };
                tick();
            });
        };

        DataManager.setupNewGame();
        $gameVariables.setValue(21, 99);
        $gameParty.gainGold(321);

        $gameSystem.onBeforeSave();
        await DataManager.saveGame(1);

        window._vnPauseMenuActive = true;
        openVNSave();

        await waitUntil(() => harness.sceneName === "Scene_VNSave");

        const saveScene = SceneManager._scene;
        const saveSlots = saveScene && saveScene._slots ? saveScene._slots.length : 0;
        saveScene.onSlotClick(2);
        await waitUntil(() => harness.saveCalls.length >= 1 && DataManager.savefileExists(2));

        openVNLoad(true);
        await waitUntil(() => harness.sceneName === "Scene_VNLoad");

        const loadScene = SceneManager._scene;
        const loadSlots = loadScene && loadScene._slots ? loadScene._slots.length : 0;
        loadScene.onSlotClick(1);
        await waitUntil(() => harness.loadCalls.length >= 1);

        return {
            saveSlots,
            loadSlots,
            saveCalls: harness.saveCalls.length,
            loadCalls: harness.loadCalls.length,
            transitions: harness.transitions.slice(-10),
            failures: harness.failures.slice()
        };
    });

    expect(result.failures).toEqual([]);
    expect(result.saveSlots).toBeGreaterThan(0);
    expect(result.loadSlots).toBeGreaterThan(0);
    expect(result.saveCalls).toBeGreaterThanOrEqual(1);
    expect(result.loadCalls).toBeGreaterThanOrEqual(1);
});
