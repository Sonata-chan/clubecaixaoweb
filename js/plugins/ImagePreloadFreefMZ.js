/*:
 * @target MZ
 * @author Freef
 * @help Version 1.0.0.
 * Adds custom plugin command for requesting (more) images before they are used.
 *
 * USE WITH CARE:
 * Image downloads will slow down other downloads, such as sounds or music.
 *
 * @plugindesc Preload specified images into local device cache for later use
 * @command preload_images
 * @text Preload Images
 * @desc Preload a comma separated list of bitmaps
 *
 * @arg folderSelect
 * @text Folder
 * @type select
 * @option pictures
 * @option parallaxes
 * @option battlebacks1
 * @option battlebacks2
 * @option characters
 * @option enemies
 * @option faces
 * @option sv_actors
 * @option sv_enemies
 * @option system
 * @option tilesets
 * @option titles1
 * @option titles2
 * @desc Folder under img/ from which to load
 * @default pictures
 *
 * @arg names
 * @text Image Names
 * @type string
 * @default myimage1,myimage2,myimage3
 * @desc Comma separated list of image filenames, no extension. Example: myimg1,myimg2,myimg3
 */

(() => {
    const PLUGIN_NAME = "ImagePreloadFreefMZ";
    const MAX_CONCURRENT = 2;
    const REQUEST_GAP_MS = 120;
    const preloadQueue = [];
    let activePreloads = 0;

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

    function runQueue() {
        while (activePreloads < MAX_CONCURRENT && preloadQueue.length > 0) {
            const task = preloadQueue.shift();
            activePreloads += 1;

            task()
                .catch(error => {
                    console.warn("ImagePreloadFreefMZ preload error:", error);
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

    PluginManager.registerCommand(PLUGIN_NAME, "preload_images", args => {
        const folder = String(args.folderSelect || "pictures");
        const basePath = "img/" + folder + "/";
        const names = String(args.names || "")
            .split(",")
            .map(name => name.trim())
            .filter(Boolean);

        for (const name of names) {
            enqueuePreload(async () => {
                const bitmap = ImageManager.loadBitmap(basePath, name, 0, true);
                await waitBitmapReady(bitmap);
            });
        }
    });
})();
