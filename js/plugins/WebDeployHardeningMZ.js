/*:
 * @target MZ
 * @author Copilot
 * @plugindesc Web deploy hardening: optional asset versioning, WebGL context recovery and network resiliency.
 *
 * @param assetVersion
 * @text Asset Version
 * @type string
 * @default
 * @desc Optional cache-busting version. Example: 2026-05-23a
 *
 * @param autoReloadOnContextLoss
 * @text Auto Reload On Context Loss
 * @type boolean
 * @default true
 * @on Yes
 * @off No
 * @desc Automatically reload the page if WebGL context is lost.
 *
 * @param contextReloadDelayMs
 * @text Context Reload Delay (ms)
 * @type number
 * @min 200
 * @max 10000
 * @default 1200
 * @desc Delay before reloading after context loss.
 *
 * @param logEvents
 * @text Log Events
 * @type boolean
 * @default true
 * @on Yes
 * @off No
 * @desc Logs hardening events in browser console.
 */

(() => {
    const PLUGIN_NAME = "WebDeployHardeningMZ";
    const params = PluginManager.parameters(PLUGIN_NAME);

    const assetVersion = String(params.assetVersion || "").trim();
    const autoReloadOnContextLoss = String(params.autoReloadOnContextLoss || "true") === "true";
    const contextReloadDelayMs = Number(params.contextReloadDelayMs || 1200);
    const logEvents = String(params.logEvents || "true") === "true";

    let contextLost = false;
    let reloadScheduled = false;

    function log(message, extra) {
        if (!logEvents) {
            return;
        }
        if (extra !== undefined) {
            console.log("[WEB-HARDEN] " + message, extra);
        } else {
            console.log("[WEB-HARDEN] " + message);
        }
    }

    function withVersion(url) {
        if (!assetVersion || !url) {
            return url;
        }
        if (/^https?:\/\//i.test(url) && !url.includes(window.location.host)) {
            return url;
        }
        if (url.includes("v=")) {
            return url;
        }
        return url + (url.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(assetVersion);
    }

    function attachCanvasContextWatch(canvas) {
        if (!canvas || canvas.__webHardeningAttached) {
            return;
        }

        canvas.__webHardeningAttached = true;

        canvas.addEventListener("webglcontextlost", event => {
            contextLost = true;
            log("webglcontextlost detected");
            event.preventDefault();

            if (autoReloadOnContextLoss && !reloadScheduled) {
                reloadScheduled = true;
                setTimeout(() => {
                    log("reloading page after context loss");
                    window.location.reload();
                }, Math.max(200, contextReloadDelayMs));
            }
        });

        canvas.addEventListener("webglcontextrestored", () => {
            contextLost = false;
            reloadScheduled = false;
            log("webglcontextrestored detected");
            try {
                if (Graphics && Graphics.showScreen) {
                    Graphics.showScreen();
                }
            } catch (error) {
                log("error during context restore handling", String(error));
            }
        });
    }

    const _Graphics_createCanvas = Graphics._createCanvas;
    Graphics._createCanvas = function() {
        _Graphics_createCanvas.call(this);
        attachCanvasContextWatch(this._canvas);
    };

    const _ImageManager_loadBitmapFromUrl = ImageManager.loadBitmapFromUrl;
    ImageManager.loadBitmapFromUrl = function(url) {
        return _ImageManager_loadBitmapFromUrl.call(this, withVersion(url));
    };

    const _DataManager_loadDataFile = DataManager.loadDataFile;
    DataManager.loadDataFile = function(name, src) {
        if (!assetVersion) {
            _DataManager_loadDataFile.call(this, name, src);
            return;
        }

        const xhr = new XMLHttpRequest();
        const url = "data/" + src;
        const finalUrl = withVersion(url);
        window[name] = null;
        xhr.open("GET", finalUrl);
        xhr.overrideMimeType("application/json");
        xhr.onload = () => this.onXhrLoad(xhr, name, src, finalUrl);
        xhr.onerror = () => this.onXhrError(name, src, finalUrl);
        xhr.send();
    };

    const _AudioManager_createBuffer = AudioManager.createBuffer;
    AudioManager.createBuffer = function(folder, name) {
        if (!assetVersion) {
            return _AudioManager_createBuffer.call(this, folder, name);
        }

        const ext = this.audioFileExt();
        const url = withVersion(this._path + folder + Utils.encodeURI(name) + ext);
        const buffer = new WebAudio(url);
        buffer.name = name;
        buffer.frameCount = Graphics.frameCount;
        return buffer;
    };

    log("initialized", {
        assetVersion,
        autoReloadOnContextLoss,
        contextReloadDelayMs
    });
})();
