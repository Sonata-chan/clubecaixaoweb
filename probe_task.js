const { chromium } = require("@playwright/test");
(async () => {
    const browser = await chromium.launch({ args: ["--enable-webgl", "--use-gl=swiftshader"] });
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:8003/index.html?testMode=1&testCase=boot");
    await page.waitForTimeout(15000);
    const data = await page.evaluate(() => ({
        active: typeof SceneManager !== "undefined" && SceneManager._scene !== null,
        ready: typeof SceneManager !== "undefined" && SceneManager.isReady(),
        sceneName: typeof SceneManager !== "undefined" && SceneManager._scene ? SceneManager._scene.constructor.name : "null",
        stackSize: typeof SceneManager !== "undefined" && SceneManager._stack ? SceneManager._stack.length : 0,
        marksCount: window.performance ? window.performance.getEntriesByType("mark").length : 0,
        graphicsError: !!document.getElementById("errorPrinter")
    }));
    console.log("PROBE_RESULT:" + JSON.stringify(data));
    await browser.close();
})();
