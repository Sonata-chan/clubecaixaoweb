/*:
 * @target MZ
 * @author Freef
 * @help Version 1.0.0.
 * Adds custom plugin command for requesting audio files before they are used.
 *
 * Non-SE files are partially loaded (first 500kb) for faster start and less contention.
 *
 * @plugindesc Preload specified audio files into browser cache for later use
 * @command preload_audios
 * @text Preload Audios
 * @desc Preload a comma separated list of audios
 *
 * @arg folderSelect
 * @type select
 * @text Folder
 * @desc Folder under audio/ from which to load
 * @option se
 * @value se
 * @option me
 * @value me
 * @option bgs
 * @value bgs
 * @option bgm
 * @value bgm
 * @default se
 *
 * @arg names
 * @type string
 * @text Audio Names
 * @default mysound1,mysound2,mysound3
 * @desc Comma separated list of audio filenames, no extension
 */

(() => {
    const PLUGIN_NAME = "AudioPreloadFreefMZ";
    const PARTIAL_PRELOAD_BYTES = 256 * 1024;
    const MAX_CONCURRENT = 1;
    const REQUEST_GAP_MS = 150;
    const preloadQueue = [];
    let activePreloads = 0;

    function runQueue() {
        while (activePreloads < MAX_CONCURRENT && preloadQueue.length > 0) {
            const task = preloadQueue.shift();
            activePreloads += 1;

            task()
                .catch(error => {
                    console.warn("AudioPreloadFreefMZ task error:", error);
                })
                .finally(() => {
                    activePreloads -= 1;
                    setTimeout(runQueue, REQUEST_GAP_MS);
                });
        }
    }

    function enqueuePreload(task) {
        preloadQueue.push(task);
        runQueue();
    }

    async function preloadAudio(filePath, fullDownload) {
        const controller = new AbortController();

        try {
            const response = await fetch(filePath, {
                signal: controller.signal,
                cache: "force-cache"
            });

            if (!response.ok) {
                return;
            }

            if (fullDownload) {
                await response.arrayBuffer();
                return;
            }

            if (!response.body || !response.body.getReader) {
                return;
            }

            const reader = response.body.getReader();
            let bytesRead = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done || !value) {
                    break;
                }
                bytesRead += value.byteLength;
                if (bytesRead >= PARTIAL_PRELOAD_BYTES) {
                    controller.abort();
                    break;
                }
            }
        } catch (e) {
            if (e && e.name === "AbortError") {
                return;
            }
            console.error("AudioPreloadFreefMZ fetch error:", filePath, e);
        }
    }

    PluginManager.registerCommand(PLUGIN_NAME, "preload_audios", args => {
        const folder = String(args.folderSelect || "se");
        const names = String(args.names || "")
            .split(",")
            .map(name => name.trim())
            .filter(Boolean);

        for (const name of names) {
            const filePath = "audio/" + folder + "/" + name + ".ogg";
            const fullDownload = folder === "se";
            enqueuePreload(() => preloadAudio(filePath, fullDownload));
        }
    });
})();
