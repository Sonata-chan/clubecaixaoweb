const { test, expect } = require("@playwright/test");

test("VN choices UI settings and callback execution work", async ({ page }) => {
    await page.goto("/index.html?testMode=1&testCase=choices-ui");

    await page.waitForFunction(() => {
        const harness = window.__CLUBECAIXAO_TEST__;
        return harness && harness.ready && harness.sceneName === "Scene_Title";
    });

    const result = await page.evaluate(() => {
        const callbackState = { selected: null };

        $gameSystem.vnChoices = true;
        $gameMessage.clear();
        $gameMessage.setChoices(["\\b[2]Aceitar", "\\b[3]Recusar"], 0, 1);
        $gameMessage.setChoiceCallback((index) => {
            callbackState.selected = index;
        });

        if (!Window_ChoiceList.prototype.choice_background) {
            Window_ChoiceList.prototype.choice_background = [];
        }

        const rect = new Rectangle(0, 0, 700, 200);
        const choiceWindow = new Window_ChoiceList(rect);
        choiceWindow.setupVNChoices();
        choiceWindow.choice_background = [];

        // Simula lista preenchida para permitir chamadas de API da janela.
        choiceWindow._list = [
            { name: "Aceitar", enabled: true },
            { name: "Recusar", enabled: true }
        ];

        const lineHeight = choiceWindow.lineHeight();
        const itemHeight = choiceWindow.itemHeight();
        const converted = choiceWindow.convertEscapeCharacters("\\b[2]Aceitar", 0);
        const bgIndex = choiceWindow.choice_background[0];
        const windowOpacity = choiceWindow.opacity;

        $gameMessage.onChoice(1);

        return {
            lineHeight,
            itemHeight,
            converted,
            bgIndex,
            windowOpacity,
            selected: callbackState.selected
        };
    });

    // Parametro atual no projeto: Command Height = 70
    expect(result.lineHeight).toBe(70);
    expect(result.itemHeight).toBe(70);
    expect(result.bgIndex).toBe(2);
    expect(result.converted.includes("Aceitar")).toBe(true);
    expect(result.windowOpacity).toBe(0);
    expect(result.selected).toBe(1);
});
