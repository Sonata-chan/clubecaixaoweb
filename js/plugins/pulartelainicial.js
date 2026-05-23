/*:
 * @target MZ
 * @plugindesc Pula a tela de título padrão e inicia o jogo direto em um mapa definido.
 *
 * @param startMapId
 * @text ID do Mapa Inicial
 * @type number
 * @min 1
 * @default 1
 *
 * @param startX
 * @text Posição X
 * @type number
 * @min 0
 * @default 0
 *
 * @param startY
 * @text Posição Y
 * @type number
 * @min 0
 * @default 0
 */

(() => {

    const pluginName =
        document.currentScript.src
        .match(/([^\/]+)\.js$/)[1];

    const params =
        PluginManager.parameters(pluginName);

    const START_MAP_ID =
        Number(params.startMapId || 1);

    const START_X =
        Number(params.startX || 0);

    const START_Y =
        Number(params.startY || 0);

    //==================================================
    // PULA TELA DE TÍTULO
    //==================================================

    Scene_Boot.prototype.startNormalGame =
        function() {

        this.checkPlayerLocation();

        DataManager.setupNewGame();

        $gamePlayer.reserveTransfer(
            START_MAP_ID,
            START_X,
            START_Y,
            2,
            0
        );

        SceneManager.goto(Scene_Map);

        Window_TitleCommand.initCommandPosition();
    };

})();