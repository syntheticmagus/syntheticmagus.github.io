self.importScripts("webpiled-image-patch-tracker.js");

onmessage = function (event) {
    postMessage({ error: "ERROR: tracker not yet loaded." });
}
  
var patchTrackerModule = null;
WebpiledImagePatchTracker().then(function (Module) {
    patchTrackerModule = Module;

    onmessage = function (event) {
        var data = event.data;

        var buf = patchTrackerModule._malloc(data.bytes.length * data.bytes.BYTES_PER_ELEMENT);
        patchTrackerModule.HEAP8.set(data.bytes, buf);
        if (data.x && data.y) {
            patchTrackerModule._uninitialize();
            patchTrackerModule._initialize(data.width, data.height, buf, data.x, data.y);
            postMessage({ initialized: true });
        }
        else {
            if (patchTrackerModule._track_patch_in_image(data.width, data.height, buf)) {
                var x = patchTrackerModule._get_patch_center_x();
                var y = patchTrackerModule._get_patch_center_y();

                postMessage({ patchFound: true, x: x, y: y });
            }
            else {
                postMessage({ patchFound: false });
            }
        }
    }
});