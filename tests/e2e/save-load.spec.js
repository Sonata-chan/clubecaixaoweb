const { test, expect } = require("@playwright/test");

test("save and load roundtrip preserves gameplay state", async ({ page }) => {
    await page.goto("/index.html?testMode=1&testCase=save-load");

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return harness && harness.ready && harness.sceneName === "Scene_Title";
    });

    const result = await page.evaluate(async () => {
        const harness = window.__CLUBECAIXAO_TEST__;

        DataManager.setupNewGame();
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));

        $gameVariables.setValue(13, 42);
        $gameParty.gainGold(250);
        $gameSystem.onBeforeSave();

        const saveOk = await DataManager.saveGame(1);

        $gameVariables.setValue(13, 7);
        $gameParty.gainGold(-50);

        const loadOk = await DataManager.loadGame(1);
        $gameSystem.onAfterLoad();

        return {
            saveOk,
            loadOk,
            variable: $gameVariables.value(13),
            gold: $gameParty.gold(),
            saveCalls: harness.saveCalls.length,
            loadCalls: harness.loadCalls.length,
            failures: harness.failures.slice()
        };
    });

    expect(result.failures).toEqual([]);
    expect(result.saveOk).toBe(0);
    expect(result.loadOk).toBe(0);
    expect(result.variable).toBe(42);
    expect(result.gold).toBe(250);
    expect(result.saveCalls).toBeGreaterThanOrEqual(1);
    expect(result.loadCalls).toBeGreaterThanOrEqual(1);
});