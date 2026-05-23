const { test, expect } = require("@playwright/test");

test("pause menu opens and returns to the map", async ({ page }) => {
    await page.goto("/index.html?testMode=1&testCase=pause-menu");

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return harness && harness.ready && harness.sceneName === "Scene_Title";
    });

    await page.evaluate(() => {
        window.__CLUBECAIXAO_TEST__.forceMapSceneForTests();
        window.__CLUBECAIXAO_TEST__.requestPauseMenu();
    });

    const pauseRequested = await page.evaluate(() => window._pauseMenuRequested === true);
    const after = await page.evaluate(() => window.__CLUBECAIXAO_TEST__.snapshot());

    expect(after.sceneName).toBe("Scene_Map");
    expect(pauseRequested).toBe(true);
    expect(after.failures).toEqual([]);
});