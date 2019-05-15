class ArUcoMarkerTracker
{
    static _CreateMarkerTrackingWorker(location) {
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
            if (!this.markerTrackerModule) {
                postMessage({ initialized: false });
                return;
            }

            var args = event.data;

            var buf = this.markerTrackerModule._malloc(args.imageData.length * args.imageData.BYTES_PER_ELEMENT);
            this.markerTrackerModule.HEAPU8.set(args.imageData, buf);
            var numMarkers = this.markerTrackerModule._process_image(args.width, args.height, buf, 1);
            this.markerTrackerModule._free(buf);

            markers = [];
            var offset = 0;
            var id = 0;
            var tx = 0.0;
            var ty = 0.0;
            var tz = 0.0;
            var rx = 0.0;
            var ry = 0.0;
            var rz = 0.0;
            for (var markerIdx = 0; markerIdx < numMarkers; markerIdx++) {
                var ptr = this.markerTrackerModule._get_tracked_marker(markerIdx);

                offset = 0;
                id = this.markerTrackerModule.getValue(ptr + offset, "i32");
                offset += 12;
                tx = this.markerTrackerModule.getValue(ptr + offset, "double");
                offset += 8;
                ty = this.markerTrackerModule.getValue(ptr + offset, "double");
                offset += 8;
                tz = this.markerTrackerModule.getValue(ptr + offset, "double");
                offset += 8;
                rx = this.markerTrackerModule.getValue(ptr + offset, "double");
                offset += 8;
                ry = this.markerTrackerModule.getValue(ptr + offset, "double");
                offset += 8;
                rz = this.markerTrackerModule.getValue(ptr + offset, "double");

                markers.push({
                    id: id,
                    tx: tx,
                    ty: ty,
                    tz: tz,
                    rx: rx,
                    ry: ry,
                    rz: rz
                })
            }

            postMessage({ markers: markers });
        }

        var getLocationFunction = "function GetLocation() { return \"" + location + "\"; }";

        return CreateWebWorkerFromFunctions([CreateWebAssemblyModule, WebWorkerOnMessage, getLocationFunction, function () {
            this.onmessage = WebWorkerOnMessage;
    
            var jsUrl = GetLocation() + "/webpiled-aruco-ar/webpiled-aruco-ar.js";
            var wasmUrl = GetLocation() + "/webpiled-aruco-ar/webpiled-aruco-ar.wasm";
            CreateWebAssemblyModule(jsUrl, wasmUrl).then(function (markerTracker) {
                this.markerTrackerModule = markerTracker;
            });
        }]);
    }

    static CreateAsync(location) {
        if (!location) {
            location = "https://syntheticmagus.github.io/webpiled-aruco-ar/v0.02";
        }

        return ArUcoMarkerTracker._CreateMarkerTrackingWorker(location).then(function (worker) {
            var markerTracker = new ArUcoMarkerTracker(worker);
            return markerTracker;
        });
    };

    constructor(worker) {
        this._markerTrackingWorker = worker;
    }

    findMarkersInImage(videoTexture) {
        var width = videoTexture.getSize().width;
        var height = videoTexture.getSize().height;
        var imageData = videoTexture.readPixels();
        var tracker = this._markerTrackingWorker;

        var promise = new Promise(function (resolve) {
            tracker.onmessage = function (event) {
                resolve(event.markers);
            };
        });

        this._markerTrackingWorker.postMessage({
            width: width,
            height: height,
            imageData: new Uint8Array(imageData)
        });

        return promise;
    };
}