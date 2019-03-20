// ------------------ WORKER PORTION ------------------

function CreateWebWorkerFromFunctions(functions) {
    return new Promise(function (resolve) {
        var workerCode = "";
        for (var idx = 0; idx < functions.length - 1; idx++) {
            workerCode += functions[idx].toString();
        }
        workerCode += "(" + functions[functions.length - 1].toString() + ")();";
        resolve(new Worker(window.URL.createObjectURL(new Blob([workerCode]))));
    });
}

function CreateWebAssemblyModule(jsUrl, wasmUrl) {
    return new Promise(function (resolve) {
        var request = new XMLHttpRequest();
        request.addEventListener("load", function () {
            var moduleDefinition = `Module = {
                locateFile: function (path) {
                    return wasmUrl;
                },
                onRuntimeInitialized: function () {
                    resolve(Module);
                }
            };`
            eval(moduleDefinition + request.responseText);
        });
        request.open("GET", jsUrl, true);
        request.send();
    });
}

function WebWorkerOnMessage(event) {
    if (!this.patchTrackerModule) {
        postMessage({ initialized: false });
        return;
    }

    var args = event.data;

    var buf = this.patchTrackerModule._malloc(args.imageData.length * args.imageData.BYTES_PER_ELEMENT);
    this.patchTrackerModule.HEAPU8.set(args.imageData, buf);
    if (args.x && args.y) {
        this.patchTrackerModule._uninitialize();
        this.patchTrackerModule._initialize(args.width, args.height, buf, args.x, args.y);

        postMessage({ initialized: true });
    }
    else {
        if (patchTrackerModule._track_patch_in_image(args.width, args.height, buf)) {
            var tx = patchTrackerModule._get_patch_center_x();
            var ty = patchTrackerModule._get_patch_center_y();

            postMessage({ tracked: true, x: tx, y: ty });
        }
        else {
            postMessage({ tracked: false });
        }
    }
    patchTrackerModule._free(buf);
}

function CreatePatchTrackingWorker() {
    return CreateWebWorkerFromFunctions([CreateWebAssemblyModule, WebWorkerOnMessage, function () {
        this.onmessage = WebWorkerOnMessage;

        var location = self.location.href;
        console.log("I'm in location: " + location);
        var jsUrl = location + "/webpiled-image-patch-tracker/webpiled-image-patch-tracker.js";
        var wasmUrl = location + "/webpiled-image-patch-tracker/webpiled-image-patch-tracker.wasm";
        CreateWebAssemblyModule(jsUrl, wasmUrl).then(function (patchTracker) {
            this.patchTrackerModule = patchTracker;
        });
    }]);
}

// ------------------ NON-WORKER PORTION ------------------

var patchTrackingWorker;
CreatePatchTrackingWorker().then(function (worker) {
    patchTrackingWorker = worker;
});

function StartTrackingPatchInImage(videoTexture, x, y) {
    var width = videoTexture.getSize().width;
    var height = videoTexture.getSize().height;
    var imageData = videoTexture.readPixels();

    var promise = new Promise(function (resolve) {
        patchTrackingWorker.onmessage = function (event) {
            patchTrackingWorker.onmessage = function () {};
            resolve(event.data.initialized);
        };
    });

    patchTrackingWorker.postMessage({
        width: width,
        height: height,
        imageData: new Uint8Array(imageData),
        x: x,
        y: y
    });

    return promise;
}

function TrackPatchInImage(videoTexture) {
    var width = videoTexture.getSize().width;
    var height = videoTexture.getSize().height;
    var imageData = videoTexture.readPixels();

    var promise = new Promise(function (resolve) {
        patchTrackingWorker.onmessage = function (event) {
            patchTrackingWorker.onmessage = function () {};
            resolve(event.data);
        };
    });

    patchTrackingWorker.postMessage({
        width: width,
        height: height,
        imageData: new Uint8Array(imageData)
    });

    return promise;
}