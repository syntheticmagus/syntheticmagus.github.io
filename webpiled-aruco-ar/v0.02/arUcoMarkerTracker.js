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

            if (args.reset) {
                markerTracker._reset();
            }
            else if (args.calibrate) {
                this.markerTrackerModule._set_calibration_from_frame_size(args.width, args.height);
                postMessage({});
            }
            else if (args.track) {
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
                    });
                }

                postMessage({ markers: markers });
            }
        }

        var getLocationFunction = "function GetLocation() { return \"" + location + "\"; }";

        return CreateWebWorkerFromFunctions([CreateWebAssemblyModule, WebWorkerOnMessage, getLocationFunction, function () {
            this.onmessage = WebWorkerOnMessage;
    
            var jsUrl = GetLocation() + "/webpiled-aruco-ar/webpiled-aruco-ar.js";
            var wasmUrl = GetLocation() + "/webpiled-aruco-ar/webpiled-aruco-ar.wasm";
            CreateWebAssemblyModule(jsUrl, wasmUrl).then(function (markerTracker) {
                markerTracker._reset();
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

    setCalibration(width, height) {
        var tracker = this._markerTrackingWorker;
        var promise = new Promise(function (resolve) {
            tracker.onmessage = function () {
                resolve();
            };
        });

        this._markerTrackingWorker.postMessage({
            calibrate: true,
            width: width,
            height: height
        });

        return promise;
    }

    findMarkersInImage(videoTexture) {
        var width = videoTexture.getSize().width;
        var height = videoTexture.getSize().height;
        var imageData = videoTexture.readPixels();
        var tracker = this._markerTrackingWorker;

        var promise = new Promise(function (resolve) {
            tracker.onmessage = function (event) {
                resolve(event.data.markers);
            };
        });

        this._markerTrackingWorker.postMessage({
            track: true,
            width: width,
            height: height,
            imageData: new Uint8Array(imageData)
        });

        return promise;
    };
}

// DEBUG: Draft Babylon.js API below.

class TrackedNode extends BABYLON.TransformNode {
    constructor(name, scene, disableWhenNotTracked = true) {
        super(name, scene, true);

        this._isTracking = false;
        this.disableWhenNotTracked = disableWhenNotTracked;
        if (this.disableWhenNotTracked) {
            this.setEnabled(false);
        }

        this.onTrackingAcquiredObservable = new BABYLON.Observable(observer => {
            if (this._isTracking) {
                this.onTrackingAcquiredObservable.notifyObserver(observer, this);
            }
        });
        this.onTrackingLostObservable = new BABYLON.Observable();

        this.rotationQuaternion = BABYLON.Quaternion.Identity();
    }

    isTracking() {
        return this._isTracking;
    }

    setTracking(position, rotation, isTracking) {
        this.position.copyFrom(position);
        this.rotationQuaternion.copyFrom(rotation);

        if (!this._isTracking && isTracking) {
            this.onTrackingAcquiredObservable.notifyObservers(this);
        }
        else if (this._isTracking && !isTracking) {
            this.onTrackingLostObservable.notifyObservers(this);
        }
        this._isTracking = isTracking;
        this.setEnabled(!this.disableWhenNotTracked || this._isTracking);
    }
}

class ArUcoMetaMarkerObjectTracker {
    constructor(videoTexture, scene) {
        this._scene = scene;
        this._videoTexture = videoTexture;
        this._runTrackingObserver = null;
        this._tracker = null;
        this._trackableObjects = {};

        this.__posEstimate = BABYLON.Vector3.Zero();
        this.__posEstimateCount = 0.0;
        this.__rightEstimate = BABYLON.Vector3.Zero();
        this.__rightEstimateCount = 0.0;
        this.__forwardEstimate = BABYLON.Vector3.Zero();
        this.__forwardEstimateCount = 0.0;
        this.__scratchVec = BABYLON.Vector3.Zero();
        this.__targetPosition = BABYLON.Vector3.Zero();
        this.__targetRotation = BABYLON.Quaternion.Identity();
        this.__ulId = -1;
        this.__urId = -1;
        this.__llId = -1;
        this.__lrId = -1;
    }

    addTrackableObject(ul, ur, ll, lr) {
        const descriptor = [ul, ur, ll, lr];
        this._trackableObjects[descriptor] = new TrackedNode(descriptor.toString(), this._scene);
        return this._trackableObjects[descriptor];
    }

    processResults(results) {
        // TODO: THIS IS HACKED CODE

        for (var descriptor in this._trackableObjects) {
            var nums = descriptor.split(',');
            this.__ulId = parseInt(nums[0]);
            this.__urId = parseInt(nums[1]);
            this.__llId = parseInt(nums[2]);
            this.__lrId = parseInt(nums[3]);

            this.__posEstimate.set(0.0, 0.0, 0.0);
            this.__posEstimateCount = 0.0;
            this.__rightEstimate.set(0.0, 0.0, 0.0);
            this.__rightEstimateCount = 0.0;
            this.__forwardEstimate.set(0.0, 0.0, 0.0);
            this.__forwardEstimateCount = 0.0;

            if (results[this.__llId]) {
                if (results[this.__urId]) {
                    this.__scratchVec.set(0.0, 0.0, 0.0);
                    this.__scratchVec.addInPlace(results[this.__llId].position);
                    this.__scratchVec.addInPlace(results[this.__urId].position);
                    this.__scratchVec.scaleInPlace(0.5);
                    
                    this.__posEstimate.addInPlace(this.__scratchVec);
                    this.__posEstimateCount += 1.0;
                }

                if (results[this.__lrId]) {
                    this.__scratchVec.set(0.0, 0.0, 0.0);
                    this.__scratchVec.addInPlace(results[this.__lrId].position);
                    this.__scratchVec.subtractInPlace(results[this.__llId].position);
                    this.__scratchVec.normalize();
                    
                    this.__rightEstimate.addInPlace(this.__scratchVec);
                    this.__rightEstimateCount += 1.0;
                }
                
                if (results[this.__ulId]) {
                    this.__scratchVec.set(0.0, 0.0, 0.0);
                    this.__scratchVec.addInPlace(results[this.__ulId].position);
                    this.__scratchVec.subtractInPlace(results[this.__llId].position);
                    this.__scratchVec.normalize();
                    
                    this.__forwardEstimate.addInPlace(this.__scratchVec);
                    this.__forwardEstimateCount += 1.0;
                }
            }

            if (results[this.__urId]) {
                if (results[this.__lrId]) {
                    this.__scratchVec.set(0.0, 0.0, 0.0);
                    this.__scratchVec.addInPlace(results[this.__urId].position);
                    this.__scratchVec.subtractInPlace(results[this.__lrId].position);
                    this.__scratchVec.normalize();
                    
                    this.__forwardEstimate.addInPlace(this.__scratchVec);
                    this.__forwardEstimateCount += 1.0;
                }
                
                if (results[this.__ulId]) {
                    this.__scratchVec.set(0.0, 0.0, 0.0);
                    this.__scratchVec.addInPlace(results[this.__urId].position);
                    this.__scratchVec.subtractInPlace(results[this.__ulId].position);
                    this.__scratchVec.normalize();
                    
                    this.__rightEstimate.addInPlace(this.__scratchVec);
                    this.__rightEstimateCount += 1.0;
                }
            }

            if (results[this.__lrId] && results[this.__ulId]) {
                this.__scratchVec.set(0.0, 0.0, 0.0);
                this.__scratchVec.addInPlace(results[this.__lrId].position);
                this.__scratchVec.addInPlace(results[this.__ulId].position);
                this.__scratchVec.scaleInPlace(0.5);
                
                this.__posEstimate.addInPlace(this.__scratchVec);
                this.__posEstimateCount += 1.0;
            }

            if (this.__posEstimateCount * this.__rightEstimateCount * this.__forwardEstimateCount > 0) {
                this.__posEstimate.scaleInPlace(1.0 / this.__posEstimateCount);
                this.__rightEstimate.scaleInPlace(1.0 / this.__rightEstimateCount);
                this.__forwardEstimate.scaleInPlace(1.0 / this.__forwardEstimateCount);

                this.__targetPosition.copyFrom(this.__posEstimate);
                BABYLON.Quaternion.RotationQuaternionFromAxisToRef(
                    this.__rightEstimate, 
                    BABYLON.Vector3.Cross(this.__forwardEstimate, this.__rightEstimate), 
                    this.__forwardEstimate,
                    this.__targetRotation);

                this._trackableObjects[descriptor].setTracking(
                    this.__targetPosition, 
                    this.__targetRotation, 
                    true);
            }
            else {
                this._trackableObjects[descriptor].setTracking(
                    this.__targetPosition, 
                    this.__targetRotation, 
                    false);
            }
        }
    }

    setCalibrationAsync(scalar = 1) {
        return this._tracker.setCalibration(
            Math.round(scalar * this._videoTexture.getSize().width), 
            Math.round(scalar * this._videoTexture.getSize().height));
    }

    static getQuaternionFromRodrigues(x, y, z) {
        var rot = new BABYLON.Vector3(-x, y, -z);
        var theta = rot.length();
        rot.scaleInPlace(1.0 / theta);
        if (theta !== 0.0) {
            return BABYLON.Quaternion.RotationAxis(rot, theta);
        }
        else {
            return null;
        }
    };

    startTracking() {
        var running = false;
        this._runTrackingObserver = this._scene.onAfterRenderObservable.add(() => {
            if (!running) {
                running = true;

                this._tracker.findMarkersInImage(this._videoTexture).then(markers => {
                    if (markers) {
                        var results = {};

                        markers.forEach(marker => {
                            results[marker.id] = {
                                position: new BABYLON.Vector3(marker.tx, -marker.ty, marker.tz),
                                rotation: ArUcoMetaMarkerObjectTracker.getQuaternionFromRodrigues(marker.rx, marker.ry, marker.rz)
                            }
                        });

                        this.processResults(results);
                    }

                    running = false;
                });
            }
        });
    }

    stopTracking() {
        this._scene.onAfterRenderObservable.remove(this._runTrackingObserver);
        this._runTrackingObserver = null;
    }

    static createAsync(videoTexture, scene) {
        var objectTracker = new ArUcoMetaMarkerObjectTracker(videoTexture, scene);
        return ArUcoMarkerTracker.CreateAsync().then(tracker => {
            objectTracker._tracker = tracker;
            return objectTracker.setCalibrationAsync();
        }).then(() => {
            return objectTracker;
        });
    }
}
