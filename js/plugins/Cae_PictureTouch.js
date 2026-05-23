// ==================================================
// Cae_PictureTouch.js
// ==================================================

/**
 * @file Cae_PictureTouch.js (RMMZ)
 * Add hover, leave, press, and/or click triggers to pictures.
 * @author Caethyril
 * @version 1.6
 */

//#region Plugin Header
/*:
 * @target MZ
 * @plugindesc v1.6 - Run events or scripts when pictures are touched/hovered.
 * @author Caethyril
 * @url https://forums.rpgmakerweb.com/threads/125657/
 *
 * @help Features:
 *   Use the plugin commands to add/remove binds to/from pictures.
 *   These binds will react to touch/mouse input depending on their trigger.
 *   Available triggers:
 *     - Enter: when touch enters picture bounds
 *     - Leave: when touch leaves picture bounds
 *     - Press: when touch is pressed on a picture (and wasn't last frame)
 *     - Click: when touch is released on a picture, after press
 *   Binds can be common events or script calls.
 *   A picture can have up to 4 effects bound to it at a time: 1 per trigger.
 *
 *   The plugin parameters provide auto-removal options for binds:
 *     - Unbind on Show: removes bind(s) when shown via Show Picture
 *     - Unbind on Erase: removes bind(s) when erased via Erase Picture
 *
 *   If the "Disable on Trigger" parameter is set:
 *     - binds will automatically disable when triggered;
 *     - you can re-enable the bind at the end of the event/script;
 *     - see below for relevant plugin commands/script calls.
 *   This helps to avoid queueing the same bind multiple times.
 *
 *   You can specify an opacity threshold for reactive areas.
 *   You can apply this threshold to other clickable sprites (e.g. enemies).
 *   You can set a variable to store the picture ID for Event Binds.
 *
 * Plugin commands:
 *   Bind Event          - binds a common event to a picture/trigger.
 *   Bind Script         - binds a JavaScript function to a picture/trigger.
 *   Unbind              - unbinds existing picture binds.
 *   Enable/Disable Bind - enables or disables an existing picture bind.
 *                       - disabled picture binds will not trigger.
 *
 * Handy script calls:
 *   For the following script calls:
 *    - picId is a number: the ID of the picture.
 *    - trigger is a string: "all", "enter", "leave", "press", or "click".
 *
 *        CAE.PictureTouch.enableBind(picId, trigger);
 *   e.g. CAE.PictureTouch.enableBind(1, "click");
 *    - Enables a disabled picture bind.
 *
 *        CAE.PictureTouch.disableBind(picId, trigger);
 *    - Disables an existing picture bind.
 *
 *        CAE.PictureTouch.toggleBind(picId, trigger);
 *    - Toggles an existing bind between enabled/disabled.
 *
 *  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * Terms of use:
 *   This plugin is free to use and/or modify, under these conditions:
 *     - None of the original plugin header is removed.
 *     - Credit is given to Caethyril for the original work.
 *
 *  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * Compatibility:
 *   Overrides: TouchInput:
 *                isHovered (only if "Always Update Hover" param = true)
 *   Aliases:   Sprite_Picture:
 *                onMouseEnter, onMouseExit, onPress, onClick, hitTest
 *              Game_Screen:
 *                showPicture, erasePicture
 *              Scene_Map:
 *                create, updateDestination
 *              DataManager:
 *                createGameObjects, makeSaveContents, extractSaveContents
 *              Game_Temp:
 *                reserveCommonEvent, clearCommonEventReservation
 *              Game_Interpreter:
 *                setupReservedCommonEvent
 *   This plugin adds data to save files iff its Add Save Data param = true.
 *
 *  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * Changelog:
 *   v1.6 (2023-04-17): Fixed - script binds with {blocks} now load correctly.
 *                      Added - "Picture ID Variable" parameter.
 *   v1.5 (2020-10-08): Fixed - "Disable on Trigger" only affects event binds.
 *                      Added - "Always Update Hover" parameter.
 *   v1.4 (2020-09-26): Fixed - "Unbind All" plugin command should work now.
 *                      Added - "Disable Bind" options (manual & automatic).
 *   v1.3 (2020-08-25): Fixed - opacity test now checks for empty bitmap.
 *                      Added - optionally apply opacity hitbox to all sprites.
 *   v1.2 (2020-08-24): Fixed - erase hovered pic no longer locks touch move.
 *                      Fixed - binds now always initialise on new game.
 *   v1.1 (2020-08-22): Fixed - picture clicks no longer set move destination.
 *                      Fixed - script binds should now save/load correctly.
 *   v1.0 (2020-08-21): Initial release! Standalone version of RMMV extension.
 *
 * @command Bind Event
 * @desc Bind a common event to a given picture & trigger.
 *
 * @arg Picture ID
 * @type number
 * @min 1
 * @desc ID of the picture to which the event should be bound.
 * @default 1
 *
 * @arg Trigger
 * @type combo
 * @option Enter
 * @option Leave
 * @option Press
 * @option Click
 * @desc The trigger for the event. Enter/Leave are hover-based.
 * Press = input pressed. Click = input pressed + released.
 * @default Click
 *
 * @arg Event ID
 * @type common_event
 * @desc ID of the common event to be bound.
 * @default 0
 *
 * @command Bind Script
 * @desc Bind a script call to a given picture & trigger.
 *
 * @arg Picture ID
 * @type number
 * @min 1
 * @desc ID of the picture to which the script should be bound.
 * @default 1
 *
 * @arg Trigger
 * @type combo
 * @option Enter
 * @option Leave
 * @option Press
 * @option Click
 * @desc The trigger for the script. Enter/Leave are hover-based.
 * Press = input pressed. Click = input pressed + released.
 * @default Click
 *
 * @arg Script
 * @type multiline_string
 * @desc JavaScript to evaluate when triggered. 2 arguments: pictureId + trigger (string). Context Sprite_Picture.
 * @default
 *
 * @command Unbind
 * @desc Remove bind(s) from specified picture(s).
 *
 * @arg Picture ID
 * @type number
 * @min 1
 * @desc ID of the picture to unbind.
 * @default 1
 *
 * @arg Trigger
 * @type combo
 * @option All
 * @option Enter
 * @option Leave
 * @option Press
 * @option Click
 * @desc The trigger to unbind.
 * @default All
 *
 * @command Enable/Disable Bind
 * @desc Enables or disables a picture's bind(s).
 *
 * @arg Action
 * @type select
 * @option Enable
 * @option Disable
 * @option Toggle
 * @desc Determines whether to enable or disable the specified picture bind.
 * @default Toggle
 *
 * @arg Picture ID
 * @type number
 * @min 1
 * @desc ID of the picture with a bind you want to enable/disable.
 * @default 1
 *
 * @arg Trigger
 * @type combo
 * @option All
 * @option Enter
 * @option Leave
 * @option Press
 * @option Click
 * @desc The trigger to enable/disable.
 * @default All
 *
 * @param Minimum Opacity
 * @type number
 * @min 0
 * @max 255
 * @desc Only picture pixels with at least this much opacity will react. 0 = transparent, 255 = opaque. Default: 1.
 * @default 1
 *
 * @param Minimum Opacity For All
 * @parent Minimum Opacity
 * @type boolean
 * @desc If true, Minimum Opacity applies to all clickable sprites.
 * If false, it applies only to pictures.
 * @default false
 *
 * @param Unbind on Show
 * @type boolean
 * @desc If true, existing binds will be removed from a picture when it is shown using the Show Picture command.
 * @default false
 *
 * @param Unbind on Erase
 * @type boolean
 * @desc If true, existing binds will be removed from a picture when it is erased using the Erase Picture command.
 * @default true
 *
 * @param Disable on Trigger
 * @type boolean
 * @desc If true, event binds automatically disable when triggered, to avoid queueing multiple copies of the event.
 * @default false
 *
 * @param Add Save Data
 * @type boolean
 * @desc If true, will add data to save files. Recommended!
 * @default true
 *
 * @param Always Update Hover
 * @type boolean
 * @desc If true, binds can trigger without cursor movement. (May impact performance.)
 * @default false
 *
 * @param Picture ID Variable
 * @type variable
 * @desc When a picture Event Bind starts from queue, this variable will be set to the corresponding picture's ID.
 * @default 0
 */
//#endregion Plugin Header

(() => {
'use strict';

    const NAMESPACE   = 'PictureTouch';
    const PLUGIN_NAME = 'Cae_' + NAMESPACE;
    const ERR_PRE     = PLUGIN_NAME + '.js ';
    const ERR_NOPARAM = ERR_PRE + 'could not find its parameters!\nCheck you have named the plugin file correctly and try again.';

    window.CAE = window.CAE || {};

    (($, U) => {

        Object.defineProperty($, 'VERSION', { value: 1.5 });    // Version declaration
        window.Imported = window.Imported || {};                // Import namespace
        Imported[PLUGIN_NAME] = $.VERSION;                      // Import declaration

        Object.defineProperty($, 'SAVE_PROP', { value: PLUGIN_NAME });

    // ======== Parameter stuff ======== //

        void (p => {

            if (!p || !Object.keys(p).length) { // TODO: test this again, previously was just !p
                SceneManager.showDevTools();
                throw new Error(ERR_NOPARAM);
            };

            $.alphaMin = parseInt(p['Minimum Opacity'], 10) || 0;
            $.alphaAll = p['Minimum Opacity For All'] === 'true';
            $.save     = p['Add Save Data'] === 'true';
            $.unbindOn = {
                show:  p['Unbind on Show']  === 'true',
                erase: p['Unbind on Erase'] === 'true'
            };
            $.triggerOff = p['Disable on Trigger'] === 'true';
            $.alwaysHover = p['Always Update Hover'] === 'true';
            $.varForPicId = parseInt(p['Picture ID Variable'], 10) || 0;

        })($.params = PluginManager.parameters(PLUGIN_NAME));

    // ========= Init Routines ========= //

        /** Initialise bind storage object. */
        $._initBinds = function() {
            $.binds = { enter: {}, leave: {}, press: {}, click: {} }
            $.disabled = [];        // v1.4 - if includes trigger + picId, disabled, else not.
            $.evPicId = [];         // v1.6 - parallel CE array, stores associated picture IDs.
        };
        $._initBinds();

    // ======== Utility (local) ======== //

        /**
         * Non-conflicting symbol identifier for storing function source
         * on Script Bind functions.
         * @since 1.6
         * @name SRC
         * @type {symbol}
         * @readonly
         */
        Object.defineProperty($, 'SRC', { value: Symbol() });

        /**
         * List of triggers, for the 'unbind all' plugin command.
         * @name _triggers
         * @type {Array}
         * @readonly
         */
        Object.defineProperty($, '_triggers', { get: () => Object.keys($.binds) });

        /**
         * Constructs a custom bind function from given body text.
         * @param {String} text - Function body
         */
        $.mkFunc = function(text) {
            if (!String(text || '').trim()) return;
            const f = new Function('pictureId', 'trigger', text);
            f[$.SRC] = text;        // for fct -> string (saving)
            return f;
        };

        /**
         * Extracts the body text of one of this plugin's function binds, for save purposes.
         * @param {Function} fct - Input function
         * @returns Function body text.
         */
        $._encodeFct = function(fct) {
            if (!(fct instanceof Function)) return fct;
            return fct[$.SRC];  // much simpler!
            // return fct.toString().match(/\{\n?([^\}]*)\n?\}/)[1];    // fails, e.g. "{}"
        };

        /**
         * Re-encodes the body text of a function loaded from file as an actual function.
         * @param {String} body - Function body text
         * @returns {Function} The function.
         */
        $._decodeFct = function(body) {
            return isNaN(body) ? $.mkFunc(body) : body; // nb: this has already been JSON.parsed
        };

        /**
         * Puts relevant save data into given save contents.
         * Also handles reformatting of functions so they can be stringified nicely.
         * (JSONEx offers no support for fcts at this time.)
         * @param {Object} contents - Aggregate save data
         * @returns {Object} Save data that now includes this plugin's data.
         */
        $.savApply   = function(contents) {
            const O = $.binds;
            const r = {};
            for (const t in O) {
                r[t] = {};
                for (const b in O[t]) {
                    const v = O[t][b];
                    if (v) r[t][b] = $._encodeFct(v);
                }
            }
            contents[$.SAVE_PROP] = { d: $.disabled || [], r: r };
            return contents;
        };

        /**
         * Retrieves data from provided save contents.
         * Also reconstitutes functions from their body text.
         * (JSONEx offers no support for fcts at this time.)
         * @param {Object} contents - Data from save file
         */
        $.savExtract = function(contents) {
            const D = contents[$.SAVE_PROP];
            const I = D.d ? D.r : D;            // back-compatibility - sub-props added in v1.4.
            const r = {};
            for (const t in I) {
                r[t] = {};
                for (const b in I[t]) {
                    const v = I[t][b];
                    if (v) r[t][b] = $._decodeFct(v);
                }
            }
            return $.disabled = D.d || [], $.binds = r;
        };

        /**
         * Tests the alpha of a given pixel in a given sprite against a threshold value.
         * @param {Sprite} p - The sprite to test
         * @param {Number} x - X coordinate of test pixel
         * @param {Number} y - Y coordinate of test pixel
         * @param {Number} t - Alpha threshold value
         * @returns {Boolean} True iff alpha(x, y) >= threshold.
         */
        $.alphaTest = function(p, x, y, t) { return p?.bitmap?.getAlphaPixel(x, y) * p.opacity / 255 >= t; };

        /**
         * Assigns a bind to a given picture ID for a given trigger.
         * @param {Number} picId - Picture ID
         * @param {String} trigger - Bind trigger: enter, leave, press, click
         * @param {Function|Number} value - Value to assign. Numbers are interpreted as common event IDs.
         */
        $.setBind = function(picId, trigger, value) { return $.binds[trigger][picId] = value; };

        /**
         * Returns the bind for a given picture ID and trigger.
         * @param {Number} picId - Picture ID
         * @param {String} trigger - Bind trigger: enter, leave, press, click
         * @returns {Function|Number} Current bind. Numbers are interpreted as common event IDs.
         */
        $.getBind = function(picId, trigger) { return $.binds[trigger]?.[picId]; };

        /**
         * Removes the bind for a given picture ID and trigger.
         * @param {Number} picId - Picture ID
         * @param {String} trigger - Bind trigger: enter, leave, press, click
         */
        $.remBind = function(picId, trigger) { return !$.setBind(picId, trigger, undefined); };

        /**
         * Runs a given common event for a bind.
         * @param {Number} evId - Common event ID
         */
        $.runEvent = function(evId) {
            $gameTemp.reserveCommonEvent(evId);
            return true;
        };

        /**
         * Returns an array of all bind triggers currently assigned to this picture ID.
         * @param {Number} picId - Picture ID
         * @returns {String[]} Array of bind triggers: enter, leave, press, click.
         */
        $.getAllBinds = function(picId) {
            let res = [];
            $._triggers.forEach(trigger => {
                const b = $.binds[trigger][picId];
                if (b) res.push(trigger);
            });
            return res;
        };

        /**
         * Clears all existing binds for this picture ID.
         * @param {Number} picId - Picture ID
         */
        $.clearAllBinds = function(picId) {
            $.getAllBinds(picId).forEach(trigger => $.remBind(picId, trigger));
        };

        /**
         * @param {Number} picId - Picture ID
         * @param {String} trigger - Bind trigger: enter, leave, press, click
         * @returns {Boolean} True iff the bind is disabled or does not exist.
         */
        $.isBindDisabled = function(picId = 0, trigger = '') {
            return $.disabled.includes(trigger + picId) || !$.getBind(picId, trigger);
        };

        /**
         * Disables the specified picture bind, if it exists and is not disabled.
         * @param {Number} picId - Picture ID
         * @param {String} trigger - Bind trigger: enter, leave, press, click
         */
        $.disableBind = function(picId, trigger) {
            if (!trigger || !picId || $.isBindDisabled(picId, trigger)) return false;
            $.disabled.push(trigger + picId);
            return true;
        };

        /**
         * Enables the specified picture bind, if it exists and is disabled.
         * @param {Number} picId - Picture ID
         * @param {String} trigger - Bind trigger: enter, leave, press, click
         */
        $.enableBind = function(picId, trigger) {
            if (!trigger || !picId) return false;
            const ix  = $.disabled.indexOf(trigger + picId);
            if (ix < 0) return false;
            $.disabled.splice(ix, 1);
            return true;
        };

        /**
         * Enables/disables the specified picture bind depending on its current status.
         * @param {Number} picId - Picture ID
         * @param {String} trigger - Bind trigger: enter, leave, press, click
         */
        $.toggleBind = function(picId, trigger) {
            return $.isBindDisabled(picId, trigger) ?
                    $.enableBind(picId, trigger) : $.disableBind(picId, trigger);
        };

        /**
         * Runs the bind (if it exists) associated with given picture ID and trigger.
         * @param {Number} pic - Picture ID
         * @param {String} trigger - Bind trigger: enter, leave, press, click
         */
        $.checkBind = function(pic, trigger) {
            const picId = pic._pictureId;
            if ($.isBindDisabled(picId, trigger)) return false;
            const bind = $.getBind(picId, trigger);
            if (bind) {
                if (bind instanceof Function) {
                    bind.call(pic, picId, trigger);
                    return true;
                } else {
                    if ($.triggerOff) $.disableBind(picId, trigger);
                    $._evPicId = picId;   // see patch for reserveCommonEvent of Game_Temp
                    return $.runEvent(bind);
                }
            }
            return false;
        };

        /** @returns {Boolean} True iff one or more pictures are blocking touch move input. */
        $.isMapBlocked = function() { return $.mapTouchBlock.length; };

        /**
         * Adds given ID to the list of map-blocking pictures.
         * @param {Number} id - Game picture ID
         */
        $.blockMap = function(id) {
            if (!$.mapTouchBlock.includes(id)) $.mapTouchBlock.push(id);
        };

        /**
         * Removes given ID from the list of map-blocking pictures.
         * @param {Number} id - Game picture ID
         */
        $.unblockMap = function(id) {
            const ix = $.mapTouchBlock.indexOf(id);
            if (ix >= 0) $.mapTouchBlock.splice(ix, 1);
        };

        /** Empties the map-blocking picture list. */
        $.unblockMapAll = function() { $.mapTouchBlock = []; }
        $.unblockMapAll();  // Initialise

        /**
         * Called when a picture is shown.
         * @param {Number} picId - Game picture ID
         */
        $.onShowPicture = function(picId) {
            if ($.unbindOn.show) $.clearAllBinds(picId);
        };

        /**
         * Called when a picture is erased.
         * @param {Number} picId - Game picture ID
         */
        $.onErasePicture = function(picId) {
            $.unblockMap(picId);
            if ($.unbindOn.erase) $.clearAllBinds(picId);
        };

    // ======== Plugin Commands ======== //

        $.com = {
            /**
             * Returns command arguments parsed from string input.
             * @param {{"Picture ID":String,"Trigger":String}} o - Command arguments in string format
             * @returns {[Number, String]} Parsed argument array: integer picture ID, lower-case trigger.
             */
            parseArgs: function(o) { return [parseInt(o['Picture ID'], 10), String(o.Trigger || '').toLowerCase()]; },
            /**
             * Converts input string to a function that performs the specified enable/disable action.
             * @param {String} text - String to convert
             * @returns {Function} Corresponding function.
             */
            parseDisableAction: function(text) {
                switch (String(text).toLowerCase()) {
                    case  'enable': return $.enableBind;
                    case 'disable': return $.disableBind;
                    case  'toggle': return $.toggleBind;
                }
            },
            /**
             * Binds a common event to a specified picture ID and trigger.
             * @param {{"Picture ID":String,"Trigger":String,"Event ID":String}} o - Command arguments in string format
             * @returns {Boolean} True iff a bind is set.
             */
            bindEvent: function(o) {
                const [picId, trigger] = $.com.parseArgs(o);
                const evId = parseInt(o['Event ID'], 10);
                if (picId && trigger && evId) {
                    return !!$.setBind(picId, trigger, evId);
                }
                return false;
            },
            /**
             * Binds a scripted function to a specified picture ID and trigger.
             * @param {{"Picture ID":String,"Trigger":String,"Script":String}} o - Command arguments in string format
             * @returns {Boolean} True iff a bind is set.
             */
            bindScript: function(o) {
                const [picId, trigger] = $.com.parseArgs(o);
                const script = o.Script;
                if (picId && trigger && script) {
                    return !!$.setBind(picId, trigger, $._decodeFct(script));
                }
                return false;
            },
            /**
             * Unbinds existing binds for specified picture ID & trigger.
             * @param {{"Picture ID":String,"Trigger":String}} o - Command arguments in string format
             * @returns {Boolean} True iff at least one bind was removed.
             */
            unbind: function(o) {
                const [picId, trigger] = $.com.parseArgs(o);
                if (!picId) return false;
                if (trigger === 'all') {
                    return $._triggers.reduce((a, c) => {
                        return ($.getBind(picId, c) && $.remBind(picId, c)) || a
                    }, false);
                } else if (trigger && $.getBind(picId, trigger)) {
                    return $.remBind(picId, trigger);
                }
                return false;
            },
            /**
             * Changes the disable status of given bind(s).
             * @param {{"Action":String,"Picture ID":String,"Trigger":String}} o - Command arguments in string format
             * @returns {Boolean} True iff at least one bind's disable status was changed.
             */
            activate: function(o) {
                const [picId, trigger] = $.com.parseArgs(o);
                if (!picId) return false;
                const method = $.com.parseDisableAction(o.Action);
                if (!method) return false;
                if (trigger === 'all') {
                    return $._triggers.reduce((a, c) => method(picId, c) || a, false);
                } else if (trigger) {
                    return method(picId, trigger);
                }
                return false;
            }
        };
        PluginManager.registerCommand(PLUGIN_NAME, 'Bind Event',          $.com.bindEvent);
        PluginManager.registerCommand(PLUGIN_NAME, 'Bind Script',         $.com.bindScript);
        PluginManager.registerCommand(PLUGIN_NAME, 'Unbind',              $.com.unbind);
        PluginManager.registerCommand(PLUGIN_NAME, 'Enable/Disable Bind', $.com.activate);

        // Considered adding "Designation by Variable" for plugin commands.
        // Can just use the script calls, though...

    // ========== Alterations ========== //

        // Override! Ignore the isHovered condition (set true on frames with cursor coord change).
        void (() => { if (!$.alwaysHover) return;
            TouchInput.isHovered = function() { return true; };
        })();

        $.alias = $.alias || {};        // This plugin's alias namespace

        // Alias! Trigger: enter (mouse over).
        void (alias => {
            Sprite_Picture.prototype.onMouseEnter = function() {
                alias.apply(this, arguments);
                $.checkBind(this, 'enter');
                $.blockMap(this._pictureId)
            };
        })($.alias.Sprite_Picture_onMouseEnter = Sprite_Picture.prototype.onMouseEnter);

        // Alias! Trigger: leave (mouse exit).
        void (alias => {
            Sprite_Picture.prototype.onMouseExit = function() {
                alias.apply(this, arguments);
                $.checkBind(this, 'leave');
                $.unblockMap(this._pictureId);
            };
        })($.alias.Sprite_Picture_onMouseExit = Sprite_Picture.prototype.onMouseExit);

        // Alias! Trigger: press (mouse down).
        void (alias => {
            Sprite_Picture.prototype.onPress = function() {
                alias.apply(this, arguments);
                $.checkBind(this, 'press');
            };
        })($.alias.Sprite_Picture_onPress = Sprite_Picture.prototype.onPress);

        // Alias! Trigger: click (mouse down, then up).
        void (alias => {
            Sprite_Picture.prototype.onClick = function() {
                alias.apply(this, arguments);
                $.checkBind(this, 'click')
            };
        })($.alias.Sprite_Picture_onClick = Sprite_Picture.prototype.onClick);

        // Alias! Add an opacity threshold to the hit test.
        // Either Sprite_Picture or Sprite_Clickable depending on plugin parameter.
        void ((proto, threshold) => { if (threshold <= 0) return;
            const alias = $.alias[proto + '_hitTest'] = window[proto].prototype.hitTest;
            window[proto].prototype.hitTest = function(x, y) {
                const ax = this.anchor.x * this.width, ay = this.anchor.y * this.height;
                return alias.apply(this, arguments) && $.alphaTest(this, x + ax, y + ay, threshold);
            };
        })($.alphaAll ? 'Sprite_Clickable' : 'Sprite_Picture', $.alphaMin);

        // Alias! Process additional effects when a picture is shown.
        void (alias => {
            Game_Screen.prototype.showPicture = function(id) {
                alias.apply(this, arguments);
                $.onShowPicture(id);
            };
        })($.alias.Game_Screen_showPicture = Game_Screen.prototype.showPicture);

        // Alias! Process additional effects when a picture is erased.
        void (alias => {
            Game_Screen.prototype.erasePicture = function(id) {
                alias.apply(this, arguments);
                $.onErasePicture(id);
            };
        })($.alias.Game_Screen_erasePicture = Game_Screen.prototype.erasePicture);

        // Alias! Reset map-blocking picture list when entering map scene (e.g. from battle).
        void (alias => {
            Scene_Map.prototype.create = function() {
                alias.apply(this, arguments);
                $.unblockMapAll();
            };
        })($.alias.Scene_Map_create = Scene_Map.prototype.create);

        // Alias! Block "move to" map touches when appropriate.
        void (alias => {
            Scene_Map.prototype.updateDestination = function() {
                return !$.isMapBlocked() && alias.apply(this, arguments);
            };
        })($.alias.Scene_Map_updateDestination = Scene_Map.prototype.updateDestination);

        // Alias! Initialise all binds on new game.
        void (alias => {
            DataManager.createGameObjects = function() {
                alias.apply(this, arguments);
                $._initBinds();
            };
        })($.alias.DataManager_createGameObjects = DataManager.createGameObjects);

        // Alias! Add binds to save data.
        void (alias => { if (!$.save) return;
            DataManager.makeSaveContents = function() {
                return $.savApply(alias.apply(this, arguments));
            };
        })($.alias.DataManager_makeSaveContents = DataManager.makeSaveContents);

        // Alias! Extract binds from save data.
        void (alias => { if (!$.save) return;
            DataManager.extractSaveContents = function(contents) {
                alias.apply(this, arguments);
                $.savExtract(contents);
            };
        })($.alias.DataManager_extractSaveContents = DataManager.extractSaveContents);

        // Automatic var update for event picture binds.
        void (() => { if (!$.varForPicId) return;

            // Store associated picture ID (or 0) in separate tandem array.
            void (alias => {
                Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
                    $.evPicId.push($._evPicId ?? 0);
                    delete $._evPicId;
                    alias.apply(this, arguments);
                };
            })($.alias.Game_Temp_reserveCommonEvent = Game_Temp.prototype.reserveCommonEvent);

            // Clear picture ID array along with common event queue.
            void (alias => {
                Game_Temp.prototype.clearCommonEventReservation = function() {
                    alias.apply(this, arguments);
                    $.evPicId.length = 0;
                };
            })($.alias.Game_Temp_clearCommonEventReservation = Game_Temp.prototype.clearCommonEventReservation);

            // Update variable whenever a common event starts from queue.
            void (alias => {
                Game_Interpreter.prototype.setupReservedCommonEvent = function() {
                    if (alias.apply(this, arguments))
                        $gameVariables.setValue($.varForPicId, $.evPicId.shift());
                };
            })($.alias.Game_Interpreter_setupReservedCommonEvent = Game_Interpreter.prototype.setupReservedCommonEvent);

        })();

    })(CAE[NAMESPACE] = CAE[NAMESPACE] || {}, CAE.Utils = CAE.Utils || {});

})();
