const { test, expect } = require("@playwright/test");

test("boot reaches custom title screen", async ({ page }) => {
    const url = "/index.html?testMode=1&testCase=boot";
    const consoleMessages = [];
    const pageErrors = [];

    page.on("console", (message) => {
        consoleMessages.push(`${message.type()}: ${message.text()}`);
    });

    page.on("pageerror", (error) => {
        pageErrors.push(error.message);
    });

    await page.goto(url);

    try {
        await page.waitForFunction(() => {
            const harness = window.__CLUBECAIXAO_TEST__;
            return harness && harness.ready && harness.sceneName === "Scene_Title";
        }, { timeout: 30000 });
    } catch (error) {
        const state = await page.evaluate(() => {
            const harness = window.__CLUBECAIXAO_TEST__;
            return harness ? harness.snapshot() : null;
        }).catch(() => null);
        const bodyText = await page.locator("body").innerText().catch(() => "");

        throw new Error([
            error.message,
            `console: ${consoleMessages.join(" | ") || "<none>"}`,
            `pageerrors: ${pageErrors.join(" | ") || "<none>"}`,
            `state: ${JSON.stringify(state)}`,
            `body: ${bodyText || "<empty>"}`
        ].join("\n"));
    }

    const state = await page.evaluate(() => window.__CLUBECAIXAO_TEST__.snapshot());

    expect(state.active).toBe(true);
    expect(state.currentTestCase).toBe("boot");
    expect(state.sceneName).toBe("Scene_Title");
    expect(state.ready).toBe(true);
    expect(state.marks.some((mark) => mark.name === "title-ready")).toBe(true);
});