/*:
 * @target MZ
 * @plugindesc Adiciona um menu de pausa customizável.
 *
 * @param menuBackground
 * @text Fundo do Menu
 * @type file
 * @dir img/pictures/
 * @default pause_bg
 *
 * @param buttonBackground
 * @text Fundo dos Botões
 * @type file
 * @dir img/pictures/
 * @default btn_bg
 * 
 * @param buttonHoverBackground
 * @text Fundo dos Botões (Hover)
 * @type file
 * @dir img/pictures/
 * @default btn_bg_hover
 *
 * @param fontSize
 * @text Tamanho da Fonte
 * @type number
 * @default 26
 *
 * @param fontFace
 * @text Fonte
 * @type string
 * @default rmmz-mainfont
 *
 * @param buttonSpacing
 * @text Espaçamento dos Botões
 * @type number
 * @default 70
 *
 * @param pauseTitle
 * @text Texto do Título
 * @type string
 * @default PAUSADO
 *
 * @param titleFontSize
 * @text Tamanho da Fonte do Título
 * @type number
 * @default 48
 *
 * @param titleOffsetY
 * @text Offset Vertical do Título
 * @type number
 * @default -260
 * 
 * @param pauseButtonImage
 * @text Imagem do Botão Pause
 * @type file
 * @dir img/pictures/
 * @default botao_menu
 *
 * @param pauseButtonHoverImage
 * @text Hover do Botão Pause
 * @type file
 * @dir img/pictures/
 * @default botao_menu_hover
 *
 * @param pauseButtonX
 * @text Botão X
 * @type number
 * @default 744
 *
 * @param pauseButtonY
 * @text Botão Y
 * @type number
 * @default 24
 * 
 * @param pauseButtonSwitch
 * @text Switch do Botão
 * @type switch
 * @default 1
 */

(() => {

    const pluginName =
        document.currentScript.src
        .match(/([^\/]+)\.js$/)[1];

    const params =
        PluginManager.parameters(pluginName);

    const MENU_BACKGROUND =
        String(params.menuBackground || "pause_bg");

    const BUTTON_BACKGROUND =
        String(params.buttonBackground || "btn_bg");

    const BUTTON_HOVER_BACKGROUND =
        String(params.buttonHoverBackground || "btn_bg_hover");

    const FONT_SIZE =
        Number(params.fontSize || 26);

    const FONT_FACE =
        String(params.fontFace || "rmmz-mainfont");

    const BUTTON_SPACING =
        Number(params.buttonSpacing || 70);

    const PAUSE_TITLE =
        String(params.pauseTitle || "PAUSADO");

    const TITLE_FONT_SIZE =
        Number(params.titleFontSize || 48);

    const TITLE_OFFSET_Y =
        Number(params.titleOffsetY || -260);

    const PAUSE_BUTTON_IMAGE =
        String(params.pauseButtonImage);

    const PAUSE_BUTTON_HOVER =
        String(params.pauseButtonHoverImage);

    const PAUSE_BUTTON_X =
        Number(params.pauseButtonX);

    const PAUSE_BUTTON_Y =
        Number(params.pauseButtonY);

    const PAUSE_BUTTON_SWITCH =
        Number(params.pauseButtonSwitch);

    AudioManager._muted =
        AudioManager._muted || false;

    AudioManager._savedMasterVolume =
        AudioManager._savedMasterVolume ?? 1;

    function applyMutedState() {

        if (AudioManager._muted) {
            WebAudio.setMasterVolume(0);
        } else {
            WebAudio.setMasterVolume(
                AudioManager._savedMasterVolume ?? 1
            );
        }
    }

    const _Game_System_onBeforeSave =
        Game_System.prototype.onBeforeSave;

    Game_System.prototype.onBeforeSave =
    function() {

        _Game_System_onBeforeSave.call(this);

        this._vnMuted =
            !!AudioManager._muted;

        this._vnSavedMasterVolume =
            AudioManager._savedMasterVolume ?? 1;
    };

    const _Game_System_onAfterLoad =
        Game_System.prototype.onAfterLoad;

    Game_System.prototype.onAfterLoad =
    function() {

        _Game_System_onAfterLoad.call(this);

        AudioManager._muted =
            !!this._vnMuted;

        AudioManager._savedMasterVolume =
            this._vnSavedMasterVolume ?? 1;

        applyMutedState();
    };

    window._pauseMenuRequested = false;
    window._vnPauseMenuActive = false;

    window.openCustomPauseMenu = function() {

        if (window._pauseMenuRequested) {
            return;
        }

        if (!(SceneManager._scene instanceof Scene_Map)) {
            return;
        }

        window._pauseMenuRequested = true;
    };

    function Scene_CustomPause() {
        this.initialize(...arguments);
    }

    Scene_CustomPause.prototype =
        Object.create(Scene_MenuBase.prototype);

    Scene_CustomPause.prototype.constructor =
        Scene_CustomPause;

    Scene_CustomPause.prototype.create =
    function() {

        Scene_MenuBase.prototype.create.call(this);

        TouchInput.clear();
        Input.clear();

        this.createBackground();
        this.createTitle();
        this.createButtons();
    };

    Scene_CustomPause.prototype.start =
    function() {

        Scene_MenuBase.prototype.start.call(this);

        window._vnPauseMenuActive = true;
    };

    Scene_CustomPause.prototype.terminate =
    function() {

        Scene_MenuBase.prototype.terminate.call(this);

        window._vnPauseMenuActive = false;
    };

    Scene_CustomPause.prototype.createBackground =
    function() {

        this._backgroundSprite = new Sprite(
            ImageManager.loadPicture(MENU_BACKGROUND)
        );

        this.addChild(this._backgroundSprite);
    };

    Scene_CustomPause.prototype.createTitle =
    function() {

        const bitmap =
            new Bitmap(800, 100);

        bitmap.fontFace = FONT_FACE;
        bitmap.fontSize = TITLE_FONT_SIZE;

        bitmap.drawText(
            PAUSE_TITLE,
            0,
            0,
            800,
            100,
            "center"
        );

        const sprite =
            new Sprite(bitmap);

        sprite.x =
            (Graphics.boxWidth / 2) - 400;

        sprite.y =
            (Graphics.boxHeight / 2)
            + TITLE_OFFSET_Y;

        this.addChild(sprite);
    };

    Scene_CustomPause.prototype.createButton =
    function(text, x, y, callback) {

        const container =
            new Sprite();

        container.x = x;
        container.y = y;

        const bg =
            new Sprite(
                ImageManager.loadPicture(
                    BUTTON_BACKGROUND
                )
            );

        bg.anchor.x = 0.5;
        bg.anchor.y = 0.5;

        container.addChild(bg);

        const hover =
            new Sprite(
                ImageManager.loadPicture(
                    BUTTON_HOVER_BACKGROUND
                )
            );

        hover.anchor.x = 0.5;
        hover.anchor.y = 0.5;

        hover.opacity = 0;

        container.addChild(hover);

        const bitmap =
            new Bitmap(500, 80);

        bitmap.fontFace =
            FONT_FACE;

        bitmap.fontSize =
            FONT_SIZE;

        bitmap.textColor =
            "#ffffff";

        bitmap.drawText(
            text,
            0,
            0,
            500,
            80,
            "center"
        );

        const label =
            new Sprite(bitmap);

        label.anchor.x = 0.5;
        label.anchor.y = 0.5;

        container.addChild(label);

        container._callback =
            callback;

        container._bg =
            bg;

        container._hover =
            hover;

        this.addChild(container);

        this._buttons.push(container);
    };

    Scene_CustomPause.prototype.createButtons =
    function() {

        this._buttons = [];

        const centerX =
            Graphics.boxWidth / 2;

        const centerY =
            Graphics.boxHeight / 2;

        const startY =
            centerY - (BUTTON_SPACING * 1.5);

        const buttons = [

            {
                text: "Salvar Jogo",
                callback:
                    this.commandSave.bind(this)
            },

            {
                text: "Carregar Jogo",
                callback:
                    this.commandLoad.bind(this)
            },

            {
                text:
                    AudioManager._muted
                        ? "Ativar Sons"
                        : "Desativar Sons",

                callback:
                    this.commandSound.bind(this)
            },

            {
                text: "Voltar ao Jogo",
                callback:
                    this.commandResume.bind(this)
            },

            {
                text: "Sair",
                callback:
                    this.commandTitle.bind(this)
            }
        ];

        for (let i = 0; i < buttons.length; i++) {

            const data = buttons[i];

            this.createButton(
                data.text,
                centerX,
                startY + (i * BUTTON_SPACING),
                data.callback
            );
        }
    };

    Scene_CustomPause.prototype.update =
    function() {

        Scene_MenuBase.prototype.update.call(this);

        this.updateButtons();
    };

    Scene_CustomPause.prototype.updateButtons =
    function() {

        if (!this._buttons) {
            return;
        }

        const mx = TouchInput.x;
        const my = TouchInput.y;

        for (const button of this._buttons) {

            const bg = button._bg;

            const left =
                button.x - bg.width / 2;

            const right =
                button.x + bg.width / 2;

            const top =
                button.y - bg.height / 2;

            const bottom =
                button.y + bg.height / 2;

            const hovered =
                mx >= left &&
                mx <= right &&
                my >= top &&
                my <= bottom;

            button._hover.opacity =
                hovered ? 255 : 0;

            button.scale.x =
                hovered ? 1.05 : 1;

            button.scale.y =
                hovered ? 1.05 : 1;

            if (
                hovered &&
                TouchInput.isTriggered()
            ) {

                button._callback();

                return;
            }
        }
    };

    Scene_CustomPause.prototype.commandSave =
    function() {

        openVNSave();
    };

    Scene_CustomPause.prototype.commandLoad =
    function() {

        openVNLoad(false);
    };

    Scene_CustomPause.prototype.commandResume =
    function() {

        TouchInput.clear();
        Input.clear();

        SceneManager.pop();
    };

    Scene_CustomPause.prototype.commandSound =
function() {

    if (!AudioManager._muted) {

        AudioManager._savedMasterVolume =
            WebAudio._masterVolume ?? 1;

        AudioManager._muted = true;

    } else {

        AudioManager._muted = false;
    }

    applyMutedState();

    //==========================================
    // REMOVE BOTÕES ANTIGOS
    //==========================================

    for (const button of this._buttons) {

        this.removeChild(button);
    }

    this._buttons = [];

    //==========================================
    // RECRIA BOTÕES
    //==========================================

    this.createButtons();
};

    Scene_CustomPause.prototype.commandTitle =
    function() {

        TouchInput.clear();
        Input.clear();

        AudioManager.stopBgm();
        AudioManager.stopBgs();
        AudioManager.stopMe();

        window._pauseMenuRequested = false;
        window.vnPauseScreenshot = null;
        window._vnPauseMenuActive = false;
        window._vnFileOpenOrigin = null;
        window._vnTitleInputBlockFrames = 24;

        SceneManager.goto(Scene_Title);
    };

    const _Scene_Map_update =
    Scene_Map.prototype.update;

    Scene_Map.prototype.update =
    function() {

    _Scene_Map_update.call(this);

    if (
        window._pauseMenuRequested &&
        !SceneManager.isSceneChanging()
    ) {

        window._pauseMenuRequested = false;

        window.vnPauseScreenshot =
            SceneManager.snap();

        SceneManager.push(
            Scene_CustomPause
        );
    }

    this.updatePauseMenuButton();
    };

    const _Game_Map_updateInterpreter =
        Game_Map.prototype.updateInterpreter;

    Game_Map.prototype.updateInterpreter =
    function() {

        if (
            SceneManager._scene instanceof
            Scene_CustomPause
        ) {
            return;
        }

        _Game_Map_updateInterpreter.call(this);
    };

    const _VNPause_CreateAllWindows =
        Scene_Map.prototype.createAllWindows;

    Scene_Map.prototype.createAllWindows =
    function() {

        _VNPause_CreateAllWindows.call(this);

        this.createPauseMenuButton();
    };

    Scene_Map.prototype.createPauseMenuButton =
    function() {

        this._pauseButtonContainer =
            new Sprite();

        this._pauseButtonContainer.x =
            PAUSE_BUTTON_X;

        this._pauseButtonContainer.y =
            PAUSE_BUTTON_Y;

        const normal =
            new Sprite(
                ImageManager.loadPicture(
                    PAUSE_BUTTON_IMAGE
                )
            );

        this._pauseButtonContainer
            .addChild(normal);

        const hover =
            new Sprite(
                ImageManager.loadPicture(
                    PAUSE_BUTTON_HOVER
                )
            );

        hover.opacity = 0;

        this._pauseButtonContainer
            .addChild(hover);

        this._pauseHoverSprite =
            hover;

        this.addChild(
            this._pauseButtonContainer
        );
    };

    Scene_Map.prototype.updatePauseMenuButton =
    function() {

        if (!this._pauseButtonContainer) {
            return;
        }

        const enabled =
        $gameSwitches.value(
            PAUSE_BUTTON_SWITCH
        );

        if (enabled) {

            this._pauseButtonContainer.opacity += 20;

        } else {

            this._pauseButtonContainer.opacity -= 20;
        }

        this._pauseButtonContainer.opacity =
        this._pauseButtonContainer.opacity
        .clamp(0, 255);

        if (
            this._pauseButtonContainer.opacity <= 0
        ) {
            return;
        }

        const sprite =
            this._pauseButtonContainer;

        const width =
            sprite.getBounds().width;

        const height =
            sprite.getBounds().height;

        const hovered =
            TouchInput.x >= sprite.x &&
            TouchInput.x <= sprite.x + width &&
            TouchInput.y >= sprite.y &&
            TouchInput.y <= sprite.y + height;

        this._pauseHoverSprite.opacity =
            hovered ? 255 : 0;

        sprite.scale.x =
            hovered ? 1.03 : 1;

        sprite.scale.y =
            hovered ? 1.03 : 1;

        if (
            hovered &&
            TouchInput.isTriggered()
        ) {

            openCustomPauseMenu();
        }
    };

})();
