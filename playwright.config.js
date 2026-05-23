const { defineConfig } = require("@playwright/test");

const useSwiftShader = process.env.PW_USE_SWIFTSHADER !== "0";

const chromiumArgs = [
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows"
];

if (useSwiftShader) {
    chromiumArgs.push("--use-gl=swiftshader", "--enable-unsafe-swiftshader");
}

module.exports = defineConfig({
    testDir: "./tests/e2e",
    workers: 1,
    fullyParallel: false,
    timeout: 60000,
    expect: {
        timeout: 10000
    },
    use: {
        headless: true,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        baseURL: "http://127.0.0.1:8000",
        launchOptions: {
            args: chromiumArgs
        },
        viewport: {
            width: 816,
            height: 624
        }
    },
    webServer: {
        command: "python3 -m http.server 8000 --bind 127.0.0.1 --directory .",
        url: "http://127.0.0.1:8000/index.html",
        reuseExistingServer: true,
        timeout: 120000
    }
});