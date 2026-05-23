/*:
 * @target MZ
 * @plugindesc Tela inicial customizada estilo VN para RPG Maker MZ
 *
 * @param backgroundImage
 * @text Imagem de Fundo
 * @type file
 * @dir img/pictures/
 * @default title_bg
 *
 * @param newGameImage
 * @text Botão Novo Jogo
 * @type file
 * @dir img/pictures/
 * @default btn_newgame
 *
 * @param newGameHoverImage
 * @text Hover Novo Jogo
 * @type file
 * @dir img/pictures/
 * @default btn_newgame_hover
 *
 * @param loadGameImage
 * @text Botão Carregar
 * @type file
 * @dir img/pictures/
 * @default btn_load
 *
 * @param loadGameHoverImage
 * @text Hover Carregar
 * @type file
 * @dir img/pictures/
 * @default btn_load_hover
 *
 * @param newGameX
 * @text X Novo Jogo
 * @type number
 * @default 280
 *
 * @param newGameY
 * @text Y Novo Jogo
 * @type number
 * @default 500
 *
 * @param loadGameX
 * @text X Carregar
 * @type number
 * @default 280
 *
 * @param loadGameY
 * @text Y Carregar
 * @type number
 * @default 620
 */

(() => {

    //==================================================
    // PARAMS
    //==================================================

    const pluginName =
        document.currentScript.src
        .match(/([^\/]+)\.js$/)[1];

    const params =
        PluginManager.parameters(pluginName);

    const BACKGROUND =
        String(params.backgroundImage);

    const NEWGAME_IMAGE =
        String(params.newGameImage);

    const NEWGAME_HOVER =
        String(params.newGameHoverImage);

    const LOAD_IMAGE =
        String(params.loadGameImage);

    const LOAD_HOVER =
        String(params.loadGameHoverImage);

    const NEWGAME_X =
        Number(params.newGameX);

    const NEWGAME_Y =
        Number(params.newGameY);

    const LOAD_X =
        Number(params.loadGameX);

    const LOAD_Y =
        Number(params.loadGameY);

    const TITLE_INPUT_BLOCK_FRAMES = 18;

    //==================================================
    // CREATE
    //==================================================

    const _Scene_Title_create =
        Scene_Title.prototype.create;

    Scene_Title.prototype.create =
    function() {

    _Scene_Title_create.call(this);

    //==============================================
    // REMOVE VISUAIS PADRÃO
    //==============================================

    if (this._backSprite1) {
        this._backSprite1.visible = false;
    }

    if (this._backSprite2) {
        this._backSprite2.visible = false;
    }

    if (this._foregroundSprite) {
        this._foregroundSprite.visible = false;
    }

    //==============================================
    // FUNDO CUSTOM
    //==============================================

    this.createCustomBackground();

    //==============================================
    // BOTÕES CUSTOM
    //==============================================

    this.createVNButtons();

    // Evita clique herdado da cena anterior ao entrar na title.
    this._vnInputBlockFrames =
        Number(window._vnTitleInputBlockFrames || TITLE_INPUT_BLOCK_FRAMES);

    this._vnInputArmed = false;

    window._vnTitleInputBlockFrames = 0;

    TouchInput.clear();
    Input.clear();

    if (this._commandWindow) {

        this._commandWindow.deactivate();
        this._commandWindow.close();
        this._commandWindow.hide();
    }
    
    };

    Scene_Title.prototype.start =
        function() {

        Scene_Base.prototype.start.call(this);

        SceneManager.clearStack();
        this.adjustBackground();
        this.playTitleMusic();
        this.startFadeIn(this.fadeSpeed(), false);

        TouchInput.clear();
        Input.clear();
    };

    //==================================================
    // DISABLE DEFAULT TITLE UPDATES
    //==================================================

    Scene_Title.prototype.isBusy =
        function() {

        return false;
    };

    //==================================================
    // BACKGROUND
    //==================================================

    Scene_Title.prototype.createCustomBackground =
        function() {

        this._vnBackground =
            new Sprite(
                ImageManager.loadPicture(
                    BACKGROUND
                )
            );

        this.addChild(
            this._vnBackground
        );
    };

    //==================================================
    // BUTTONS
    //==================================================

    Scene_Title.prototype.createVNButtons =
        function() {

        this._vnButtons = [];

        //==============================================
        // NEW GAME
        //==============================================

        this.createVNButton({

            x: NEWGAME_X,
            y: NEWGAME_Y,

            normal:
                NEWGAME_IMAGE,

            hover:
                NEWGAME_HOVER,

            callback: () => {

                DataManager.setupNewGame();

                this.fadeOutAll();

                SceneManager.goto(
                    Scene_Map
                );
            }
        });

        //==============================================
        // LOAD
        //==============================================

        this.createVNButton({

            x: LOAD_X,
            y: LOAD_Y,

            normal:
                LOAD_IMAGE,

            hover:
                LOAD_HOVER,

            callback: () => {

                openVNLoad(true);

            }
        });
    };

    //==================================================
    // CREATE BUTTON
    //==================================================

    Scene_Title.prototype.createVNButton =
        function(data) {

        const container =
            new Sprite();

        container.x = data.x;
        container.y = data.y;

        //==============================================
        // NORMAL
        //==============================================

        const normal =
            new Sprite(
                ImageManager.loadPicture(
                    data.normal
                )
            );

        container.addChild(normal);

        //==============================================
        // HOVER
        //==============================================

        const hover =
            new Sprite(
                ImageManager.loadPicture(
                    data.hover
                )
            );

        hover.opacity = 0;

        container.addChild(hover);

        //==============================================
        // DATA
        //==============================================

        container._hoverSprite =
            hover;

        container._callback =
            data.callback;

        this.addChild(container);

        this._vnButtons.push(container);
    };

    //==================================================
    // UPDATE
    //==================================================

    const _Scene_Title_update =
        Scene_Title.prototype.update;

    Scene_Title.prototype.update =
        function() {

        Scene_Base.prototype.update.call(this);

        if (this._vnInputBlockFrames > 0) {
            this._vnInputBlockFrames--;
        }

        this.updateVNButtons();
    };

    Scene_Title.prototype.canProcessVNClick =
        function() {

        if (this._vnInputBlockFrames > 0) {
            return false;
        }

        if (TouchInput.isPressed()) {
            return false;
        }

        if (!this._vnInputArmed) {

            this._vnInputArmed = true;

            return false;
        }

        return true;
    };

    //==================================================
    // BUTTON UPDATE
    //==================================================

    Scene_Title.prototype.updateVNButtons =
        function() {

        if (!this._vnButtons) {
            return;
        }

        const canClick =
            this.canProcessVNClick();

        const mx =
            TouchInput.x;

        const my =
            TouchInput.y;

        for (const button of this._vnButtons) {

            const width =
                button.getBounds().width;

            const height =
                button.getBounds().height;

            const hovered =

                mx >= button.x &&
                mx <= button.x + width &&

                my >= button.y &&
                my <= button.y + height;

            //==========================================
            // HOVER
            //==========================================

            button._hoverSprite.opacity =
                hovered ? 255 : 0;

            //==========================================
            // SCALE
            //==========================================

            button.scale.x =
                hovered ? 1.03 : 1;

            button.scale.y =
                hovered ? 1.03 : 1;

            //==========================================
            // CLICK
            //==========================================

            if (
                hovered &&
                canClick &&
                TouchInput.isClicked()
            ) {

                button._callback();

                return;
            }
        }
    };

})();