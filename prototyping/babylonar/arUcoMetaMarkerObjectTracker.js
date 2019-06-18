(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.BabylonAR = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dedicatedWorker_1 = require("./dedicatedWorker");
var ArUcoMarkerTracker = /** @class */ (function () {
    function ArUcoMarkerTracker() {
    }
    ArUcoMarkerTracker.onInitialized = function () {
        dedicatedWorker_1.DedicatedWorker.module()._reset();
        dedicatedWorker_1.DedicatedWorker.postMessage({ initialized: true });
    };
    ArUcoMarkerTracker.onMessage = function (event) {
        var args = event.data;
        if (args.reset) {
            dedicatedWorker_1.DedicatedWorker.module()._reset();
            dedicatedWorker_1.DedicatedWorker.postMessage({ reset: true });
        }
        else if (args.calibrate) {
            dedicatedWorker_1.DedicatedWorker.module()._set_calibration_from_frame_size(args.width, args.height);
            dedicatedWorker_1.DedicatedWorker.postMessage({ calibrated: true });
        }
        else if (args.track) {
            var buf = dedicatedWorker_1.DedicatedWorker.module()._malloc(args.imageData.length * args.imageData.BYTES_PER_ELEMENT);
            dedicatedWorker_1.DedicatedWorker.module().HEAP8.set(args.imageData, buf);
            var numMarkers = dedicatedWorker_1.DedicatedWorker.module()._process_image(args.width, args.height, buf, 1);
            dedicatedWorker_1.DedicatedWorker.module()._free(buf);
            var markers = [];
            var offset = 0;
            var id = 0;
            var tx = 0.0;
            var ty = 0.0;
            var tz = 0.0;
            var rx = 0.0;
            var ry = 0.0;
            var rz = 0.0;
            for (var markerIdx = 0; markerIdx < numMarkers; markerIdx++) {
                var ptr = dedicatedWorker_1.DedicatedWorker.module()._get_tracked_marker(markerIdx);
                offset = 0;
                id = dedicatedWorker_1.DedicatedWorker.module().getValue(ptr + offset, "i32");
                offset += 12;
                tx = dedicatedWorker_1.DedicatedWorker.module().getValue(ptr + offset, "double");
                offset += 8;
                ty = dedicatedWorker_1.DedicatedWorker.module().getValue(ptr + offset, "double");
                offset += 8;
                tz = dedicatedWorker_1.DedicatedWorker.module().getValue(ptr + offset, "double");
                offset += 8;
                rx = dedicatedWorker_1.DedicatedWorker.module().getValue(ptr + offset, "double");
                offset += 8;
                ry = dedicatedWorker_1.DedicatedWorker.module().getValue(ptr + offset, "double");
                offset += 8;
                rz = dedicatedWorker_1.DedicatedWorker.module().getValue(ptr + offset, "double");
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
            dedicatedWorker_1.DedicatedWorker.postMessage({
                markers: markers
            });
        }
    };
    ArUcoMarkerTracker.createAsync = function () {
        return new Promise(function (resolve) {
            var tracker = new ArUcoMarkerTracker();
            tracker._worker = dedicatedWorker_1.DedicatedWorker.createFromLocation(ArUcoMarkerTracker.MODULE_URL, ArUcoMarkerTracker.onInitialized, ArUcoMarkerTracker.onMessage);
            tracker._worker.onmessage = function (event) {
                tracker._worker.onmessage = dedicatedWorker_1.DedicatedWorker.unexpectedMessageHandler;
                resolve(tracker);
            };
        });
    };
    ArUcoMarkerTracker.prototype.setCalibrationAsync = function (width, height) {
        var _this = this;
        var promise = new Promise(function (resolve, reject) {
            _this._worker.onmessage = function (result) {
                _this._worker.onmessage = dedicatedWorker_1.DedicatedWorker.unexpectedMessageHandler;
                if (result.data.calibrated) {
                    resolve();
                }
                else {
                    reject(result.data);
                }
            };
        });
        this._worker.postMessage({
            calibrate: true,
            width: width,
            height: height
        });
        return promise;
    };
    ArUcoMarkerTracker.prototype.findMarkersInImageAsync = function (videoTexture) {
        var _this = this;
        var promise = new Promise(function (resolve, reject) {
            _this._worker.onmessage = function (result) {
                _this._worker.onmessage = dedicatedWorker_1.DedicatedWorker.unexpectedMessageHandler;
                if (result.data.markers) {
                    resolve(result.data.markers);
                }
                else {
                    reject(result.data);
                }
            };
        });
        this._worker.postMessage({
            track: true,
            width: videoTexture.getSize().width,
            height: videoTexture.getSize().height,
            imageData: videoTexture.readPixels()
        });
        return promise;
    };
    ArUcoMarkerTracker.MODULE_URL = "https://syntheticmagus.github.io/webpiled-aruco-ar/v0.02/webpiled-aruco-ar/webpiled-aruco-ar.js";
    return ArUcoMarkerTracker;
}());
exports.ArUcoMarkerTracker = ArUcoMarkerTracker;
},{"./dedicatedWorker":3}],2:[function(require,module,exports){
(function (global){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = (typeof window !== "undefined" ? window['BABYLON'] : typeof global !== "undefined" ? global['BABYLON'] : null);
var arUcoMarkerTracker_1 = require("./arUcoMarkerTracker");
var filteredVector3_1 = require("./filteredVector3");
var trackedNode_1 = require("./trackedNode");
var ArUcoMetaMarkerObjectTracker = /** @class */ (function () {
    function ArUcoMetaMarkerObjectTracker(videoTexture, scene) {
        this._runTrackingObserver = null;
        this._trackableObjects = new babylonjs_1.StringDictionary();
        this.__posEstimate = babylonjs_1.Vector3.Zero();
        this.__posEstimateCount = 0;
        this.__rightEstimate = babylonjs_1.Vector3.Zero();
        this.__rightEstimateCount = 0;
        this.__forwardEstimate = babylonjs_1.Vector3.Zero();
        this.__forwardEstimateCount = 0;
        this.__scratchVec = babylonjs_1.Vector3.Zero();
        this.__filteredPos = new filteredVector3_1.FilteredVector3(0.0, 0.0, 0.0);
        this.__filteredRight = new filteredVector3_1.FilteredVector3(0.0, 0.0, 0.0);
        this.__filteredForward = new filteredVector3_1.FilteredVector3(0.0, 0.0, 0.0);
        this.__targetPosition = babylonjs_1.Vector3.Zero();
        this.__targetRotation = babylonjs_1.Quaternion.Identity();
        this.__ulId = -1;
        this.__urId = -1;
        this.__llId = -1;
        this.__lrId = -1;
        this._scene = scene;
        this._videoTexture = videoTexture;
    }
    ArUcoMetaMarkerObjectTracker.prototype.addTrackableObject = function (ul, ur, ll, lr) {
        var descriptor = [ul, ur, ll, lr].toString();
        this._trackableObjects.add(descriptor, new trackedNode_1.TrackedNode(descriptor.toString(), this._scene));
        return this._trackableObjects.get(descriptor);
    };
    ArUcoMetaMarkerObjectTracker.prototype.processResults = function (results) {
        // TODO: THIS IS HACKED CODE
        var _this = this;
        this._trackableObjects.forEach(function (descriptor, trackedObject) {
            var nums = descriptor.split(',');
            _this.__ulId = parseInt(nums[0]);
            _this.__urId = parseInt(nums[1]);
            _this.__llId = parseInt(nums[2]);
            _this.__lrId = parseInt(nums[3]);
            _this.__posEstimate.set(0.0, 0.0, 0.0);
            _this.__posEstimateCount = 0.0;
            _this.__rightEstimate.set(0.0, 0.0, 0.0);
            _this.__rightEstimateCount = 0.0;
            _this.__forwardEstimate.set(0.0, 0.0, 0.0);
            _this.__forwardEstimateCount = 0.0;
            if (results[_this.__llId]) {
                if (results[_this.__urId]) {
                    _this.__scratchVec.set(0.0, 0.0, 0.0);
                    _this.__scratchVec.addInPlace(results[_this.__llId].position);
                    _this.__scratchVec.addInPlace(results[_this.__urId].position);
                    _this.__scratchVec.scaleInPlace(0.5);
                    _this.__posEstimate.addInPlace(_this.__scratchVec);
                    _this.__posEstimateCount += 1.0;
                }
                if (results[_this.__lrId]) {
                    _this.__scratchVec.set(0.0, 0.0, 0.0);
                    _this.__scratchVec.addInPlace(results[_this.__lrId].position);
                    _this.__scratchVec.subtractInPlace(results[_this.__llId].position);
                    _this.__scratchVec.normalize();
                    _this.__rightEstimate.addInPlace(_this.__scratchVec);
                    _this.__rightEstimateCount += 1.0;
                }
                if (results[_this.__ulId]) {
                    _this.__scratchVec.set(0.0, 0.0, 0.0);
                    _this.__scratchVec.addInPlace(results[_this.__ulId].position);
                    _this.__scratchVec.subtractInPlace(results[_this.__llId].position);
                    _this.__scratchVec.normalize();
                    _this.__forwardEstimate.addInPlace(_this.__scratchVec);
                    _this.__forwardEstimateCount += 1.0;
                }
            }
            if (results[_this.__urId]) {
                if (results[_this.__lrId]) {
                    _this.__scratchVec.set(0.0, 0.0, 0.0);
                    _this.__scratchVec.addInPlace(results[_this.__urId].position);
                    _this.__scratchVec.subtractInPlace(results[_this.__lrId].position);
                    _this.__scratchVec.normalize();
                    _this.__forwardEstimate.addInPlace(_this.__scratchVec);
                    _this.__forwardEstimateCount += 1.0;
                }
                if (results[_this.__ulId]) {
                    _this.__scratchVec.set(0.0, 0.0, 0.0);
                    _this.__scratchVec.addInPlace(results[_this.__urId].position);
                    _this.__scratchVec.subtractInPlace(results[_this.__ulId].position);
                    _this.__scratchVec.normalize();
                    _this.__rightEstimate.addInPlace(_this.__scratchVec);
                    _this.__rightEstimateCount += 1.0;
                }
            }
            if (results[_this.__lrId] && results[_this.__ulId]) {
                _this.__scratchVec.set(0.0, 0.0, 0.0);
                _this.__scratchVec.addInPlace(results[_this.__lrId].position);
                _this.__scratchVec.addInPlace(results[_this.__ulId].position);
                _this.__scratchVec.scaleInPlace(0.5);
                _this.__posEstimate.addInPlace(_this.__scratchVec);
                _this.__posEstimateCount += 1.0;
            }
            if (_this.__posEstimateCount * _this.__rightEstimateCount * _this.__forwardEstimateCount > 0) {
                _this.__posEstimate.scaleInPlace(1.0 / _this.__posEstimateCount);
                _this.__rightEstimate.scaleInPlace(1.0 / _this.__rightEstimateCount);
                _this.__forwardEstimate.scaleInPlace(1.0 / _this.__forwardEstimateCount);
                _this.__filteredPos.addSample(_this.__posEstimate);
                _this.__filteredRight.addSample(_this.__rightEstimate);
                _this.__filteredForward.addSample(_this.__forwardEstimate);
                _this.__targetPosition.copyFrom(_this.__filteredPos);
                babylonjs_1.Quaternion.RotationQuaternionFromAxisToRef(_this.__filteredRight, babylonjs_1.Vector3.Cross(_this.__filteredForward, _this.__filteredRight), _this.__filteredForward, _this.__targetRotation);
                trackedObject.setTracking(_this.__targetPosition, _this.__targetRotation, true);
            }
            else {
                trackedObject.setTracking(_this.__targetPosition, _this.__targetRotation, true);
            }
        });
    };
    ArUcoMetaMarkerObjectTracker.prototype.setCalibrationAsync = function (scalar) {
        if (scalar === void 0) { scalar = 1; }
        return this._tracker.setCalibrationAsync(Math.round(scalar * this._videoTexture.getSize().width), Math.round(scalar * this._videoTexture.getSize().height));
    };
    ArUcoMetaMarkerObjectTracker.getQuaternionFromRodrigues = function (x, y, z) {
        var rot = new babylonjs_1.Vector3(-x, y, -z);
        var theta = rot.length();
        rot.scaleInPlace(1.0 / theta);
        if (theta !== 0.0) {
            return babylonjs_1.Quaternion.RotationAxis(rot, theta);
        }
        else {
            return null;
        }
    };
    ;
    ArUcoMetaMarkerObjectTracker.prototype.startTracking = function () {
        var _this = this;
        var running = false;
        this._runTrackingObserver = this._scene.onAfterRenderObservable.add(function () {
            if (!running) {
                running = true;
                _this._tracker.findMarkersInImageAsync(_this._videoTexture).then(function (markers) {
                    if (markers) {
                        var results = {};
                        markers.forEach(function (marker) {
                            results[marker.id] = {
                                position: new babylonjs_1.Vector3(marker.tx, -marker.ty, marker.tz),
                                rotation: ArUcoMetaMarkerObjectTracker.getQuaternionFromRodrigues(marker.rx, marker.ry, marker.rz)
                            };
                        });
                        _this.processResults(results);
                    }
                    running = false;
                });
            }
        });
    };
    ArUcoMetaMarkerObjectTracker.prototype.stopTracking = function () {
        this._scene.onAfterRenderObservable.remove(this._runTrackingObserver);
        this._runTrackingObserver = null;
    };
    ArUcoMetaMarkerObjectTracker.createAsync = function (videoTexture, scene) {
        var objectTracker = new ArUcoMetaMarkerObjectTracker(videoTexture, scene);
        return arUcoMarkerTracker_1.ArUcoMarkerTracker.createAsync().then(function (tracker) {
            objectTracker._tracker = tracker;
            return objectTracker.setCalibrationAsync();
        }).then(function () {
            return objectTracker;
        });
    };
    return ArUcoMetaMarkerObjectTracker;
}());
exports.ArUcoMetaMarkerObjectTracker = ArUcoMetaMarkerObjectTracker;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./arUcoMarkerTracker":1,"./filteredVector3":4,"./trackedNode":5}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DedicatedWorker = /** @class */ (function () {
    function DedicatedWorker() {
    }
    DedicatedWorker.createFromSources = function () {
        var sources = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            sources[_i] = arguments[_i];
        }
        var workerCode = "";
        for (var idx = 0; idx < sources.length - 1; idx++) {
            workerCode += sources[idx].toString();
        }
        workerCode += "(" + sources[sources.length - 1].toString() + ")();";
        return new Worker(window.URL.createObjectURL(new Blob([workerCode])));
    };
    DedicatedWorker.createFromLocation = function (jsUrl, onInitialized, onMessage) {
        var moduleDefition = "Module = {\n            locateFile: function (path) {\n                return \"" + jsUrl.replace(/.js$/, ".wasm") + "\";\n            },\n            onRuntimeInitialized: function () {\n                (" + onInitialized.toString() + ")();\n            }\n        };";
        var messageHandler = "this.onmessage = " + onMessage.toString() + ";";
        var importJavascript = "function importJavascript() { importScripts(\"" + jsUrl + "\"); }";
        return this.createFromSources(moduleDefition, messageHandler, importJavascript);
    };
    DedicatedWorker.module = function () {
        return Module;
    };
    DedicatedWorker.postMessage = function (data) {
        postMessage(data);
    };
    DedicatedWorker.unexpectedMessageHandler = function (event) {
        throw Error("Unexpected message from WebWorker: " + event);
    };
    return DedicatedWorker;
}());
exports.DedicatedWorker = DedicatedWorker;
},{}],4:[function(require,module,exports){
(function (global){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = (typeof window !== "undefined" ? window['BABYLON'] : typeof global !== "undefined" ? global['BABYLON'] : null);
var FilteredVector3 = /** @class */ (function (_super) {
    __extends(FilteredVector3, _super);
    function FilteredVector3(x, y, z, sampleCount) {
        if (sampleCount === void 0) { sampleCount = 1; }
        var _this = _super.call(this, x, y, z) || this;
        _this._idx = 0;
        _this._samples = [];
        _this._sampleSquaredDistances = [];
        for (var idx = 0; idx < sampleCount; ++idx) {
            _this._samples.push(new babylonjs_1.Vector3(x, y, z));
            _this._sampleSquaredDistances.push(0.0);
        }
        _this._sampleAverage = new babylonjs_1.Vector3(x, y, z);
        return _this;
    }
    FilteredVector3.prototype.addSample = function (sample) {
        this._sampleAverage.scaleInPlace(this._samples.length);
        this._sampleAverage.subtractInPlace(this._samples[this._idx]);
        this._samples[this._idx].copyFrom(sample);
        this._sampleAverage.addInPlace(this._samples[this._idx]);
        this._sampleAverage.scaleInPlace(1.0 / this._samples.length);
        this._idx = (this._idx + 1) % this._samples.length;
        var avgSquaredDistance = 0.0;
        for (var idx = 0; idx < this._samples.length; ++idx) {
            this._sampleSquaredDistances[idx] = babylonjs_1.Vector3.DistanceSquared(this._sampleAverage, this._samples[idx]);
            avgSquaredDistance += this._sampleSquaredDistances[idx];
        }
        avgSquaredDistance /= this._samples.length;
        var numIncludedSamples = 0;
        this.set(0.0, 0.0, 0.0);
        for (var idx = 0; idx <= this._samples.length; ++idx) {
            if (this._sampleSquaredDistances[idx] <= avgSquaredDistance) {
                this.addInPlace(this._samples[idx]);
                numIncludedSamples += 1;
            }
        }
        this.scaleInPlace(1.0 / numIncludedSamples);
    };
    return FilteredVector3;
}(babylonjs_1.Vector3));
exports.FilteredVector3 = FilteredVector3;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
(function (global){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = (typeof window !== "undefined" ? window['BABYLON'] : typeof global !== "undefined" ? global['BABYLON'] : null);
var TrackedNode = /** @class */ (function (_super) {
    __extends(TrackedNode, _super);
    function TrackedNode(name, scene, disableWhenNotTracked) {
        if (disableWhenNotTracked === void 0) { disableWhenNotTracked = true; }
        var _this = _super.call(this, name, scene, true) || this;
        _this._isTracking = false;
        _this.disableWhenNotTracked = disableWhenNotTracked;
        if (_this.disableWhenNotTracked) {
            _this.setEnabled(false);
        }
        _this._notTrackedFramesCount = 10;
        _this.onTrackingAcquiredObservable = new babylonjs_1.Observable(function (observer) {
            if (_this._isTracking) {
                _this.onTrackingAcquiredObservable.notifyObserver(observer, _this);
            }
        });
        _this.onTrackingLostObservable = new babylonjs_1.Observable();
        _this.rotationQuaternion = babylonjs_1.Quaternion.Identity();
        return _this;
    }
    TrackedNode.prototype.isTracking = function () {
        return this._isTracking;
    };
    TrackedNode.prototype.setTracking = function (position, rotation, isTracking) {
        this.position.copyFrom(position);
        this.rotationQuaternion ? this.rotationQuaternion.copyFrom(rotation) : this.rotationQuaternion = rotation.clone();
        // TODO: Remove this feature, which only exists as a stopgap.
        if (isTracking) {
            this._notTrackedFramesCount = 0;
        }
        else {
            this._notTrackedFramesCount += 1;
            if (this._notTrackedFramesCount < 5) {
                isTracking = true;
            }
        }
        if (!this._isTracking && isTracking) {
            this.onTrackingAcquiredObservable.notifyObservers(this);
        }
        else if (this._isTracking && !isTracking) {
            this.onTrackingLostObservable.notifyObservers(this);
        }
        this._isTracking = isTracking;
        this.setEnabled(!this.disableWhenNotTracked || this._isTracking);
    };
    return TrackedNode;
}(babylonjs_1.TransformNode));
exports.TrackedNode = TrackedNode;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[2])(2)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXJVY29NYXJrZXJUcmFja2VyLnRzIiwic3JjL2FyVWNvTWV0YU1hcmtlck9iamVjdFRyYWNrZXIudHMiLCJzcmMvZGVkaWNhdGVkV29ya2VyLnRzIiwic3JjL2ZpbHRlcmVkVmVjdG9yMy50cyIsInNyYy90cmFja2VkTm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDRUEscURBQW1EO0FBRW5EO0lBSUk7SUFBdUIsQ0FBQztJQUVULGdDQUFhLEdBQTVCO1FBQ0ksaUNBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNsQyxpQ0FBZSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFYyw0QkFBUyxHQUF4QixVQUF5QixLQUFtQjtRQUN4QyxJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBRXhCLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNaLGlDQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEMsaUNBQWUsQ0FBQyxXQUFXLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUNoRDthQUNJLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNyQixpQ0FBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25GLGlDQUFlLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7U0FDckQ7YUFDSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDakIsSUFBSSxHQUFHLEdBQUcsaUNBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFD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Q0FBQyxzQkFBc0IsR0FBRyxDQUFDLEVBQUU7Z0JBQ2pDLFVBQVUsR0FBRyxJQUFJLENBQUM7YUFDckI7U0FDSjtRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLFVBQVUsRUFBRTtZQUNqQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNEO2FBQ0ksSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ3RDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdkQ7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQztRQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBQ0wsa0JBQUM7QUFBRCxDQXpEQSxBQXlEQyxDQXpEZ0MseUJBQWEsR0F5RDdDO0FBekRZLGtDQUFXIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiaW1wb3J0IHsgVmlkZW9UZXh0dXJlIH0gZnJvbSBcImJhYnlsb25qc1wiXG5cbmltcG9ydCB7IERlZGljYXRlZFdvcmtlciB9IGZyb20gXCIuL2RlZGljYXRlZFdvcmtlclwiXG5cbmV4cG9ydCBjbGFzcyBBclVjb01hcmtlclRyYWNrZXIge1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IE1PRFVMRV9VUkw6IHN0cmluZyA9IFwiaHR0cHM6Ly9zeW50aGV0aWNtYWd1cy5naXRodWIuaW8vd2VicGlsZWQtYXJ1Y28tYXIvdjAuMDIvd2VicGlsZWQtYXJ1Y28tYXIvd2VicGlsZWQtYXJ1Y28tYXIuanNcIjtcbiAgICBwcml2YXRlIF93b3JrZXI6IFdvcmtlcjtcblxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoKSB7fVxuXG4gICAgcHJpdmF0ZSBzdGF0aWMgb25Jbml0aWFsaXplZCgpIHtcbiAgICAgICAgRGVkaWNhdGVkV29ya2VyLm1vZHVsZSgpLl9yZXNldCgpO1xuICAgICAgICBEZWRpY2F0ZWRXb3JrZXIucG9zdE1lc3NhZ2UoeyBpbml0aWFsaXplZDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHN0YXRpYyBvbk1lc3NhZ2UoZXZlbnQ6IE1lc3NhZ2VFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zdCBhcmdzID0gZXZlbnQuZGF0YTtcblxuICAgICAgICBpZiAoYXJncy5yZXNldCkge1xuICAgICAgICAgICAgRGVkaWNhdGVkV29ya2VyLm1vZHVsZSgpLl9yZXNldCgpO1xuICAgICAgICAgICAgRGVkaWNhdGVkV29ya2VyLnBvc3RNZXNzYWdlKHsgcmVzZXQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYXJncy5jYWxpYnJhdGUpIHtcbiAgICAgICAgICAgIERlZGljYXRlZFdvcmtlci5tb2R1bGUoKS5fc2V0X2NhbGlicmF0aW9uX2Zyb21fZnJhbWVfc2l6ZShhcmdzLndpZHRoLCBhcmdzLmhlaWdodCk7XG4gICAgICAgICAgICBEZWRpY2F0ZWRXb3JrZXIucG9zdE1lc3NhZ2UoeyBjYWxpYnJhdGVkOiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGFyZ3MudHJhY2spIHtcbiAgICAgICAgICAgIGxldCBidWYgPSBEZWRpY2F0ZWRXb3JrZXIubW9kdWxlKCkuX21hbGxvYyhhcmdzLmltYWdlRGF0YS5sZW5ndGggKiBhcmdzLmltYWdlRGF0YS5CWVRFU19QRVJfRUxFTUVOVCk7XG4gICAgICAgICAgICBEZWRpY2F0ZWRXb3JrZXIubW9kdWxlKCkuSEVBUDguc2V0KGFyZ3MuaW1hZ2VEYXRhLCBidWYpO1xuICAgICAgICAgICAgbGV0IG51bU1hcmtlcnMgPSBEZWRpY2F0ZWRXb3JrZXIubW9kdWxlKCkuX3Byb2Nlc3NfaW1hZ2UoYXJncy53aWR0aCwgYXJncy5oZWlnaHQsIGJ1ZiwgMSk7XG4gICAgICAgICAgICBEZWRpY2F0ZWRXb3JrZXIubW9kdWxlKCkuX2ZyZWUoYnVmKTtcblxuICAgICAgICAgICAgbGV0IG1hcmtlcnM6IGFueVtdID0gW107XG4gICAgICAgICAgICBsZXQgb2Zmc2V0OiBudW1iZXIgPSAwO1xuICAgICAgICAgICAgbGV0IGlkOiBudW1iZXIgPSAwO1xuICAgICAgICAgICAgbGV0IHR4OiBudW1iZXIgPSAwLjA7XG4gICAgICAgICAgICBsZXQgdHk6IG51bWJlciA9IDAuMDtcbiAgICAgICAgICAgIGxldCB0ejogbnVtYmVyID0gMC4wO1xuICAgICAgICAgICAgbGV0IHJ4OiBudW1iZXIgPSAwLjA7XG4gICAgICAgICAgICBsZXQgcnk6IG51bWJlciA9IDAuMDtcbiAgICAgICAgICAgIGxldCByejogbnVtYmVyID0gMC4wO1xuICAgICAgICAgICAgZm9yIChsZXQgbWFya2VySWR4ID0gMDsgbWFya2VySWR4IDwgbnVtTWFya2VyczsgbWFya2VySWR4KyspIHtcbiAgICAgICAgICAgICAgICBsZXQgcHRyID0gRGVkaWNhdGVkV29ya2VyLm1vZHVsZSgpLl9nZXRfdHJhY2tlZF9tYXJrZXIobWFya2VySWR4KTtcblxuICAgICAgICAgICAgICAgIG9mZnNldCA9IDA7XG4gICAgICAgICAgICAgICAgaWQgPSBEZWRpY2F0ZWRXb3JrZXIubW9kdWxlKCkuZ2V0VmFsdWUocHRyICsgb2Zmc2V0LCBcImkzMlwiKTtcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gMTI7XG4gICAgICAgICAgICAgICAgdHggPSBEZWRpY2F0ZWRXb3JrZXIubW9kdWxlKCkuZ2V0VmFsdWUocHRyICsgb2Zmc2V0LCBcImRvdWJsZVwiKTtcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gODtcbiAgICAgICAgICAgICAgICB0eSA9IERlZGljYXRlZFdvcmtlci5tb2R1bGUoKS5nZXRWYWx1ZShwdHIgKyBvZmZzZXQsIFwiZG91YmxlXCIpO1xuICAgICAgICAgICAgICAgIG9mZnNldCArPSA4O1xuICAgICAgICAgICAgICAgIHR6ID0gRGVkaWNhdGVkV29ya2VyLm1vZHVsZSgpLmdldFZhbHVlKHB0ciArIG9mZnNldCwgXCJkb3VibGVcIik7XG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IDg7XG4gICAgICAgICAgICAgICAgcnggPSBEZWRpY2F0ZWRXb3JrZXIubW9kdWxlKCkuZ2V0VmFsdWUocHRyICsgb2Zmc2V0LCBcImRvdWJsZVwiKTtcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gODtcbiAgICAgICAgICAgICAgICByeSA9IERlZGljYXRlZFdvcmtlci5tb2R1bGUoKS5nZXRWYWx1ZShwdHIgKyBvZmZzZXQsIFwiZG91YmxlXCIpO1xuICAgICAgICAgICAgICAgIG9mZnNldCArPSA4O1xuICAgICAgICAgICAgICAgIHJ6ID0gRGVkaWNhdGVkV29ya2VyLm1vZHVsZSgpLmdldFZhbHVlKHB0ciArIG9mZnNldCwgXCJkb3VibGVcIik7XG5cbiAgICAgICAgICAgICAgICBtYXJrZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgICAgIHR4OiB0eCxcbiAgICAgICAgICAgICAgICAgICAgdHk6IHR5LFxuICAgICAgICAgICAgICAgICAgICB0ejogdHosXG4gICAgICAgICAgICAgICAgICAgIHJ4OiByeCxcbiAgICAgICAgICAgICAgICAgICAgcnk6IHJ5LFxuICAgICAgICAgICAgICAgICAgICByejogcnpcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgRGVkaWNhdGVkV29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICBtYXJrZXJzOiBtYXJrZXJzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlQXN5bmMoKTogUHJvbWlzZTxBclVjb01hcmtlclRyYWNrZXI+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPEFyVWNvTWFya2VyVHJhY2tlcj4oKHJlc29sdmU6ICh0cmFja2VyOiBBclVjb01hcmtlclRyYWNrZXIpID0+IHZvaWQpID0+IHtcbiAgICAgICAgICAgIGxldCB0cmFja2VyID0gbmV3IEFyVWNvTWFya2VyVHJhY2tlcigpO1xuICAgICAgICAgICAgdHJhY2tlci5fd29ya2VyID0gRGVkaWNhdGVkV29ya2VyLmNyZWF0ZUZyb21Mb2NhdGlvbihcbiAgICAgICAgICAgICAgICBBclVjb01hcmtlclRyYWNrZXIuTU9EVUxFX1VSTCxcbiAgICAgICAgICAgICAgICBBclVjb01hcmtlclRyYWNrZXIub25Jbml0aWFsaXplZCxcbiAgICAgICAgICAgICAgICBBclVjb01hcmtlclRyYWNrZXIub25NZXNzYWdlKTtcbiAgICAgICAgICAgIHRyYWNrZXIuX3dvcmtlci5vbm1lc3NhZ2UgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIHRyYWNrZXIuX3dvcmtlci5vbm1lc3NhZ2UgPSBEZWRpY2F0ZWRXb3JrZXIudW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyO1xuICAgICAgICAgICAgICAgIHJlc29sdmUodHJhY2tlcik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0Q2FsaWJyYXRpb25Bc3luYyh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl93b3JrZXIub25tZXNzYWdlID0gRGVkaWNhdGVkV29ya2VyLnVuZXhwZWN0ZWRNZXNzYWdlSGFuZGxlcjtcblxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxpYnJhdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl93b3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgY2FsaWJyYXRlOiB0cnVlLFxuICAgICAgICAgICAgd2lkdGg6IHdpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0OiBoZWlnaHRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgcHVibGljIGZpbmRNYXJrZXJzSW5JbWFnZUFzeW5jKHZpZGVvVGV4dHVyZTogVmlkZW9UZXh0dXJlKTogUHJvbWlzZTxhbnlbXT4ge1xuICAgICAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8YW55W10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3dvcmtlci5vbm1lc3NhZ2UgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IERlZGljYXRlZFdvcmtlci51bmV4cGVjdGVkTWVzc2FnZUhhbmRsZXI7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhLm1hcmtlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQuZGF0YS5tYXJrZXJzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fd29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHRyYWNrOiB0cnVlLFxuICAgICAgICAgICAgd2lkdGg6IHZpZGVvVGV4dHVyZS5nZXRTaXplKCkud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IHZpZGVvVGV4dHVyZS5nZXRTaXplKCkuaGVpZ2h0LFxuICAgICAgICAgICAgaW1hZ2VEYXRhOiB2aWRlb1RleHR1cmUucmVhZFBpeGVscygpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBOdWxsYWJsZSwgT2JzZXJ2ZXIsIFF1YXRlcm5pb24sIFNjZW5lLCBTdHJpbmdEaWN0aW9uYXJ5LCBWZWN0b3IzLCBWaWRlb1RleHR1cmUgfSBmcm9tIFwiYmFieWxvbmpzXCI7XG5cbmltcG9ydCB7IEFyVWNvTWFya2VyVHJhY2tlciB9IGZyb20gXCIuL2FyVWNvTWFya2VyVHJhY2tlclwiXG5pbXBvcnQgeyBGaWx0ZXJlZFZlY3RvcjMgfSBmcm9tIFwiLi9maWx0ZXJlZFZlY3RvcjNcIlxuaW1wb3J0IHsgVHJhY2tlZE5vZGUgfSBmcm9tIFwiLi90cmFja2VkTm9kZVwiXG5cbmV4cG9ydCBjbGFzcyBBclVjb01ldGFNYXJrZXJPYmplY3RUcmFja2VyIHtcbiAgICBwcml2YXRlIF9zY2VuZTogU2NlbmU7XG4gICAgcHJpdmF0ZSBfdmlkZW9UZXh0dXJlOiBWaWRlb1RleHR1cmU7XG4gICAgcHJpdmF0ZSBfcnVuVHJhY2tpbmdPYnNlcnZlcjogTnVsbGFibGU8T2JzZXJ2ZXI8U2NlbmU+PiA9IG51bGw7XG4gICAgcHJpdmF0ZSBfdHJhY2tlcjogQXJVY29NYXJrZXJUcmFja2VyO1xuICAgIHByaXZhdGUgX3RyYWNrYWJsZU9iamVjdHM6IFN0cmluZ0RpY3Rpb25hcnk8VHJhY2tlZE5vZGU+ID0gbmV3IFN0cmluZ0RpY3Rpb25hcnk8VHJhY2tlZE5vZGU+KCk7XG5cbiAgICBwcml2YXRlIF9fcG9zRXN0aW1hdGU6IFZlY3RvcjMgPSBWZWN0b3IzLlplcm8oKTtcbiAgICBwcml2YXRlIF9fcG9zRXN0aW1hdGVDb3VudDogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIF9fcmlnaHRFc3RpbWF0ZTogVmVjdG9yMyA9IFZlY3RvcjMuWmVybygpO1xuICAgIHByaXZhdGUgX19yaWdodEVzdGltYXRlQ291bnQ6IG51bWJlciA9IDA7XG4gICAgcHJpdmF0ZSBfX2ZvcndhcmRFc3RpbWF0ZTogVmVjdG9yMyA9IFZlY3RvcjMuWmVybygpO1xuICAgIHByaXZhdGUgX19mb3J3YXJkRXN0aW1hdGVDb3VudDogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIF9fc2NyYXRjaFZlYzogVmVjdG9yMyA9IFZlY3RvcjMuWmVybygpO1xuICAgIHByaXZhdGUgX19maWx0ZXJlZFBvczogRmlsdGVyZWRWZWN0b3IzID0gbmV3IEZpbHRlcmVkVmVjdG9yMygwLjAsIDAuMCwgMC4wKTtcbiAgICBwcml2YXRlIF9fZmlsdGVyZWRSaWdodDogRmlsdGVyZWRWZWN0b3IzID0gbmV3IEZpbHRlcmVkVmVjdG9yMygwLjAsIDAuMCwgMC4wKTtcbiAgICBwcml2YXRlIF9fZmlsdGVyZWRGb3J3YXJkOiBGaWx0ZXJlZFZlY3RvcjMgPSBuZXcgRmlsdGVyZWRWZWN0b3IzKDAuMCwgMC4wLCAwLjApO1xuICAgIHByaXZhdGUgX190YXJnZXRQb3NpdGlvbjogVmVjdG9yMyA9IFZlY3RvcjMuWmVybygpO1xuICAgIHByaXZhdGUgX190YXJnZXRSb3RhdGlvbjogUXVhdGVybmlvbiA9IFF1YXRlcm5pb24uSWRlbnRpdHkoKTtcbiAgICBwcml2YXRlIF9fdWxJZDogbnVtYmVyID0gLTE7XG4gICAgcHJpdmF0ZSBfX3VySWQ6IG51bWJlciA9IC0xO1xuICAgIHByaXZhdGUgX19sbElkOiBudW1iZXIgPSAtMTtcbiAgICBwcml2YXRlIF9fbHJJZDogbnVtYmVyID0gLTE7XG5cbiAgICBjb25zdHJ1Y3Rvcih2aWRlb1RleHR1cmU6IFZpZGVvVGV4dHVyZSwgc2NlbmU6IFNjZW5lKSB7XG4gICAgICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG4gICAgICAgIHRoaXMuX3ZpZGVvVGV4dHVyZSA9IHZpZGVvVGV4dHVyZTtcbiAgICB9XG5cbiAgICBhZGRUcmFja2FibGVPYmplY3QodWw6IG51bWJlciwgdXI6IG51bWJlciwgbGw6IG51bWJlciwgbHI6IG51bWJlcikge1xuICAgICAgICBjb25zdCBkZXNjcmlwdG9yID0gW3VsLCB1ciwgbGwsIGxyXS50b1N0cmluZygpO1xuICAgICAgICB0aGlzLl90cmFja2FibGVPYmplY3RzLmFkZChkZXNjcmlwdG9yLCBuZXcgVHJhY2tlZE5vZGUoZGVzY3JpcHRvci50b1N0cmluZygpLCB0aGlzLl9zY2VuZSkpO1xuICAgICAgICByZXR1cm4gdGhpcy5fdHJhY2thYmxlT2JqZWN0cy5nZXQoZGVzY3JpcHRvcik7XG4gICAgfVxuXG4gICAgcHJvY2Vzc1Jlc3VsdHMocmVzdWx0czogYW55KSB7XG4gICAgICAgIC8vIFRPRE86IFRISVMgSVMgSEFDS0VEIENPREVcblxuICAgICAgICB0aGlzLl90cmFja2FibGVPYmplY3RzLmZvckVhY2goKGRlc2NyaXB0b3I6IHN0cmluZywgdHJhY2tlZE9iamVjdDogVHJhY2tlZE5vZGUpID0+IHtcbiAgICAgICAgICAgIHZhciBudW1zID0gZGVzY3JpcHRvci5zcGxpdCgnLCcpO1xuICAgICAgICAgICAgdGhpcy5fX3VsSWQgPSBwYXJzZUludChudW1zWzBdKTtcbiAgICAgICAgICAgIHRoaXMuX191cklkID0gcGFyc2VJbnQobnVtc1sxXSk7XG4gICAgICAgICAgICB0aGlzLl9fbGxJZCA9IHBhcnNlSW50KG51bXNbMl0pO1xuICAgICAgICAgICAgdGhpcy5fX2xySWQgPSBwYXJzZUludChudW1zWzNdKTtcblxuICAgICAgICAgICAgdGhpcy5fX3Bvc0VzdGltYXRlLnNldCgwLjAsIDAuMCwgMC4wKTtcbiAgICAgICAgICAgIHRoaXMuX19wb3NFc3RpbWF0ZUNvdW50ID0gMC4wO1xuICAgICAgICAgICAgdGhpcy5fX3JpZ2h0RXN0aW1hdGUuc2V0KDAuMCwgMC4wLCAwLjApO1xuICAgICAgICAgICAgdGhpcy5fX3JpZ2h0RXN0aW1hdGVDb3VudCA9IDAuMDtcbiAgICAgICAgICAgIHRoaXMuX19mb3J3YXJkRXN0aW1hdGUuc2V0KDAuMCwgMC4wLCAwLjApO1xuICAgICAgICAgICAgdGhpcy5fX2ZvcndhcmRFc3RpbWF0ZUNvdW50ID0gMC4wO1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0c1t0aGlzLl9fbGxJZF0pIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0c1t0aGlzLl9fdXJJZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuc2V0KDAuMCwgMC4wLCAwLjApO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fc2NyYXRjaFZlYy5hZGRJblBsYWNlKHJlc3VsdHNbdGhpcy5fX2xsSWRdLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuYWRkSW5QbGFjZShyZXN1bHRzW3RoaXMuX191cklkXS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnNjYWxlSW5QbGFjZSgwLjUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3Bvc0VzdGltYXRlLmFkZEluUGxhY2UodGhpcy5fX3NjcmF0Y2hWZWMpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fcG9zRXN0aW1hdGVDb3VudCArPSAxLjA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHNbdGhpcy5fX2xySWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnNldCgwLjAsIDAuMCwgMC4wKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuYWRkSW5QbGFjZShyZXN1bHRzW3RoaXMuX19scklkXS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnN1YnRyYWN0SW5QbGFjZShyZXN1bHRzW3RoaXMuX19sbElkXS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3JpZ2h0RXN0aW1hdGUuYWRkSW5QbGFjZSh0aGlzLl9fc2NyYXRjaFZlYyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19yaWdodEVzdGltYXRlQ291bnQgKz0gMS4wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0c1t0aGlzLl9fdWxJZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuc2V0KDAuMCwgMC4wLCAwLjApO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fc2NyYXRjaFZlYy5hZGRJblBsYWNlKHJlc3VsdHNbdGhpcy5fX3VsSWRdLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuc3VidHJhY3RJblBsYWNlKHJlc3VsdHNbdGhpcy5fX2xsSWRdLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fZm9yd2FyZEVzdGltYXRlLmFkZEluUGxhY2UodGhpcy5fX3NjcmF0Y2hWZWMpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fZm9yd2FyZEVzdGltYXRlQ291bnQgKz0gMS4wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJlc3VsdHNbdGhpcy5fX3VySWRdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHNbdGhpcy5fX2xySWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnNldCgwLjAsIDAuMCwgMC4wKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuYWRkSW5QbGFjZShyZXN1bHRzW3RoaXMuX191cklkXS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnN1YnRyYWN0SW5QbGFjZShyZXN1bHRzW3RoaXMuX19scklkXS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2ZvcndhcmRFc3RpbWF0ZS5hZGRJblBsYWNlKHRoaXMuX19zY3JhdGNoVmVjKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2ZvcndhcmRFc3RpbWF0ZUNvdW50ICs9IDEuMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHNbdGhpcy5fX3VsSWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnNldCgwLjAsIDAuMCwgMC4wKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuYWRkSW5QbGFjZShyZXN1bHRzW3RoaXMuX191cklkXS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnN1YnRyYWN0SW5QbGFjZShyZXN1bHRzW3RoaXMuX191bElkXS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3JpZ2h0RXN0aW1hdGUuYWRkSW5QbGFjZSh0aGlzLl9fc2NyYXRjaFZlYyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19yaWdodEVzdGltYXRlQ291bnQgKz0gMS4wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJlc3VsdHNbdGhpcy5fX2xySWRdICYmIHJlc3VsdHNbdGhpcy5fX3VsSWRdKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuc2V0KDAuMCwgMC4wLCAwLjApO1xuICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLmFkZEluUGxhY2UocmVzdWx0c1t0aGlzLl9fbHJJZF0ucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLmFkZEluUGxhY2UocmVzdWx0c1t0aGlzLl9fdWxJZF0ucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnNjYWxlSW5QbGFjZSgwLjUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMuX19wb3NFc3RpbWF0ZS5hZGRJblBsYWNlKHRoaXMuX19zY3JhdGNoVmVjKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9fcG9zRXN0aW1hdGVDb3VudCArPSAxLjA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9fcG9zRXN0aW1hdGVDb3VudCAqIHRoaXMuX19yaWdodEVzdGltYXRlQ291bnQgKiB0aGlzLl9fZm9yd2FyZEVzdGltYXRlQ291bnQgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fX3Bvc0VzdGltYXRlLnNjYWxlSW5QbGFjZSgxLjAgLyB0aGlzLl9fcG9zRXN0aW1hdGVDb3VudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fX3JpZ2h0RXN0aW1hdGUuc2NhbGVJblBsYWNlKDEuMCAvIHRoaXMuX19yaWdodEVzdGltYXRlQ291bnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuX19mb3J3YXJkRXN0aW1hdGUuc2NhbGVJblBsYWNlKDEuMCAvIHRoaXMuX19mb3J3YXJkRXN0aW1hdGVDb3VudCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9fZmlsdGVyZWRQb3MuYWRkU2FtcGxlKHRoaXMuX19wb3NFc3RpbWF0ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2ZpbHRlcmVkUmlnaHQuYWRkU2FtcGxlKHRoaXMuX19yaWdodEVzdGltYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9fZmlsdGVyZWRGb3J3YXJkLmFkZFNhbXBsZSh0aGlzLl9fZm9yd2FyZEVzdGltYXRlKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX190YXJnZXRQb3NpdGlvbi5jb3B5RnJvbSh0aGlzLl9fZmlsdGVyZWRQb3MpO1xuICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uUm90YXRpb25RdWF0ZXJuaW9uRnJvbUF4aXNUb1JlZihcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2ZpbHRlcmVkUmlnaHQsIFxuICAgICAgICAgICAgICAgICAgICBWZWN0b3IzLkNyb3NzKHRoaXMuX19maWx0ZXJlZEZvcndhcmQsIHRoaXMuX19maWx0ZXJlZFJpZ2h0KSwgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19maWx0ZXJlZEZvcndhcmQsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190YXJnZXRSb3RhdGlvbik7XG5cbiAgICAgICAgICAgICAgICB0cmFja2VkT2JqZWN0LnNldFRyYWNraW5nKFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fdGFyZ2V0UG9zaXRpb24sIFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fdGFyZ2V0Um90YXRpb24sIFxuICAgICAgICAgICAgICAgICAgICB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyYWNrZWRPYmplY3Quc2V0VHJhY2tpbmcoXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190YXJnZXRQb3NpdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190YXJnZXRSb3RhdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzZXRDYWxpYnJhdGlvbkFzeW5jKHNjYWxhciA9IDEpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYWNrZXIuc2V0Q2FsaWJyYXRpb25Bc3luYyhcbiAgICAgICAgICAgIE1hdGgucm91bmQoc2NhbGFyICogdGhpcy5fdmlkZW9UZXh0dXJlLmdldFNpemUoKS53aWR0aCksIFxuICAgICAgICAgICAgTWF0aC5yb3VuZChzY2FsYXIgKiB0aGlzLl92aWRlb1RleHR1cmUuZ2V0U2l6ZSgpLmhlaWdodCkpO1xuICAgIH1cblxuICAgIHN0YXRpYyBnZXRRdWF0ZXJuaW9uRnJvbVJvZHJpZ3Vlcyh4OiBudW1iZXIsIHk6IG51bWJlciwgejogbnVtYmVyKSB7XG4gICAgICAgIHZhciByb3QgPSBuZXcgVmVjdG9yMygteCwgeSwgLXopO1xuICAgICAgICB2YXIgdGhldGEgPSByb3QubGVuZ3RoKCk7XG4gICAgICAgIHJvdC5zY2FsZUluUGxhY2UoMS4wIC8gdGhldGEpO1xuICAgICAgICBpZiAodGhldGEgIT09IDAuMCkge1xuICAgICAgICAgICAgcmV0dXJuIFF1YXRlcm5pb24uUm90YXRpb25BeGlzKHJvdCwgdGhldGEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgc3RhcnRUcmFja2luZygpIHtcbiAgICAgICAgdmFyIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fcnVuVHJhY2tpbmdPYnNlcnZlciA9IHRoaXMuX3NjZW5lLm9uQWZ0ZXJSZW5kZXJPYnNlcnZhYmxlLmFkZCgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBydW5uaW5nID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3RyYWNrZXIuZmluZE1hcmtlcnNJbkltYWdlQXN5bmModGhpcy5fdmlkZW9UZXh0dXJlKS50aGVuKG1hcmtlcnMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAobWFya2Vycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdHM6IGFueSA9IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXJzLmZvckVhY2gobWFya2VyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzW21hcmtlci5pZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgVmVjdG9yMyhtYXJrZXIudHgsIC1tYXJrZXIudHksIG1hcmtlci50eiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uOiBBclVjb01ldGFNYXJrZXJPYmplY3RUcmFja2VyLmdldFF1YXRlcm5pb25Gcm9tUm9kcmlndWVzKG1hcmtlci5yeCwgbWFya2VyLnJ5LCBtYXJrZXIucnopXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1Jlc3VsdHMocmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHN0b3BUcmFja2luZygpIHtcbiAgICAgICAgdGhpcy5fc2NlbmUub25BZnRlclJlbmRlck9ic2VydmFibGUucmVtb3ZlKHRoaXMuX3J1blRyYWNraW5nT2JzZXJ2ZXIpO1xuICAgICAgICB0aGlzLl9ydW5UcmFja2luZ09ic2VydmVyID0gbnVsbDtcbiAgICB9XG5cbiAgICBzdGF0aWMgY3JlYXRlQXN5bmModmlkZW9UZXh0dXJlOiBWaWRlb1RleHR1cmUsIHNjZW5lOiBTY2VuZSkge1xuICAgICAgICB2YXIgb2JqZWN0VHJhY2tlciA9IG5ldyBBclVjb01ldGFNYXJrZXJPYmplY3RUcmFja2VyKHZpZGVvVGV4dHVyZSwgc2NlbmUpO1xuICAgICAgICByZXR1cm4gQXJVY29NYXJrZXJUcmFja2VyLmNyZWF0ZUFzeW5jKCkudGhlbih0cmFja2VyID0+IHtcbiAgICAgICAgICAgIG9iamVjdFRyYWNrZXIuX3RyYWNrZXIgPSB0cmFja2VyO1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdFRyYWNrZXIuc2V0Q2FsaWJyYXRpb25Bc3luYygpO1xuICAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBvYmplY3RUcmFja2VyO1xuICAgICAgICB9KTtcbiAgICB9XG59IiwiZGVjbGFyZSB2YXIgTW9kdWxlOiBhbnk7XG5kZWNsYXJlIGZ1bmN0aW9uIHBvc3RNZXNzYWdlKGRhdGE6IGFueSk6IHZvaWQ7XG5cbmV4cG9ydCBjbGFzcyBEZWRpY2F0ZWRXb3JrZXIge1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgY3JlYXRlRnJvbVNvdXJjZXMoLi4uc291cmNlczogYW55W10pOiBXb3JrZXIge1xuICAgICAgICBsZXQgd29ya2VyQ29kZTogc3RyaW5nID0gXCJcIjtcbiAgICAgICAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgc291cmNlcy5sZW5ndGggLSAxOyBpZHgrKykge1xuICAgICAgICAgICAgd29ya2VyQ29kZSArPSBzb3VyY2VzW2lkeF0udG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICB3b3JrZXJDb2RlICs9IFwiKFwiICsgc291cmNlc1tzb3VyY2VzLmxlbmd0aCAtIDFdLnRvU3RyaW5nKCkgKyBcIikoKTtcIjtcbiAgICAgICAgcmV0dXJuIG5ldyBXb3JrZXIod2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwobmV3IEJsb2IoW3dvcmtlckNvZGVdKSkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlRnJvbUxvY2F0aW9uKGpzVXJsOiBzdHJpbmcsIG9uSW5pdGlhbGl6ZWQ6ICgpID0+IHZvaWQsIG9uTWVzc2FnZTogKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHZvaWQpOiBXb3JrZXIge1xuICAgICAgICBsZXQgbW9kdWxlRGVmaXRpb246IHN0cmluZyA9IGBNb2R1bGUgPSB7XG4gICAgICAgICAgICBsb2NhdGVGaWxlOiBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcXFwiYCArIGpzVXJsLnJlcGxhY2UoLy5qcyQvLCBcIi53YXNtXCIpICsgYFxcXCI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25SdW50aW1lSW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAoYCArIG9uSW5pdGlhbGl6ZWQudG9TdHJpbmcoKSArIGApKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07YDtcbiAgICAgICAgbGV0IG1lc3NhZ2VIYW5kbGVyOiBzdHJpbmcgPSBcInRoaXMub25tZXNzYWdlID0gXCIgKyBvbk1lc3NhZ2UudG9TdHJpbmcoKSArIFwiO1wiO1xuICAgICAgICBsZXQgaW1wb3J0SmF2YXNjcmlwdDogc3RyaW5nID0gXCJmdW5jdGlvbiBpbXBvcnRKYXZhc2NyaXB0KCkgeyBpbXBvcnRTY3JpcHRzKFxcXCJcIiArIGpzVXJsICsgXCJcXFwiKTsgfVwiO1xuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVGcm9tU291cmNlcyhtb2R1bGVEZWZpdGlvbiwgbWVzc2FnZUhhbmRsZXIsIGltcG9ydEphdmFzY3JpcHQpO1xuICAgIH1cbiAgICBcbiAgICBwdWJsaWMgc3RhdGljIG1vZHVsZSgpOiBhbnkge1xuICAgICAgICByZXR1cm4gTW9kdWxlXG4gICAgfVxuXG4gICAgcHVibGljIHN0YXRpYyBwb3N0TWVzc2FnZShkYXRhOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgcG9zdE1lc3NhZ2UoZGF0YSk7XG4gICAgfVxuXG4gICAgcHVibGljIHN0YXRpYyB1bmV4cGVjdGVkTWVzc2FnZUhhbmRsZXIoZXZlbnQ6IE1lc3NhZ2VFdmVudCk6IHZvaWQge1xuICAgICAgICB0aHJvdyBFcnJvcihcIlVuZXhwZWN0ZWQgbWVzc2FnZSBmcm9tIFdlYldvcmtlcjogXCIgKyBldmVudCk7XG4gICAgfVxufSIsImltcG9ydCB7IFZlY3RvcjMgfSBmcm9tIFwiYmFieWxvbmpzXCJcblxuZXhwb3J0IGNsYXNzIEZpbHRlcmVkVmVjdG9yMyBleHRlbmRzIFZlY3RvcjMge1xuICAgIHByaXZhdGUgX2lkeDogbnVtYmVyO1xuICAgIHByaXZhdGUgX3NhbXBsZXM6IFZlY3RvcjNbXTtcbiAgICBwcml2YXRlIF9zYW1wbGVTcXVhcmVkRGlzdGFuY2VzOiBudW1iZXJbXTtcbiAgICBwcml2YXRlIF9zYW1wbGVBdmVyYWdlOiBWZWN0b3IzO1xuXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKHg6IG51bWJlciwgeTogbnVtYmVyLCB6OiBudW1iZXIsIHNhbXBsZUNvdW50OiBudW1iZXIgPSAxKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHopO1xuXG4gICAgICAgIHRoaXMuX2lkeCA9IDA7XG4gICAgICAgIHRoaXMuX3NhbXBsZXMgPSBbXTtcbiAgICAgICAgdGhpcy5fc2FtcGxlU3F1YXJlZERpc3RhbmNlcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCBzYW1wbGVDb3VudDsgKytpZHgpIHtcbiAgICAgICAgICAgIHRoaXMuX3NhbXBsZXMucHVzaChuZXcgVmVjdG9yMyh4LCB5LCB6KSk7XG4gICAgICAgICAgICB0aGlzLl9zYW1wbGVTcXVhcmVkRGlzdGFuY2VzLnB1c2goMC4wKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3NhbXBsZUF2ZXJhZ2UgPSBuZXcgVmVjdG9yMyh4LCB5LCB6KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgYWRkU2FtcGxlKHNhbXBsZTogVmVjdG9yMyk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zYW1wbGVBdmVyYWdlLnNjYWxlSW5QbGFjZSh0aGlzLl9zYW1wbGVzLmxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3NhbXBsZUF2ZXJhZ2Uuc3VidHJhY3RJblBsYWNlKHRoaXMuX3NhbXBsZXNbdGhpcy5faWR4XSk7XG4gICAgICAgIHRoaXMuX3NhbXBsZXNbdGhpcy5faWR4XS5jb3B5RnJvbShzYW1wbGUpO1xuICAgICAgICB0aGlzLl9zYW1wbGVBdmVyYWdlLmFkZEluUGxhY2UodGhpcy5fc2FtcGxlc1t0aGlzLl9pZHhdKTtcbiAgICAgICAgdGhpcy5fc2FtcGxlQXZlcmFnZS5zY2FsZUluUGxhY2UoMS4wIC8gdGhpcy5fc2FtcGxlcy5sZW5ndGgpO1xuICAgICAgICB0aGlzLl9pZHggPSAodGhpcy5faWR4ICsgMSkgJSB0aGlzLl9zYW1wbGVzLmxlbmd0aDtcblxuICAgICAgICBsZXQgYXZnU3F1YXJlZERpc3RhbmNlID0gMC4wO1xuICAgICAgICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLl9zYW1wbGVzLmxlbmd0aDsgKytpZHgpIHtcbiAgICAgICAgICAgIHRoaXMuX3NhbXBsZVNxdWFyZWREaXN0YW5jZXNbaWR4XSA9IFZlY3RvcjMuRGlzdGFuY2VTcXVhcmVkKHRoaXMuX3NhbXBsZUF2ZXJhZ2UsIHRoaXMuX3NhbXBsZXNbaWR4XSk7XG4gICAgICAgICAgICBhdmdTcXVhcmVkRGlzdGFuY2UgKz0gdGhpcy5fc2FtcGxlU3F1YXJlZERpc3RhbmNlc1tpZHhdO1xuICAgICAgICB9XG4gICAgICAgIGF2Z1NxdWFyZWREaXN0YW5jZSAvPSB0aGlzLl9zYW1wbGVzLmxlbmd0aDtcblxuICAgICAgICBsZXQgbnVtSW5jbHVkZWRTYW1wbGVzID0gMDtcbiAgICAgICAgdGhpcy5zZXQoMC4wLCAwLjAsIDAuMCk7XG4gICAgICAgIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8PSB0aGlzLl9zYW1wbGVzLmxlbmd0aDsgKytpZHgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zYW1wbGVTcXVhcmVkRGlzdGFuY2VzW2lkeF0gPD0gYXZnU3F1YXJlZERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRJblBsYWNlKHRoaXMuX3NhbXBsZXNbaWR4XSk7XG4gICAgICAgICAgICAgICAgbnVtSW5jbHVkZWRTYW1wbGVzICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY2FsZUluUGxhY2UoMS4wIC8gbnVtSW5jbHVkZWRTYW1wbGVzKTtcbiAgICB9XG59IiwiaW1wb3J0IHsgT2JzZXJ2YWJsZSwgUXVhdGVybmlvbiwgU2NlbmUsIFRyYW5zZm9ybU5vZGUsIFZlY3RvcjMgfSBmcm9tIFwiYmFieWxvbmpzXCJcblxuZXhwb3J0IGNsYXNzIFRyYWNrZWROb2RlIGV4dGVuZHMgVHJhbnNmb3JtTm9kZSB7XG4gICAgcHJpdmF0ZSBfaXNUcmFja2luZzogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9ub3RUcmFja2VkRnJhbWVzQ291bnQ6IG51bWJlcjsgLy8gVE9ETzogUmVtb3ZlIHRoaXMgZmVhdHVyZSwgd2hpY2ggb25seSBleGlzdHMgYXMgYSBzdG9wZ2FwLlxuXG4gICAgcHVibGljIG9uVHJhY2tpbmdBY3F1aXJlZE9ic2VydmFibGU6IE9ic2VydmFibGU8VHJhY2tlZE5vZGU+O1xuICAgIHB1YmxpYyBvblRyYWNraW5nTG9zdE9ic2VydmFibGU6IE9ic2VydmFibGU8VHJhY2tlZE5vZGU+O1xuICAgIHB1YmxpYyBkaXNhYmxlV2hlbk5vdFRyYWNrZWQ6IGJvb2xlYW47XG5cbiAgICBwdWJsaWMgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBzY2VuZT86IFNjZW5lIHwgbnVsbCB8IHVuZGVmaW5lZCwgZGlzYWJsZVdoZW5Ob3RUcmFja2VkOiBib29sZWFuID0gdHJ1ZSkge1xuICAgICAgICBzdXBlcihuYW1lLCBzY2VuZSwgdHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5faXNUcmFja2luZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmRpc2FibGVXaGVuTm90VHJhY2tlZCA9IGRpc2FibGVXaGVuTm90VHJhY2tlZDtcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZVdoZW5Ob3RUcmFja2VkKSB7XG4gICAgICAgICAgICB0aGlzLnNldEVuYWJsZWQoZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fbm90VHJhY2tlZEZyYW1lc0NvdW50ID0gMTA7XG5cbiAgICAgICAgdGhpcy5vblRyYWNraW5nQWNxdWlyZWRPYnNlcnZhYmxlID0gbmV3IE9ic2VydmFibGUob2JzZXJ2ZXIgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzVHJhY2tpbmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uVHJhY2tpbmdBY3F1aXJlZE9ic2VydmFibGUubm90aWZ5T2JzZXJ2ZXIob2JzZXJ2ZXIsIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5vblRyYWNraW5nTG9zdE9ic2VydmFibGUgPSBuZXcgT2JzZXJ2YWJsZSgpO1xuXG4gICAgICAgIHRoaXMucm90YXRpb25RdWF0ZXJuaW9uID0gUXVhdGVybmlvbi5JZGVudGl0eSgpO1xuICAgIH1cblxuICAgIHB1YmxpYyBpc1RyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNUcmFja2luZztcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0VHJhY2tpbmcocG9zaXRpb246IFZlY3RvcjMsIHJvdGF0aW9uOiBRdWF0ZXJuaW9uLCBpc1RyYWNraW5nOiBib29sZWFuKTogdm9pZCB7XG4gICAgICAgIHRoaXMucG9zaXRpb24uY29weUZyb20ocG9zaXRpb24pO1xuICAgICAgICB0aGlzLnJvdGF0aW9uUXVhdGVybmlvbiA/IHRoaXMucm90YXRpb25RdWF0ZXJuaW9uLmNvcHlGcm9tKHJvdGF0aW9uKSA6IHRoaXMucm90YXRpb25RdWF0ZXJuaW9uID0gcm90YXRpb24uY2xvbmUoKTtcblxuICAgICAgICAvLyBUT0RPOiBSZW1vdmUgdGhpcyBmZWF0dXJlLCB3aGljaCBvbmx5IGV4aXN0cyBhcyBhIHN0b3BnYXAuXG4gICAgICAgIGlmIChpc1RyYWNraW5nKSB7XG4gICAgICAgICAgICB0aGlzLl9ub3RUcmFja2VkRnJhbWVzQ291bnQgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fbm90VHJhY2tlZEZyYW1lc0NvdW50ICs9IDE7XG4gICAgICAgICAgICBpZiAodGhpcy5fbm90VHJhY2tlZEZyYW1lc0NvdW50IDwgNSkge1xuICAgICAgICAgICAgICAgIGlzVHJhY2tpbmcgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLl9pc1RyYWNraW5nICYmIGlzVHJhY2tpbmcpIHtcbiAgICAgICAgICAgIHRoaXMub25UcmFja2luZ0FjcXVpcmVkT2JzZXJ2YWJsZS5ub3RpZnlPYnNlcnZlcnModGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5faXNUcmFja2luZyAmJiAhaXNUcmFja2luZykge1xuICAgICAgICAgICAgdGhpcy5vblRyYWNraW5nTG9zdE9ic2VydmFibGUubm90aWZ5T2JzZXJ2ZXJzKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2lzVHJhY2tpbmcgPSBpc1RyYWNraW5nO1xuICAgICAgICB0aGlzLnNldEVuYWJsZWQoIXRoaXMuZGlzYWJsZVdoZW5Ob3RUcmFja2VkIHx8IHRoaXMuX2lzVHJhY2tpbmcpO1xuICAgIH1cbn1cblxuIl19
