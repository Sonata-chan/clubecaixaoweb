const { test, expect } = require("@playwright/test");

function isImageUrl(url) {
    return /\.(png|jpg|jpeg|webp|bmp|gif)(\?|$)/i.test(url) || /\/img\//i.test(url);
}

test("web build renders images without black screen on core routes", async ({ page }) => {
    const failedImageRequests = [];
    const badImageResponses = [];

    page.on("requestfailed", (request) => {
        const url = request.url();
        if (isImageUrl(url)) {
            failedImageRequests.push({
                url,
                errorText: request.failure() ? request.failure().errorText : "unknown"
            });
        }
    });

    page.on("response", (response) => {
        const request = response.request();
        const url = request.url();
        if (isImageUrl(url) && response.status() >= 400) {
            badImageResponses.push({
                url,
                status: response.status()
            });
        }
    });

    await page.goto("/index.html?testMode=1&testCase=web-build-render");

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return harness && harness.ready && harness.sceneName === "Scene_Title";
    });

    async function assertCanvasNotBlack(routeName) {
        const readStats = async () => page.evaluate(() => {
            function computeBlackRatioFromRGBA(data, sampleWidth, sampleHeight) {
                const stepX = Math.max(1, Math.floor(sampleWidth / 120));
                const stepY = Math.max(1, Math.floor(sampleHeight / 90));
                let totalSamples = 0;
                let brightSamples = 0;

                for (let y = 0; y < sampleHeight; y += stepY) {
                    for (let x = 0; x < sampleWidth; x += stepX) {
                        const index = (y * sampleWidth + x) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        const a = data[index + 3];
                        totalSamples++;

                        if (a > 0 && (r > 18 || g > 18 || b > 18)) {
                            brightSamples++;
                        }
                    }
                }

                const blackRatio = totalSamples > 0
                    ? (totalSamples - brightSamples) / totalSamples
                    : 1;

                return {
                    totalSamples,
                    brightSamples,
                    blackRatio
                };
            }

            const pixiApp = window.Graphics && Graphics.app;
            if (pixiApp && pixiApp.renderer && pixiApp.stage) {
                const renderer = pixiApp.renderer;
                const width = renderer.width || renderer.screen.width;
                const height = renderer.height || renderer.screen.height;
                const pixelCount = Number(width) * Number(height);
                const reasonablePixelCount = Number.isFinite(pixelCount) && pixelCount > 0 && pixelCount <= 8000000;
                if (width > 0 && height > 0 && reasonablePixelCount) {
                    const extract = renderer.plugins && renderer.plugins.extract;
                    if (extract && typeof extract.pixels === "function") {
                        try {
                            const rgba = extract.pixels(pixiApp.stage);
                            const ratioPixi = computeBlackRatioFromRGBA(rgba, width, height);
                            return {
                                hasCanvas: true,
                                hasContext: true,
                                contextType: "pixi-extract",
                                width,
                                height,
                                ...ratioPixi
                            };
                        } catch (error) {
                            // Falls through to canvas/context fallback when PIXI extraction is unstable.
                        }
                    }
                }
            }

            const canvas = document.getElementById("gameCanvas");
            if (!canvas) {
                return { hasCanvas: false };
            }

            const width = canvas.width;
            const height = canvas.height;
            if (width <= 0 || height <= 0) {
                return {
                    hasCanvas: true,
                    hasContext: true,
                    width,
                    height,
                    totalSamples: 0,
                    brightSamples: 0,
                    blackRatio: 1
                };
            }

            const ctx2d = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx2d) {
                const imageData = ctx2d.getImageData(0, 0, width, height).data;
                const ratio2d = computeBlackRatioFromRGBA(imageData, width, height);
                return {
                    hasCanvas: true,
                    hasContext: true,
                    contextType: "2d",
                    width,
                    height,
                    ...ratio2d
                };
            }

            const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true })
                || canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
            if (gl) {
                const pixels = new Uint8Array(width * height * 4);
                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                const ratioGl = computeBlackRatioFromRGBA(pixels, width, height);
                return {
                    hasCanvas: true,
                    hasContext: true,
                    contextType: "webgl",
                    width,
                    height,
                    ...ratioGl
                };
            }

            const scene = window.SceneManager && SceneManager._scene;
            const spriteset = scene && scene._spriteset;
            return {
                hasCanvas: true,
                hasContext: false,
                contextType: "unreadable",
                sceneName: scene ? scene.constructor.name : "",
                hasSpriteset: !!spriteset,
                spritesetChildren: spriteset && spriteset.children ? spriteset.children.length : 0,
                hasCharacterSprites: !!(spriteset && spriteset._characterSprites && spriteset._characterSprites.length > 0),
                hasTilemap: !!(spriteset && spriteset._tilemap)
            };
        });

        let stats = null;
        for (let attempt = 0; attempt < 20; attempt++) {
            stats = await readStats();
            if (stats && stats.hasCanvas && stats.hasContext && stats.totalSamples > 0) {
                break;
            }
            await page.waitForTimeout(300);
        }

        expect(stats.hasCanvas, `Canvas ausente na rota ${routeName}`).toBe(true);
        if (stats.hasContext) {
            expect(stats.width, `Largura invalida do canvas na rota ${routeName}`).toBeGreaterThan(0);
            expect(stats.height, `Altura invalida do canvas na rota ${routeName}`).toBeGreaterThan(0);
            expect(
                stats.blackRatio,
                `Tela quase preta na rota ${routeName}. blackRatio=${stats.blackRatio}`
            ).toBeLessThan(0.985);
            return;
        }

        expect(
            stats.hasSpriteset,
            `Sem spriteset renderizado na rota ${routeName} quando o buffer nao esta legivel`
        ).toBe(true);
        expect(
            stats.spritesetChildren,
            `Spriteset vazio na rota ${routeName} quando o buffer nao esta legivel`
        ).toBeGreaterThan(0);
    }

    await page.waitForTimeout(1200);
    await assertCanvasNotBlack("title");

    await page.evaluate(() => {
        const scene = SceneManager._scene;
        if (scene && scene._vnButtons && scene._vnButtons[0] && scene._vnButtons[0]._callback) {
            scene._vnButtons[0]._callback();
        }
    });

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return harness && harness.sceneName === "Scene_Map";
    }, { timeout: 30000 });

    await page.waitForTimeout(2800);
    await assertCanvasNotBlack("map");

    await page.evaluate(() => {
        if (window.__CLUBECAIXAO_TEST__ && window.__CLUBECAIXAO_TEST__.requestPauseMenu) {
            window.__CLUBECAIXAO_TEST__.requestPauseMenu();
        }
    });

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return (
            (harness && harness.sceneName === "Scene_CustomPause") ||
            window._vnPauseMenuActive === true
        );
    }, { timeout: 15000 });

    await page.waitForTimeout(600);
    await assertCanvasNotBlack("pause");

    await page.evaluate(() => {
        if (typeof openVNSave === "function") {
            openVNSave();
        }
    });

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return harness && harness.sceneName === "Scene_VNSave";
    }, { timeout: 15000 });

    await page.waitForTimeout(600);
    await assertCanvasNotBlack("save");

    await page.evaluate(() => {
        SceneManager.pop();
        if (typeof openVNLoad === "function") {
            openVNLoad(false);
        }
    });

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return harness && harness.sceneName === "Scene_VNLoad";
    }, { timeout: 15000 });

    await page.waitForTimeout(600);
    await assertCanvasNotBlack("load");

    const harnessState = await page.evaluate(() => window.__CLUBECAIXAO_TEST__.snapshot());

    expect(harnessState.failures).toEqual([]);
    expect(failedImageRequests, `Falhas de request de imagem: ${JSON.stringify(failedImageRequests)}`).toEqual([]);
    expect(badImageResponses, `Imagens com status >= 400: ${JSON.stringify(badImageResponses)}`).toEqual([]);
});
