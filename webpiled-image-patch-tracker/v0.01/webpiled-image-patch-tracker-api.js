var _webpiledImagePatchTrackerWorker = new Worker("webpiled-image-patch-tracker-worker.js");

function StartTrackingImagePatch(width, height, bytes, x, y) {
    return new Promise(function (resolve) {
        _webpiledImagePatchTrackerWorker.onmessage = function (event) {
            _webpiledImagePatchTrackerWorker.onmessage = function () {};
            resolve(event);
        }

        _webpiledImagePatchTrackerWorker.postMessage({
            width: width,
            height: height,
            bytes: bytes,
            x: x,
            y: y
        });
    });
}

function TrackPatchInImage(width, height, bytes) {
    return new Promise(function (resolve) {
        _webpiledImagePatchTrackerWorker.onmessage = function (event) {
            _webpiledImagePatchTrackerWorker.onmessage = function () {};
            resolve(event);
        }

        _webpiledImagePatchTrackerWorker.postMessage({
            width: width,
            height: height,
            bytes: bytes,
            x: x,
            y: y
        });

    });
}