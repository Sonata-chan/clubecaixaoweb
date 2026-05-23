// ==================================================
// Cae_ChoiceShuffle.js
// ==================================================

/**
 * @file Cae_ChoiceShuffle.js (RMMZ)
 * Show Choices will randomly shuffle when shuffle mode is on.
 * @author Caethyril
 * @version 1.0
 */

//#region Plugin header
/*:
 * @target MZ
 * @plugindesc v1.0 - Randomly reorder Show Choices when shuffle mode is on.
 * @author Caethyril
 * @url https://forums.rpgmakerweb.com/index.php?threads/caethyrils-mz-plugins.125657/
 * 
 * @help Features:
 *   When shuffle is on, Show Choices will have their order randomly shuffled.
 *   Set a default shuffle setting in the plugin parameters.
 *   You can turn shuffle on/off mid-game using the "Set" plugin command.
 * 
 *   (This plugin uses the Durstenfeld shuffle algorithm.)
 * 
 * Plugin Command:
 *   Set - On      - Enable choice shuffle
 *         Off     - Disable choice shuffle (original behaviour)
 *         Toggle  - On/Off depending on current value
 *         Default - Revert to default defined in plugin parameters
 *
 *  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * Terms of use:
 *   This plugin is free to use and/or modify, under these conditions:
 *     - None of the original plugin header is removed.
 *     - Credit is given to Caethyril for the original work.
 * 
 *  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * Compatibility:
 *   Aliases:   Game_Message:
 *                setChoices
 *              Game_Interpreter:
 *                setupChoices
 *              DataManager:
 *                createGameObjects, makeSaveContents, extractSaveContents
 *   This plugin adds data to save files iff its Add Save Data param is true.
 * 
 *  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * Changelog:
 *   v1.0 (2020-08-24): Initial release! Rewrite of RMMV version.
 * 
 * @command Set
 * @desc Turn choice shuffle on or off.
 * 
 * @arg Shuffle
 * @type combo
 * @option On
 * @option Off
 * @option Toggle
 * @option Default
 * @desc How to change the current shuffle status.
 * @default Default
 * 
 * @param Default Shuffle
 * @type boolean
 * @desc If true, choices will be shuffled by default.
 * @default false
 * 
 * @param Add Save Data
 * @type boolean
 * @desc If true, shuffle status will be included in save files.
 * Unnecessary unless using the plugin command.
 * @default false
 * 
 * @param --- Advanced ---
 * @type select
 * @desc Advanced internal configuration options.
 * 
 * @param Save Property Name
 * @parent --- Advanced ---
 * @type string
 * @desc Name of the property to use for saving this plugin's data.
 * Default: ChoiceShuffle
 * @default ChoiceShuffle
 */
//#endregion

(function() {
'use strict';

    const NAMESPACE   = 'ChoiceShuffle';
    const PLUGIN_NAME = 'Cae_' + NAMESPACE;
    const ERR_PRE     = PLUGIN_NAME + '.js ';
    const ERR_NOPARAM = ERR_PRE + 'could not find its parameters!\nCheck the plugin file is named correctly and try again.';
    const WARN_WATPAR = ERR_PRE + 'encountered unrecognised instruction "%1" in method "%2".';

    window.CAE = window.CAE || {};      // Author namespace

    (($, U) => {

        Object.defineProperty($, 'VERSION', { value: 1.0 });    // Version declaration
        window.Imported = window.Imported || {};                // Import namespace
        Imported[PLUGIN_NAME] = $.VERSION;                      // Import declaration

    // ======== Utility (share) ======== //

        void (k => { if (U[k]) return;
            /**
             * Generates a randomly-shuffled array of given length with values 0 to len-1.
             * @param {Number} len - Length of array to produce
             * @returns {Number[]} Shuffled array of indices.
             */
            U[k] = function(len) {
                const res = [];                             // Initialise
                for (let n = len; n--;) { res.push(n); };   // Populate (len-1 to 0)
                for (let n = len; --n;) {                   // Iterate  (len-1 to 1)
                    const ix = Math.randomInt(n + 1);       // Select   (0 to n)
                    const tmp = res[n];                     // Store
                    res[n] = res[ix];                       // Swap ->
                    res[ix] = tmp;                          // Swap <-
                }
                return res;
            };
        })('shuffleIx')

    // ======== Parameter stuff ======== //

        void (p => {

            if (!p) { SceneManager.showDevTools(); throw new Error(ERR_NOPARAM); };

            /**
             * Sets the plugin's shuffle flag to the given value.
             * Choice shuffle occurs only when this flag is true.
             * @param {Boolean} value - Value to set
             */
            $.setShuffle    = function(value) { $.shuffle = !!value; };

            /** Toggles the shuffle flag between true and false. */
            $.toggleShuffle = function()      { $.setShuffle(!$.shuffle); };

            /** Sets the shuffle flag equal to the default value defined in the plugin parameters. */
            $.initShuffle   = function()      { $.setShuffle(p['Default Shuffle'] === 'true'); };

            $.initShuffle();
            $.save = p['Add Save Data'] === 'true';

            Object.defineProperty($, 'SAVE_PROP', { value: String(p['Save Property Name'] || '').trim() || PLUGIN_NAME });

        })($.params = PluginManager.parameters(PLUGIN_NAME));

    // ========= Init Routines ========= //
    // ======== Utility (local) ======== //

        /**
         * Applies random shuffle to a given array.
         * @param {Number[]} arr - Array to shuffle
         * @returns {[Number[],Number[]]} [Shuffled value array, shuffled index array].
         */
        $.doShuffle = function(arr) {
            const ix  = U.shuffleIx(arr.length);
            const res = ix.map(n => arr[n]);
            return [res, ix];
        };

        /**
         * @param {Game_Interpreter} interpreter - Game interpreter reference, for function bind target
         * @param {Function} originalCallback - Original value of callback function
         * @returns {Function} Callback function remapped for shuffle order.
         */
        $.mkCallback = function(interpreter, originalCallback) {
            const M = $._ix.slice();
            delete $._ix;
            return function(n) { originalCallback(M[n] === undefined ? n : M[n]); }.bind(interpreter);
        };

        /**
         * Adjusts the plugin's shuffle flag based on the given command word.
         * @param {String} text - Command: On, Off, Toggle, Default
         */
        $.parseShuffle = function(text) {
            switch (String(text || '').toUpperCase()) {
                case 'ON':     case 'TRUE':
                    return $.setShuffle(true);
                case 'OFF':    case 'FALSE':
                    return $.setShuffle(false);
                case 'TOGGLE': case 'INVERT':
                    return $.toggleShuffle();
                case 'DEFAULT':case 'RESET':
                    return $.initShuffle();
            }
            console.warn(WARN_WATPAR.format(text, 'parseShuffle'));
            return;
        };

        /**
         * @param {Object} contents - Aggregate save contents
         * @returns {Object} Save contents including this plugin's save data.
         */
        $.makeSave = function(contents) {
            contents[$.SAVE_PROP] = $.shuffle;
            return contents;
        };

        /**
         * Extracts and re-applies this plugin's save data from given contents.
         * @param {Object} contents - Save contents from file
         */
        $.extractSave = function(contents) {
            const v = contents[$.SAVE_PROP];
            if (v === undefined) $.initShuffle();
            else $.setShuffle(!!v);
        };

    // ======== Plugin Commands ======== //

        $.com = {
            /** Plugin command! Changes the shuffle status (on, off, toggle, default). */
            set: function(args) { return $.parseShuffle(args.Shuffle); }
        };
        PluginManager.registerCommand(PLUGIN_NAME, 'Set', $.com.set);

    // ============ Extends ============ //
    // ========== Alterations ========== //

        $.alias = $.alias || {};        // This plugin's alias namespace

        // Alias! Randomly shuffle order of input choices~
        void (alias => {
            Game_Message.prototype.setChoices = function(choices, ...args) {
                const [newChoices, ix] = $.shuffle ? $.doShuffle(choices) : [choices];
                alias.call(this, newChoices, ...args);
                if (ix) $._ix = ix;      // Temporary: carries indices to callback generation routine
            };
        })($.alias.Game_Message_setChoices = Game_Message.prototype.setChoices);

        // Alias! Adjust choice callback to match shuffled order.
        void (alias => {
            Game_Interpreter.prototype.setupChoices = function(params) {
                alias.apply(this, arguments);
                if (!$._ix) return;
                $gameMessage.setChoiceCallback($.mkCallback(this, $gameMessage._choiceCallback));
            };
        })($.alias.Game_Interpreter_setupChoices = Game_Interpreter.prototype.setupChoices);

        // Alias! Initialise shuffle flag on new game.
        void (alias => {
            DataManager.createGameObjects = function() {
                alias.apply(this, arguments);
                $.initShuffle();
            };
        })($.alias.DataManager_createGameObjects = DataManager.createGameObjects);

        void (() => { if (!$.save) return;

            // Alias! Add plugin data to save contents.
            void (alias => {
                DataManager.makeSaveContents = function() {
                    return $.makeSave(alias.apply(this, arguments));
                };
            })($.alias.DataManager_makeSaveContents = DataManager.makeSaveContents);

            // Alias! Extract plugin data from save contents.
            void (alias => {
                DataManager.extractSaveContents = function(contents) {
                    alias.apply(this, arguments);
                    $.extractSave(contents);
                };
            })($.alias.DataManager_extractSaveContents = DataManager.extractSaveContents);

        })();

    })(CAE[NAMESPACE] = CAE[NAMESPACE] || {}, CAE.Utils = CAE.Utils || {});

})();