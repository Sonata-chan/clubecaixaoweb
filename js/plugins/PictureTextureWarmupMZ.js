/*:
 * @target MZ
 * @author Copilot
 * @help Version 1.2.0.
 *
 * Preloads picture bitmaps and warms up PIXI/GPU textures before Show Picture,
 * reducing the chance of first-frame blank sprites in web builds.
 *
 * This plugin now also auto-hooks every regular Show Picture / Erase Picture
 * flow in event commands and script calls, so existing map/common events do
 * not need manual plugin commands to benefit from texture warmup.
 *
 * Plugin Commands:
 * 1) warmup_pictures
 *    - Preloads a comma-separated list of pictures and requests texture upload.
 *
 * 2) show_picture_after_warmup
 *    - Waits for picture warmup (optional), then calls Game_Screen.showPicture.
 *
 * 3) release_pictures
 *    - Releases specified pictures from ImageManager cache if they are no longer in use.
 *
 * 4) trim_tracked_pictures
 *    - Releases older warmed/shown pictures while keeping the most recent ones.
 *
 * @plugindesc Warm up picture textures on GPU before Show Picture
 *
 * @command warmup_pictures
 * @text Warmup Pictures
 * @desc Preload and warmup a comma-separated list of pictures (img/pictures)
 *
 * @arg names
 * @type string
 * @text Picture Names
 * @default picture_a,picture_b
 * @desc Comma-separated picture filenames without extension
 *
 * @command show_picture_after_warmup
 * @text Show Picture After Warmup
 * @desc Warmup one picture and only then execute Show Picture
 *
 * @arg pictureId
 * @type number
 * @min 1
 * @default 1
 *
 * @arg name
 * @type string
 * @default my_picture
 *
 * @arg origin
 * @type select
 * @option Upper Left
 * @value 0
 * @option Center
 * @value 1
 * @default 0
 *
 * @arg x
 * @type number
 * @min -99999
 * @max 99999
 * @default 0
 *
 * @arg y
 * @type number
 * @min -99999
 * @max 99999
 * @default 0
 *
 * @arg scaleX
 * @type number
 * @min 0
 * @max 2000
 * @default 100
 *
 * @arg scaleY
 * @type number
 * @min 0
 * @max 2000
 * @default 100
 *
 * @arg opacity
 * @type number
 * @min 0
 * @max 255
 * @default 255
 *
 * @arg blendMode
 * @type select
 * @option Normal
 * @value 0
 * @option Additive
 * @value 1
 * @option Multiply
 * @value 2
 * @option Screen
 * @value 3
 * @default 0
 *
 * @arg waitForWarmup
 * @type boolean
 * @on Wait
 * @off Do Not Wait
 * @default true
 *
 * @command release_pictures
 * @text Release Pictures
 * @desc Release specified pictures from memory if they are not currently displayed
 *
 * @arg names
 * @type string
 * @text Picture Names
 * @default picture_a,picture_b
 * @desc Comma-separated picture filenames without extension
 *
 * @command trim_tracked_pictures
 * @text Trim Tracked Pictures
 * @desc Release older warmed/shown pictures while keeping the newest ones
 *
 * @arg keepLast
 * @type number
 * @min 0
 * @default 2
 * @desc Number of most recently tracked pictures to keep in memory
 *
 * @arg keepNames
 * @type string
 * @text Keep Names
 * @default
 * @desc Extra picture names to keep, comma-separated, without extension
 */

(() => {
    const PLUGIN_NAME = "PictureTextureWarmupMZ";
    const AUTO_TRIM_KEEP_LAST = 12;
    const DEBUG_RENDER = true;
    const DEBUG_TARGET_PICTURES = new Set(["cen034"]);
    const DEBUG_PREFIX = "[PTW-DIAG]";
    const warmupCache = new Map();
    const pendingWarmups = new Set();
    const trackedPictureNames = [];
    const pictureRequestTokens = new Map();
    let bypassAutoShowPicture = false;

    const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === "pictureTextureWarmup") {
            return !!this._pictureTextureWarmupPending;
        }
        return _Game_Interpreter_updateWaitMode.call(this);
    };

    function shouldDebugPicture(name) {
        if (!DEBUG_RENDER) {
            return false;
        }
        const key = String(name || "").trim();
        return !!key && DEBUG_TARGET_PICTURES.has(key);
    }

    function diag(name, pictureId, message, extra) {
        if (!shouldDebugPicture(name)) {
            return;
        }
        const idText = Number.isFinite(Number(pictureId)) ? " id=" + Number(pictureId) : "";
        if (extra !== undefined) {
            console.log(`${DEBUG_PREFIX}${idText} ${name}: ${message}`, extra);
        } else {
            console.log(`${DEBUG_PREFIX}${idText} ${name}: ${message}`);
        }
    }

    function parseNames(csv) {
        return String(csv || "")
            .split(",")
            .map(name => name.trim())
            .filter(Boolean);
    }

    function pictureUrl(name) {
        return "img/pictures/" + Utils.encodeURI(name) + ".png";
    }

    function pictureCache() {
        return ImageManager._cache || {};
    }

    function nextPictureToken(pictureId) {
        const nextToken = (pictureRequestTokens.get(pictureId) || 0) + 1;
        pictureRequestTokens.set(pictureId, nextToken);
        return nextToken;
    }

    function isLatestPictureToken(pictureId, token) {
        return pictureRequestTokens.get(pictureId) === token;
    }

    function currentPictureName(pictureId) {
        if (!$gameScreen || !$gameScreen.picture) {
            return "";
        }
        const picture = $gameScreen.picture(pictureId);
        return picture && picture.name ? String(picture.name() || "").trim() : "";
    }

    function trackPicture(name) {
        const key = String(name || "").trim();
        if (!key) {
            return;
        }
        const index = trackedPictureNames.indexOf(key);
        if (index >= 0) {
            trackedPictureNames.splice(index, 1);
        }
        trackedPictureNames.push(key);
    }

    function activePictureNames() {
        const active = new Set();
        if (!$gameScreen || !$gameScreen._pictures) {
            return active;
        }
        for (const picture of $gameScreen._pictures) {
            if (picture && picture.name && picture.name()) {
                active.add(picture.name());
            }
        }
        return active;
    }

    function waitBitmapReady(bitmap) {
        return new Promise(resolve => {
            if (!bitmap) {
                resolve(false);
                return;
            }
            if (bitmap.isReady()) {
                resolve(true);
                return;
            }
            bitmap.addLoadListener(() => resolve(bitmap.isReady()));
        });
    }

    function uploadBaseTexture(baseTexture) {
        return new Promise(resolve => {
            const renderer = Graphics.app && Graphics.app.renderer;
            if (!renderer || !baseTexture) {
                resolve(false);
                return;
            }

            try {
                baseTexture.update();

                const prepare = renderer.plugins && renderer.plugins.prepare;
                if (prepare && prepare.upload) {
                    prepare.upload(baseTexture, () => resolve(true));
                    return;
                }

                if (renderer.texture && renderer.texture.bind) {
                    renderer.texture.bind(baseTexture, 0);
                    resolve(true);
                    return;
                }
            } catch (e) {
                console.warn("PictureTextureWarmupMZ upload error:", e);
            }

            resolve(false);
        });
    }

    function renderBitmapOffscreen(bitmap) {
        return new Promise(resolve => {
            const renderer = Graphics.app && Graphics.app.renderer;
            if (!renderer || !bitmap || !bitmap.baseTexture) {
                resolve(false);
                return;
            }

            let sprite = null;
            let renderTexture = null;

            try {
                sprite = new Sprite();
                sprite.bitmap = bitmap;
                sprite._onBitmapLoad(bitmap);
                sprite.scale.x = bitmap.width > 0 ? 1 / bitmap.width : 1;
                sprite.scale.y = bitmap.height > 0 ? 1 / bitmap.height : 1;
                renderTexture = PIXI.RenderTexture.create(1, 1);
                renderer.render(sprite, renderTexture);
                resolve(true);
            } catch (e) {
                console.warn("PictureTextureWarmupMZ offscreen render error:", e);
                resolve(false);
            } finally {
                if (sprite) {
                    sprite.destroy();
                }
                if (renderTexture) {
                    renderTexture.destroy({ destroyBase: true });
                }
            }
        });
    }

    async function guaranteeBitmapRendered(bitmap) {
        const uploaded = await uploadBaseTexture(bitmap.baseTexture);
        const rendered = await renderBitmapOffscreen(bitmap);
        return uploaded || rendered;
    }

    function releasePicture(name) {
        const key = String(name || "").trim();
        if (!key || pendingWarmups.has(key) || activePictureNames().has(key)) {
            return false;
        }

        warmupCache.delete(key);

        const cache = pictureCache();
        const url = pictureUrl(key);
        const bitmap = cache[url];
        if (!bitmap) {
            return false;
        }

        delete cache[url];
        bitmap.destroy();

        const trackedIndex = trackedPictureNames.indexOf(key);
        if (trackedIndex >= 0) {
            trackedPictureNames.splice(trackedIndex, 1);
        }

        return true;
    }

    function trimTrackedPictures(keepLast, keepNames) {
        const keep = new Set(keepNames);
        const recent = trackedPictureNames.slice(-Math.max(0, keepLast));
        for (const name of recent) {
            keep.add(name);
        }
        for (const name of activePictureNames()) {
            keep.add(name);
        }

        const candidates = trackedPictureNames.slice();
        for (const name of candidates) {
            if (!keep.has(name)) {
                releasePicture(name);
            }
        }
    }

    async function warmupPicture(name) {
        const key = String(name || "").trim();
        if (!key) {
            return false;
        }

        if (warmupCache.has(key)) {
            return warmupCache.get(key);
        }

        const promise = (async () => {
            pendingWarmups.add(key);
            diag(key, NaN, "warmup start");
            const bitmap = ImageManager.loadPicture(key);
            const ready = await waitBitmapReady(bitmap);
            if (!ready) {
                diag(key, NaN, "warmup failed: bitmap not ready");
                return false;
            }
            trackPicture(key);
            const forced = await guaranteeBitmapRendered(bitmap);
            diag(key, NaN, "warmup done", {
                forced,
                width: bitmap.width,
                height: bitmap.height,
                baseValid: !!(bitmap.baseTexture && bitmap.baseTexture.valid)
            });
            return forced;
        })().finally(() => {
            pendingWarmups.delete(key);
        })();

        warmupCache.set(key, promise);
        return promise;
    }

    const _Game_Screen_showPicture = Game_Screen.prototype.showPicture;
    const _Game_Screen_erasePicture = Game_Screen.prototype.erasePicture;
    const _Game_Interpreter_command231 = Game_Interpreter.prototype.command231;

    function showPictureNow(screen, pictureArgs) {
        bypassAutoShowPicture = true;
        try {
            _Game_Screen_showPicture.apply(screen, pictureArgs);
        } finally {
            bypassAutoShowPicture = false;
        }
    }

    function finalizeInterpreterWarmup(interpreter) {
        if (interpreter) {
            interpreter._pictureTextureWarmupPending = false;
        }
    }

    function forceSpriteBitmapRefresh(sprite, expectedName) {
        if (!sprite || !sprite.bitmap || !sprite.bitmap.isReady()) {
            return;
        }

        const picture = sprite.picture && sprite.picture();
        if (!picture || picture.name() !== expectedName) {
            return;
        }

        // Force a texture/frame rebuild on the actual displayed Sprite_Picture.
        sprite._onBitmapChange();
        sprite._refresh();
        if (sprite.bitmap.width > 0 && sprite.bitmap.height > 0) {
            sprite.setFrame(0, 0, sprite.bitmap.width, sprite.bitmap.height);
        }
        sprite.visible = true;
        diag(expectedName, sprite._pictureId, "force sprite refresh applied", {
            visible: sprite.visible,
            opacity: sprite.opacity,
            bitmapReady: !!(sprite.bitmap && sprite.bitmap.isReady && sprite.bitmap.isReady()),
            bitmapW: sprite.bitmap ? sprite.bitmap.width : null,
            bitmapH: sprite.bitmap ? sprite.bitmap.height : null,
            texValid: !!(sprite.texture && sprite.texture.baseTexture && sprite.texture.baseTexture.valid),
            frameW: sprite.texture && sprite.texture.frame ? sprite.texture.frame.width : null,
            frameH: sprite.texture && sprite.texture.frame ? sprite.texture.frame.height : null
        });
    }

    function findPictureSpriteById(pictureId) {
        const scene = SceneManager && SceneManager._scene;
        const spriteset = scene && scene._spriteset;
        const container = spriteset && spriteset._pictureContainer;
        if (!container || !container.children) {
            return null;
        }
        return container.children.find(child => child && child._pictureId === pictureId) || null;
    }

    function schedulePictureSpriteRefresh(pictureId, expectedName, attempt = 0) {
        const sprite = findPictureSpriteById(pictureId);
        if (!sprite || !sprite.bitmap || !sprite.bitmap.isReady()) {
            if (attempt === 0 || attempt % 15 === 0) {
                diag(expectedName, pictureId, "sprite not ready yet", {
                    attempt,
                    hasSprite: !!sprite,
                    hasBitmap: !!(sprite && sprite.bitmap),
                    bitmapReady: !!(sprite && sprite.bitmap && sprite.bitmap.isReady && sprite.bitmap.isReady())
                });
            }
            if (attempt < 90) {
                setTimeout(() => schedulePictureSpriteRefresh(pictureId, expectedName, attempt + 1), 16);
            } else {
                diag(expectedName, pictureId, "sprite refresh timeout after retries");
            }
            return;
        }

        diag(expectedName, pictureId, "sprite found ready, forcing upload");
        guaranteeBitmapRendered(sprite.bitmap)
            .catch(error => {
                console.warn("PictureTextureWarmupMZ sprite upload retry error:", expectedName, error);
                return false;
            })
            .finally(() => {
                forceSpriteBitmapRefresh(sprite, expectedName);
            });
    }

    function scheduleAutoShowPicture(screen, pictureArgs, options = {}) {
        const pictureId = Number(pictureArgs[0] || 0);
        const name = String(pictureArgs[1] || "").trim();
        const interpreter = options.interpreter || null;
        const waitForWarmup = options.waitForWarmup !== false;

        if (!name) {
            showPictureNow(screen, pictureArgs);
            finalizeInterpreterWarmup(interpreter);
            return Promise.resolve(false);
        }

        diag(name, pictureId, "scheduleAutoShowPicture");

        const previousName = currentPictureName(pictureId);
        const requestToken = nextPictureToken(pictureId);

        if (waitForWarmup && interpreter && interpreter.setWaitMode) {
            interpreter._pictureTextureWarmupPending = true;
            interpreter.setWaitMode("pictureTextureWarmup");
        }

        return warmupPicture(name)
            .catch(error => {
                console.warn("PictureTextureWarmupMZ warmup error:", name, error);
                return false;
            })
            .finally(() => {
                if (!isLatestPictureToken(pictureId, requestToken)) {
                    diag(name, pictureId, "discarded by newer request token");
                    finalizeInterpreterWarmup(interpreter);
                    return;
                }

                trackPicture(name);
                showPictureNow(screen, pictureArgs);
                diag(name, pictureId, "showPictureNow executed");
                schedulePictureSpriteRefresh(pictureId, name);

                if (previousName && previousName !== name) {
                    releasePicture(previousName);
                }

                trimTrackedPictures(AUTO_TRIM_KEEP_LAST, [name]);
                finalizeInterpreterWarmup(interpreter);
            });
    }

    const _Sprite_Picture_updateBitmap = Sprite_Picture.prototype.updateBitmap;
    Sprite_Picture.prototype.updateBitmap = function() {
        _Sprite_Picture_updateBitmap.call(this);

        const picture = this.picture();
        if (!picture || !this.bitmap || !this.bitmap.isReady()) {
            return;
        }

        const pictureName = String(picture.name() || "").trim();
        if (!pictureName) {
            return;
        }

        if (
            this._ptwLastRenderedName === pictureName &&
            this._ptwLastRenderedBitmap === this.bitmap
        ) {
            return;
        }

        this._ptwLastRenderedName = pictureName;
        this._ptwLastRenderedBitmap = this.bitmap;

        guaranteeBitmapRendered(this.bitmap)
            .catch(error => {
                console.warn("PictureTextureWarmupMZ sprite warmup error:", pictureName, error);
                return false;
            })
            .finally(() => {
                forceSpriteBitmapRefresh(this, pictureName);
            });
    };

    Game_Screen.prototype.showPicture = function(
        pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode
    ) {
        const pictureArgs = [
            pictureId,
            name,
            origin,
            x,
            y,
            scaleX,
            scaleY,
            opacity,
            blendMode
        ];

        if (bypassAutoShowPicture) {
            return _Game_Screen_showPicture.apply(this, pictureArgs);
        }

        _Game_Screen_showPicture.apply(this, pictureArgs);

        const normalizedName = String(name || "").trim();
        if (!normalizedName) {
            return;
        }

        diag(normalizedName, pictureId, "global showPicture hook executed");

        const requestToken = nextPictureToken(Number(pictureId || 0));
        warmupPicture(normalizedName)
            .catch(error => {
                console.warn("PictureTextureWarmupMZ background warmup error:", normalizedName, error);
                return false;
            })
            .finally(() => {
                if (!isLatestPictureToken(Number(pictureId || 0), requestToken)) {
                    diag(normalizedName, pictureId, "global hook discarded by newer request token");
                    return;
                }
                trackPicture(normalizedName);
                schedulePictureSpriteRefresh(Number(pictureId || 0), normalizedName);
            });
    };

    Game_Screen.prototype.erasePicture = function(pictureId) {
        const previousName = currentPictureName(pictureId);
        nextPictureToken(pictureId);
        _Game_Screen_erasePicture.call(this, pictureId);
        if (previousName) {
            releasePicture(previousName);
        }
        trimTrackedPictures(AUTO_TRIM_KEEP_LAST, []);
    };

    Game_Interpreter.prototype.command231 = function(params) {
        const point = this.picturePoint(params);
        const pictureArgs = [
            params[0],
            params[1],
            params[2],
            point.x,
            point.y,
            params[6],
            params[7],
            params[8],
            params[9]
        ];

        scheduleAutoShowPicture($gameScreen, pictureArgs, {
            interpreter: this,
            waitForWarmup: true
        });
        return true;
    };

    PluginManager.registerCommand(PLUGIN_NAME, "warmup_pictures", args => {
        const names = parseNames(args.names);
        for (const name of names) {
            warmupPicture(name);
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "release_pictures", args => {
        const names = parseNames(args.names);
        for (const name of names) {
            releasePicture(name);
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "trim_tracked_pictures", args => {
        const keepLast = Number(args.keepLast || 2);
        const keepNames = parseNames(args.keepNames);
        trimTrackedPictures(keepLast, keepNames);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "show_picture_after_warmup", function(args) {
        const pictureId = Number(args.pictureId || 1);
        const name = String(args.name || "").trim();
        const origin = Number(args.origin || 0);
        const x = Number(args.x || 0);
        const y = Number(args.y || 0);
        const scaleX = Number(args.scaleX || 100);
        const scaleY = Number(args.scaleY || 100);
        const opacity = Number(args.opacity || 255);
        const blendMode = Number(args.blendMode || 0);
        const waitForWarmup = String(args.waitForWarmup || "true") === "true";

        scheduleAutoShowPicture($gameScreen, [
            pictureId,
            name,
            origin,
            x,
            y,
            scaleX,
            scaleY,
            opacity,
            blendMode
        ], {
            interpreter: this,
            waitForWarmup
        });
    });
})();
