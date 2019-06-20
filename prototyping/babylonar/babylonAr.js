var externalDefine = window.define;var externalRequire = window.require;window.define = undefined;window.require = undefined;
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.BabylonAR = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./exampleWorker/exampleWorker"));
__export(require("./exampleObjectTracker/exampleObjectTracker"));

},{"./exampleObjectTracker/exampleObjectTracker":3,"./exampleWorker/exampleWorker":4}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dedicatedWorker_1 = require("../shared/dedicatedWorker");
var ExampleMarkerTracker = /** @class */ (function () {
    function ExampleMarkerTracker() {
    }
    ExampleMarkerTracker.onInitialized = function () {
        Module._reset();
        postMessage({ initialized: true });
    };
    ExampleMarkerTracker.onMessage = function (event) {
        var args = event.data;
        if (args.reset) {
            Module._reset();
            postMessage({ reset: true });
        }
        else if (args.calibrate) {
            Module._set_calibration_from_frame_size(args.width, args.height);
            postMessage({ calibrated: true });
        }
        else if (args.track) {
            var buf = Module._malloc(args.imageData.length * args.imageData.BYTES_PER_ELEMENT);
            Module.HEAP8.set(args.imageData, buf);
            var numMarkers = Module._process_image(args.width, args.height, buf, 1);
            Module._free(buf);
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
                var ptr = Module._get_tracked_marker(markerIdx);
                offset = 0;
                id = Module.getValue(ptr + offset, "i32");
                offset += 12;
                tx = Module.getValue(ptr + offset, "double");
                offset += 8;
                ty = Module.getValue(ptr + offset, "double");
                offset += 8;
                tz = Module.getValue(ptr + offset, "double");
                offset += 8;
                rx = Module.getValue(ptr + offset, "double");
                offset += 8;
                ry = Module.getValue(ptr + offset, "double");
                offset += 8;
                rz = Module.getValue(ptr + offset, "double");
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
            postMessage({
                markers: markers
            });
        }
    };
    ExampleMarkerTracker.createAsync = function () {
        return new Promise(function (resolve) {
            var tracker = new ExampleMarkerTracker();
            tracker._worker = dedicatedWorker_1.DedicatedWorker.createFromLocation(ExampleMarkerTracker.MODULE_URL, ExampleMarkerTracker.onInitialized, ExampleMarkerTracker.onMessage);
            tracker._worker.onmessage = function (event) {
                tracker._worker.onmessage = dedicatedWorker_1.DedicatedWorker.unexpectedMessageHandler;
                resolve(tracker);
            };
        });
    };
    ExampleMarkerTracker.prototype.setCalibrationAsync = function (width, height) {
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
    ExampleMarkerTracker.prototype.findMarkersInImageAsync = function (videoTexture) {
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
    ExampleMarkerTracker.MODULE_URL = "https://syntheticmagus.github.io/prototyping/babylonar/wasm/webpiled-aruco-ar.js";
    return ExampleMarkerTracker;
}());
exports.ExampleMarkerTracker = ExampleMarkerTracker;

},{"../shared/dedicatedWorker":5}],3:[function(require,module,exports){
(function (global){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = (typeof window !== "undefined" ? window['BABYLON'] : typeof global !== "undefined" ? global['BABYLON'] : null);
var exampleMarkerTracker_1 = require("./exampleMarkerTracker");
var filteredVector3_1 = require("../shared/filteredVector3");
var trackedNode_1 = require("../shared/trackedNode");
var ExampleObjectTracker = /** @class */ (function () {
    function ExampleObjectTracker(videoTexture, scene) {
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
    ExampleObjectTracker.prototype.addTrackableObject = function (ul, ur, ll, lr) {
        var descriptor = [ul, ur, ll, lr].toString();
        this._trackableObjects.add(descriptor, new trackedNode_1.TrackedNode(descriptor.toString(), this._scene));
        return this._trackableObjects.get(descriptor);
    };
    ExampleObjectTracker.prototype.processResults = function (results) {
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
    ExampleObjectTracker.prototype.setCalibrationAsync = function (scalar) {
        if (scalar === void 0) { scalar = 1; }
        return this._tracker.setCalibrationAsync(Math.round(scalar * this._videoTexture.getSize().width), Math.round(scalar * this._videoTexture.getSize().height));
    };
    ExampleObjectTracker.getQuaternionFromRodrigues = function (x, y, z) {
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
    ExampleObjectTracker.prototype.startTracking = function () {
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
                                rotation: ExampleObjectTracker.getQuaternionFromRodrigues(marker.rx, marker.ry, marker.rz)
                            };
                        });
                        _this.processResults(results);
                    }
                    running = false;
                });
            }
        });
    };
    ExampleObjectTracker.prototype.stopTracking = function () {
        this._scene.onAfterRenderObservable.remove(this._runTrackingObserver);
        this._runTrackingObserver = null;
    };
    ExampleObjectTracker.createAsync = function (videoTexture, scene) {
        var objectTracker = new ExampleObjectTracker(videoTexture, scene);
        return exampleMarkerTracker_1.ExampleMarkerTracker.createAsync().then(function (tracker) {
            objectTracker._tracker = tracker;
            return objectTracker.setCalibrationAsync();
        }).then(function () {
            return objectTracker;
        });
    };
    return ExampleObjectTracker;
}());
exports.ExampleObjectTracker = ExampleObjectTracker;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../shared/filteredVector3":6,"../shared/trackedNode":7,"./exampleMarkerTracker":2}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dedicatedWorker_1 = require("../shared/dedicatedWorker");
var ExampleWorker = /** @class */ (function () {
    function ExampleWorker() {
    }
    ExampleWorker.onInitialized = function () {
        postMessage({
            message: "Got a module!"
        });
    };
    ExampleWorker.onMessage = function (event) {
        var data = event.data;
        data.wentToWorker = true;
        postMessage(data);
    };
    ExampleWorker.createAsync = function () {
        return new Promise(function (resolve) {
            var exampleWorker = new ExampleWorker();
            exampleWorker._worker = dedicatedWorker_1.DedicatedWorker.createFromLocation(ExampleWorker.MODULE_URL, ExampleWorker.onInitialized, ExampleWorker.onMessage);
            exampleWorker._worker.onmessage = function (event) {
                exampleWorker._worker.onmessage = dedicatedWorker_1.DedicatedWorker.unexpectedMessageHandler;
                resolve(exampleWorker);
            };
        });
    };
    ExampleWorker.prototype.sendMessageAsync = function (data) {
        var _this = this;
        var promise = new Promise(function (resolve) {
            _this._worker.onmessage = function (event) {
                resolve(event.data);
                _this._worker.onmessage = dedicatedWorker_1.DedicatedWorker.unexpectedMessageHandler;
            };
        });
        this._worker.postMessage(data);
        return promise;
    };
    ExampleWorker.MODULE_URL = "https://syntheticmagus.github.io/prototyping/babylonar/wasm/webpiled-aruco-ar.js";
    return ExampleWorker;
}());
exports.ExampleWorker = ExampleWorker;

},{"../shared/dedicatedWorker":5}],5:[function(require,module,exports){
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
    DedicatedWorker.unexpectedMessageHandler = function (event) {
        throw Error("Unexpected message from WebWorker: " + event);
    };
    return DedicatedWorker;
}());
exports.DedicatedWorker = DedicatedWorker;

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvdHMvYmFieWxvbkFyLnRzIiwic3JjL3RzL2V4YW1wbGVPYmplY3RUcmFja2VyL2V4YW1wbGVNYXJrZXJUcmFja2VyLnRzIiwic3JjL3RzL2V4YW1wbGVPYmplY3RUcmFja2VyL2V4YW1wbGVPYmplY3RUcmFja2VyLnRzIiwic3JjL3RzL2V4YW1wbGVXb3JrZXIvZXhhbXBsZVdvcmtlci50cyIsInNyYy90cy9zaGFyZWQvZGVkaWNhdGVkV29ya2VyLnRzIiwic3JjL3RzL3NoYXJlZC9maWx0ZXJlZFZlY3RvcjMudHMiLCJzcmMvdHMvc2hhcmVkL3RyYWNrZWROb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUNBQSxtREFBNkM7QUFDN0MsaUVBQTJEOzs7OztBQ0MzRCw2REFBMkQ7QUFLM0Q7SUFLSTtJQUF1QixDQUFDO0lBRVQsa0NBQWEsR0FBNUI7UUFDSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEIsV0FBVyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVjLDhCQUFTLEdBQXhCLFVBQXlCLEtBQW1CO1FBQ3hDLElBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFFeEIsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1osTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hCLFdBQVcsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ2hDO2FBQ0ksSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRSxXQUFXLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUNyQzthQUNJLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNqQixJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNuRixNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3RDLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4RSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRWxCLElBQUksT0FBTyxHQUFVLEVBQUUsQ0FBQztZQUN4QixJQUFJLE1BQU0sR0FBVyxDQUFDLENBQUM7WUFDdkIsSUFBSSxFQUFFLEdBQVcsQ0FBQyxDQUFDO1lBQ25CLElBQUksRUFBRSxHQUFXLEdBQUcsQ0FBQztZQUNyQixJQUFJLEVBQUUsR0FBVyxHQUFHLENBQUM7WUFDckIsSUFBSSxFQUFFLEdBQVcsR0FBRyxDQUFDO1lBQ3JCLElBQUksRUFBRSxHQUFXLEdBQUcsQ0FBQztZQUNyQixJQUFJLEVBQUUsR0FBVyxHQUFHLENBQUM7WUFDckIsSUFBSSxFQUFFLEdBQVcsR0FBRyxDQUFDO1lBQ3JCLEtBQUssSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLFNBQVMsR0FBRyxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7Z0JBQ3pELElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFFaEQsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDWCxFQUFFLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLElBQUksRUFBRSxDQUFDO2dCQUNiLEVBQUUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzdDLE1BQU0sSUFBSSxDQUFDLENBQUM7Z0JBQ1osRUFBRSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxJQUFJLENBQUMsQ0FBQztnQkFDWixFQUFFLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLElBQUksQ0FBQyxDQUFDO2dCQUNaLEVBQUUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzdDLE1BQU0sSUFBSSxDQUFDLENBQUM7Z0JBQ1osRUFBRSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxJQUFJLENBQUMsQ0FBQztnQkFDWixFQUFFLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUU3QyxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNULEVBQUUsRUFBRSxFQUFFO29CQUNOLEVBQUUsRUFBRSxFQUFFO29CQUNOLEVBQUUsRUFBRSxFQUFFO29CQUNOLEVBQUUsRUFBRSxFQUFFO29CQUNOLEVBQUUsRUFBRSxFQUFFO29CQUNOLEVBQUUsRUFBRSxFQUFFO29CQUNOLEVBQUUsRUFBRSxFQUFFO2lCQUNULENBQUMsQ0FBQzthQUNOO1lBRUQsV0FBVyxDQUFDO2dCQUNSLE9BQU8sRUFBRSxPQUFPO2FBQ25CLENBQUMsQ0FBQztTQUNOO0lBQ0wsQ0FBQztJQUVhLGdDQUFXLEdBQXpCO1FBQ0ksT0FBTyxJQUFJLE9BQU8sQ0FBdUIsVUFBQyxPQUFnRDtZQUN0RixJQUFJLE9BQU8sR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDekMsT0FBTyxDQUFDLE9BQU8sR0FBRyxpQ0FBZSxDQUFDLGtCQUFrQixDQUNoRCxvQkFBb0IsQ0FBQyxVQUFVLEVBQy9CLG9CQUFvQixDQUFDLGFBQWEsRUFDbEMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsVUFBQyxLQUFtQjtnQkFDNUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsaUNBQWUsQ0FBQyx3QkFBd0IsQ0FBQztnQkFDckUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JCLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVNLGtEQUFtQixHQUExQixVQUEyQixLQUFhLEVBQUUsTUFBYztRQUF4RCxpQkFxQkM7UUFwQkcsSUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQU8sVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUM5QyxLQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxVQUFDLE1BQU07Z0JBQzVCLEtBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLGlDQUFlLENBQUMsd0JBQXdCLENBQUM7Z0JBRWxFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7b0JBQ3hCLE9BQU8sRUFBRSxDQUFDO2lCQUNiO3FCQUNJO29CQUNELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3ZCO1lBQ0wsQ0FBQyxDQUFBO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUNyQixTQUFTLEVBQUUsSUFBSTtZQUNmLEtBQUssRUFBRSxLQUFLO1lBQ1osTUFBTSxFQUFFLE1BQU07U0FDakIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQztJQUVNLHNEQUF1QixHQUE5QixVQUErQixZQUEwQjtRQUF6RCxpQkFzQkM7UUFyQkcsSUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQVEsVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUMvQyxLQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxVQUFDLE1BQU07Z0JBQzVCLEtBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLGlDQUFlLENBQUMsd0JBQXdCLENBQUM7Z0JBRWxFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQ3JCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUNoQztxQkFDSTtvQkFDRCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN2QjtZQUNMLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7WUFDckIsS0FBSyxFQUFFLElBQUk7WUFDWCxLQUFLLEVBQUUsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUs7WUFDbkMsTUFBTSxFQUFFLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNO1lBQ3JDLFNBQVMsRUFBRSxZQUFZLENBQUMsVUFBVSxFQUFFO1NBQ3ZDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFuSXVCLCtCQUFVLEdBQVcsa0ZBQWtGLENBQUM7SUFvSXBJLDJCQUFDO0NBcklELEFBcUlDLElBQUE7QUFySVksb0RBQW9COzs7Ozs7QUNQakMsdUNBQTJHO0FBRTNHLCtEQUE2RDtBQUM3RCw2REFBMkQ7QUFDM0QscURBQW1EO0FBRW5EO0lBd0JJLDhCQUFZLFlBQTBCLEVBQUUsS0FBWTtRQXJCNUMseUJBQW9CLEdBQThCLElBQUksQ0FBQztRQUV2RCxzQkFBaUIsR0FBa0MsSUFBSSw0QkFBZ0IsRUFBZSxDQUFDO1FBRXZGLGtCQUFhLEdBQVksbUJBQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN4Qyx1QkFBa0IsR0FBVyxDQUFDLENBQUM7UUFDL0Isb0JBQWUsR0FBWSxtQkFBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzFDLHlCQUFvQixHQUFXLENBQUMsQ0FBQztRQUNqQyxzQkFBaUIsR0FBWSxtQkFBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzVDLDJCQUFzQixHQUFXLENBQUMsQ0FBQztRQUNuQyxpQkFBWSxHQUFZLG1CQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdkMsa0JBQWEsR0FBb0IsSUFBSSxpQ0FBZSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEUsb0JBQWUsR0FBb0IsSUFBSSxpQ0FBZSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEUsc0JBQWlCLEdBQW9CLElBQUksaUNBQWUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3hFLHFCQUFnQixHQUFZLG1CQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDM0MscUJBQWdCLEdBQWUsc0JBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNyRCxXQUFNLEdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDcEIsV0FBTSxHQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLFdBQU0sR0FBVyxDQUFDLENBQUMsQ0FBQztRQUNwQixXQUFNLEdBQVcsQ0FBQyxDQUFDLENBQUM7UUFHeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7SUFDdEMsQ0FBQztJQUVELGlEQUFrQixHQUFsQixVQUFtQixFQUFVLEVBQUUsRUFBVSxFQUFFLEVBQVUsRUFBRSxFQUFVO1FBQzdELElBQU0sVUFBVSxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDL0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSx5QkFBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUM1RixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELDZDQUFjLEdBQWQsVUFBZSxPQUFZO1FBQ3ZCLDRCQUE0QjtRQURoQyxpQkE2R0M7UUExR0csSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxVQUFDLFVBQWtCLEVBQUUsYUFBMEI7WUFDMUUsSUFBSSxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQyxLQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQyxLQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQyxLQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQyxLQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVoQyxLQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3RDLEtBQUksQ0FBQyxrQkFBa0IsR0FBRyxHQUFHLENBQUM7WUFDOUIsS0FBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN4QyxLQUFJLENBQUMsb0JBQW9CLEdBQUcsR0FBRyxDQUFDO1lBQ2hDLEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMxQyxLQUFJLENBQUMsc0JBQXNCLEdBQUcsR0FBRyxDQUFDO1lBRWxDLElBQUksT0FBTyxDQUFDLEtBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDdEIsSUFBSSxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO29CQUN0QixLQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNyQyxLQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1RCxLQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1RCxLQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFFcEMsS0FBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUNqRCxLQUFJLENBQUMsa0JBQWtCLElBQUksR0FBRyxDQUFDO2lCQUNsQztnQkFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7b0JBQ3RCLEtBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ3JDLEtBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzVELEtBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ2pFLEtBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBRTlCLEtBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDbkQsS0FBSSxDQUFDLG9CQUFvQixJQUFJLEdBQUcsQ0FBQztpQkFDcEM7Z0JBRUQsSUFBSSxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO29CQUN0QixLQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNyQyxLQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1RCxLQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNqRSxLQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUU5QixLQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDckQsS0FBSSxDQUFDLHNCQUFzQixJQUFJLEdBQUcsQ0FBQztpQkFDdEM7YUFDSjtZQUVELElBQUksT0FBTyxDQUFDLEtBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDdEIsSUFBSSxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO29CQUN0QixLQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNyQyxLQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1RCxLQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNqRSxLQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUU5QixLQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDckQsS0FBSSxDQUFDLHNCQUFzQixJQUFJLEdBQUcsQ0FBQztpQkFDdEM7Z0JBRUQsSUFBSSxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO29CQUN0QixLQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNyQyxLQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1RCxLQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNqRSxLQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUU5QixLQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQ25ELEtBQUksQ0FBQyxvQkFBb0IsSUFBSSxHQUFHLENBQUM7aUJBQ3BDO2FBQ0o7WUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFJLENBQUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDOUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDckMsS0FBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEtBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDNUQsS0FBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEtBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDNUQsS0FBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRXBDLEtBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDakQsS0FBSSxDQUFDLGtCQUFrQixJQUFJLEdBQUcsQ0FBQzthQUNsQztZQUVELElBQUksS0FBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFJLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxFQUFFO2dCQUN2RixLQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsS0FBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQy9ELEtBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEdBQUcsR0FBRyxLQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztnQkFDbkUsS0FBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsS0FBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7Z0JBRXZFLEtBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEtBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDakQsS0FBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsS0FBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNyRCxLQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUV6RCxLQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEtBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDbkQsc0JBQVUsQ0FBQywrQkFBK0IsQ0FDdEMsS0FBSSxDQUFDLGVBQWUsRUFDcEIsbUJBQU8sQ0FBQyxLQUFLLENBQUMsS0FBSSxDQUFDLGlCQUFpQixFQUFFLEtBQUksQ0FBQyxlQUFlLENBQUMsRUFDM0QsS0FBSSxDQUFDLGlCQUFpQixFQUN0QixLQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFFM0IsYUFBYSxDQUFDLFdBQVcsQ0FDckIsS0FBSSxDQUFDLGdCQUFnQixFQUNyQixLQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLElBQUksQ0FBQyxDQUFDO2FBQ2I7aUJBQ0k7Z0JBQ0QsYUFBYSxDQUFDLFdBQVcsQ0FDckIsS0FBSSxDQUFDLGdCQUFnQixFQUNyQixLQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLElBQUksQ0FBQyxDQUFDO2FBQ2I7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxrREFBbUIsR0FBbkIsVUFBb0IsTUFBVTtRQUFWLHVCQUFBLEVBQUEsVUFBVTtRQUMxQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQ3ZELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRU0sK0NBQTBCLEdBQWpDLFVBQWtDLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUztRQUM3RCxJQUFJLEdBQUcsR0FBRyxJQUFJLG1CQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakMsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3pCLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBQzlCLElBQUksS0FBSyxLQUFLLEdBQUcsRUFBRTtZQUNmLE9BQU8sc0JBQVUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzlDO2FBQ0k7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNmO0lBQ0wsQ0FBQztJQUFBLENBQUM7SUFFRiw0Q0FBYSxHQUFiO1FBQUEsaUJBd0JDO1FBdkJHLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUM7WUFDaEUsSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDVixPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUVmLEtBQUksQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsS0FBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE9BQU87b0JBQ2xFLElBQUksT0FBTyxFQUFFO3dCQUNULElBQUksT0FBTyxHQUFRLEVBQUUsQ0FBQzt3QkFFdEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFBLE1BQU07NEJBQ2xCLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUc7Z0NBQ2pCLFFBQVEsRUFBRSxJQUFJLG1CQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQ0FDdkQsUUFBUSxFQUFFLG9CQUFvQixDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDOzZCQUM3RixDQUFBO3dCQUNMLENBQUMsQ0FBQyxDQUFDO3dCQUVILEtBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQ2hDO29CQUVELE9BQU8sR0FBRyxLQUFLLENBQUM7Z0JBQ3BCLENBQUMsQ0FBQyxDQUFDO2FBQ047UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCwyQ0FBWSxHQUFaO1FBQ0ksSUFBSSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQztJQUNyQyxDQUFDO0lBRU0sZ0NBQVcsR0FBbEIsVUFBbUIsWUFBMEIsRUFBRSxLQUFZO1FBQ3ZELElBQUksYUFBYSxHQUFHLElBQUksb0JBQW9CLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sMkNBQW9CLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQUEsT0FBTztZQUNsRCxhQUFhLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztZQUNqQyxPQUFPLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNKLE9BQU8sYUFBYSxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUNMLDJCQUFDO0FBQUQsQ0E1TUEsQUE0TUMsSUFBQTtBQTVNWSxvREFBb0I7Ozs7Ozs7QUNOakMsNkRBQTJEO0FBSTNEO0lBS0k7SUFBdUIsQ0FBQztJQUVULDJCQUFhLEdBQTVCO1FBQ0ksV0FBVyxDQUFDO1lBQ1IsT0FBTyxFQUFFLGVBQWU7U0FDM0IsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVjLHVCQUFTLEdBQXhCLFVBQXlCLEtBQW1CO1FBQ3hDLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDekIsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFYSx5QkFBVyxHQUF6QjtRQUNJLE9BQU8sSUFBSSxPQUFPLENBQWdCLFVBQUMsT0FBd0M7WUFDdkUsSUFBSSxhQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUN4QyxhQUFhLENBQUMsT0FBTyxHQUFHLGlDQUFlLENBQUMsa0JBQWtCLENBQ3RELGFBQWEsQ0FBQyxVQUFVLEVBQ3hCLGFBQWEsQ0FBQyxhQUFhLEVBQzNCLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM3QixhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxVQUFDLEtBQW1CO2dCQUNsRCxhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxpQ0FBZSxDQUFDLHdCQUF3QixDQUFDO2dCQUMzRSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU0sd0NBQWdCLEdBQXZCLFVBQXdCLElBQVM7UUFBakMsaUJBV0M7UUFWRyxJQUFJLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBTSxVQUFDLE9BQTZCO1lBQ3pELEtBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLFVBQUMsS0FBbUI7Z0JBQ3pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3BCLEtBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLGlDQUFlLENBQUMsd0JBQXdCLENBQUM7WUFDdEUsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUvQixPQUFPLE9BQU8sQ0FBQztJQUNuQixDQUFDO0lBM0N1Qix3QkFBVSxHQUFXLGtGQUFrRixDQUFDO0lBNENwSSxvQkFBQztDQTdDRCxBQTZDQyxJQUFBO0FBN0NZLHNDQUFhOzs7OztBQ0oxQjtJQUFBO0lBNEJBLENBQUM7SUExQmtCLGlDQUFpQixHQUFoQztRQUFpQyxpQkFBaUI7YUFBakIsVUFBaUIsRUFBakIscUJBQWlCLEVBQWpCLElBQWlCO1lBQWpCLDRCQUFpQjs7UUFDOUMsSUFBSSxVQUFVLEdBQVcsRUFBRSxDQUFDO1FBQzVCLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUMvQyxVQUFVLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ3pDO1FBQ0QsVUFBVSxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxNQUFNLENBQUM7UUFDcEUsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFYSxrQ0FBa0IsR0FBaEMsVUFBaUMsS0FBYSxFQUFFLGFBQXlCLEVBQUUsU0FBd0M7UUFDL0csSUFBSSxjQUFjLEdBQVcsa0ZBRVgsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyx5RkFHNUMsR0FBRyxhQUFhLENBQUMsUUFBUSxFQUFFLEdBQUcsaUNBRXJDLENBQUM7UUFDSixJQUFJLGNBQWMsR0FBVyxtQkFBbUIsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLEdBQUcsR0FBRyxDQUFDO1FBQzlFLElBQUksZ0JBQWdCLEdBQVcsZ0RBQWdELEdBQUcsS0FBSyxHQUFHLFFBQVEsQ0FBQztRQUNuRyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUVhLHdDQUF3QixHQUF0QyxVQUF1QyxLQUFtQjtRQUN0RCxNQUFNLEtBQUssQ0FBQyxxQ0FBcUMsR0FBRyxLQUFLLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBQ0wsc0JBQUM7QUFBRCxDQTVCQSxBQTRCQyxJQUFBO0FBNUJZLDBDQUFlOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDQTVCLHVDQUFtQztBQUVuQztJQUFxQyxtQ0FBTztJQU14Qyx5QkFBbUIsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTLEVBQUUsV0FBdUI7UUFBdkIsNEJBQUEsRUFBQSxlQUF1QjtRQUEzRSxZQUNJLGtCQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBV2pCO1FBVEcsS0FBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNuQixLQUFJLENBQUMsdUJBQXVCLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxXQUFXLEVBQUUsRUFBRSxHQUFHLEVBQUU7WUFDeEMsS0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxtQkFBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QyxLQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzFDO1FBRUQsS0FBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLG1CQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7SUFDL0MsQ0FBQztJQUVNLG1DQUFTLEdBQWhCLFVBQWlCLE1BQWU7UUFDNUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBRW5ELElBQUksa0JBQWtCLEdBQUcsR0FBRyxDQUFDO1FBQzdCLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRTtZQUNqRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLEdBQUcsbUJBQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckcsa0JBQWtCLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzNEO1FBQ0Qsa0JBQWtCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFFM0MsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRTtZQUNsRCxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsRUFBRTtnQkFDekQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLGtCQUFrQixJQUFJLENBQUMsQ0FBQzthQUMzQjtTQUNKO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsa0JBQWtCLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBQ0wsc0JBQUM7QUFBRCxDQTdDQSxBQTZDQyxDQTdDb0MsbUJBQU8sR0E2QzNDO0FBN0NZLDBDQUFlOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNGNUIsdUNBQWlGO0FBRWpGO0lBQWlDLCtCQUFhO0lBUTFDLHFCQUFtQixJQUFZLEVBQUUsS0FBZ0MsRUFBRSxxQkFBcUM7UUFBckMsc0NBQUEsRUFBQSw0QkFBcUM7UUFBeEcsWUFDSSxrQkFBTSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxTQWtCM0I7UUFoQkcsS0FBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDekIsS0FBSSxDQUFDLHFCQUFxQixHQUFHLHFCQUFxQixDQUFDO1FBQ25ELElBQUksS0FBSSxDQUFDLHFCQUFxQixFQUFFO1lBQzVCLEtBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDMUI7UUFFRCxLQUFJLENBQUMsc0JBQXNCLEdBQUcsRUFBRSxDQUFDO1FBRWpDLEtBQUksQ0FBQyw0QkFBNEIsR0FBRyxJQUFJLHNCQUFVLENBQUMsVUFBQSxRQUFRO1lBQ3ZELElBQUksS0FBSSxDQUFDLFdBQVcsRUFBRTtnQkFDbEIsS0FBSSxDQUFDLDRCQUE0QixDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSSxDQUFDLENBQUM7YUFDcEU7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNILEtBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLHNCQUFVLEVBQUUsQ0FBQztRQUVqRCxLQUFJLENBQUMsa0JBQWtCLEdBQUcsc0JBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7SUFDcEQsQ0FBQztJQUVNLGdDQUFVLEdBQWpCO1FBQ0ksT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQzVCLENBQUM7SUFFTSxpQ0FBVyxHQUFsQixVQUFtQixRQUFpQixFQUFFLFFBQW9CLEVBQUUsVUFBbUI7UUFDM0UsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxILDZEQUE2RDtRQUM3RCxJQUFJLFVBQVUsRUFBRTtZQUNaLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUM7U0FDbkM7YUFDSTtZQUNELElBQUksQ0FBQyxzQkFBc0IsSUFBSSxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxFQUFFO2dCQUNqQyxVQUFVLEdBQUcsSUFBSSxDQUFDO2FBQ3JCO1NBQ0o7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxVQUFVLEVBQUU7WUFDakMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzRDthQUNJLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUN0QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3ZEO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7UUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUNMLGtCQUFDO0FBQUQsQ0F6REEsQUF5REMsQ0F6RGdDLHlCQUFhLEdBeUQ3QztBQXpEWSxrQ0FBVyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImV4cG9ydCAqIGZyb20gXCIuL2V4YW1wbGVXb3JrZXIvZXhhbXBsZVdvcmtlclwiXG5leHBvcnQgKiBmcm9tIFwiLi9leGFtcGxlT2JqZWN0VHJhY2tlci9leGFtcGxlT2JqZWN0VHJhY2tlclwiIiwiaW1wb3J0IHsgVmlkZW9UZXh0dXJlIH0gZnJvbSBcImJhYnlsb25qc1wiXHJcblxyXG5pbXBvcnQgeyBEZWRpY2F0ZWRXb3JrZXIgfSBmcm9tIFwiLi4vc2hhcmVkL2RlZGljYXRlZFdvcmtlclwiXHJcblxyXG5kZWNsYXJlIHZhciBNb2R1bGU6IGFueTtcclxuZGVjbGFyZSBmdW5jdGlvbiBwb3N0TWVzc2FnZShkYXRhOiBhbnkpOiB2b2lkO1xyXG5cclxuZXhwb3J0IGNsYXNzIEV4YW1wbGVNYXJrZXJUcmFja2VyIHtcclxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IE1PRFVMRV9VUkw6IHN0cmluZyA9IFwiaHR0cHM6Ly9zeW50aGV0aWNtYWd1cy5naXRodWIuaW8vcHJvdG90eXBpbmcvYmFieWxvbmFyL3dhc20vd2VicGlsZWQtYXJ1Y28tYXIuanNcIjtcclxuICAgIFxyXG4gICAgcHJpdmF0ZSBfd29ya2VyOiBXb3JrZXI7XHJcblxyXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHt9XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgb25Jbml0aWFsaXplZCgpIHtcclxuICAgICAgICBNb2R1bGUuX3Jlc2V0KCk7XHJcbiAgICAgICAgcG9zdE1lc3NhZ2UoeyBpbml0aWFsaXplZDogdHJ1ZSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBvbk1lc3NhZ2UoZXZlbnQ6IE1lc3NhZ2VFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGFyZ3MgPSBldmVudC5kYXRhO1xyXG5cclxuICAgICAgICBpZiAoYXJncy5yZXNldCkge1xyXG4gICAgICAgICAgICBNb2R1bGUuX3Jlc2V0KCk7XHJcbiAgICAgICAgICAgIHBvc3RNZXNzYWdlKHsgcmVzZXQ6IHRydWUgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGFyZ3MuY2FsaWJyYXRlKSB7XHJcbiAgICAgICAgICAgIE1vZHVsZS5fc2V0X2NhbGlicmF0aW9uX2Zyb21fZnJhbWVfc2l6ZShhcmdzLndpZHRoLCBhcmdzLmhlaWdodCk7XHJcbiAgICAgICAgICAgIHBvc3RNZXNzYWdlKHsgY2FsaWJyYXRlZDogdHJ1ZSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoYXJncy50cmFjaykge1xyXG4gICAgICAgICAgICBsZXQgYnVmID0gTW9kdWxlLl9tYWxsb2MoYXJncy5pbWFnZURhdGEubGVuZ3RoICogYXJncy5pbWFnZURhdGEuQllURVNfUEVSX0VMRU1FTlQpO1xyXG4gICAgICAgICAgICBNb2R1bGUuSEVBUDguc2V0KGFyZ3MuaW1hZ2VEYXRhLCBidWYpO1xyXG4gICAgICAgICAgICBsZXQgbnVtTWFya2VycyA9IE1vZHVsZS5fcHJvY2Vzc19pbWFnZShhcmdzLndpZHRoLCBhcmdzLmhlaWdodCwgYnVmLCAxKTtcclxuICAgICAgICAgICAgTW9kdWxlLl9mcmVlKGJ1Zik7XHJcblxyXG4gICAgICAgICAgICBsZXQgbWFya2VyczogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgbGV0IG9mZnNldDogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgbGV0IGlkOiBudW1iZXIgPSAwO1xyXG4gICAgICAgICAgICBsZXQgdHg6IG51bWJlciA9IDAuMDtcclxuICAgICAgICAgICAgbGV0IHR5OiBudW1iZXIgPSAwLjA7XHJcbiAgICAgICAgICAgIGxldCB0ejogbnVtYmVyID0gMC4wO1xyXG4gICAgICAgICAgICBsZXQgcng6IG51bWJlciA9IDAuMDtcclxuICAgICAgICAgICAgbGV0IHJ5OiBudW1iZXIgPSAwLjA7XHJcbiAgICAgICAgICAgIGxldCByejogbnVtYmVyID0gMC4wO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBtYXJrZXJJZHggPSAwOyBtYXJrZXJJZHggPCBudW1NYXJrZXJzOyBtYXJrZXJJZHgrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHB0ciA9IE1vZHVsZS5fZ2V0X3RyYWNrZWRfbWFya2VyKG1hcmtlcklkeCk7XHJcblxyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ID0gMDtcclxuICAgICAgICAgICAgICAgIGlkID0gTW9kdWxlLmdldFZhbHVlKHB0ciArIG9mZnNldCwgXCJpMzJcIik7XHJcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gMTI7XHJcbiAgICAgICAgICAgICAgICB0eCA9IE1vZHVsZS5nZXRWYWx1ZShwdHIgKyBvZmZzZXQsIFwiZG91YmxlXCIpO1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IDg7XHJcbiAgICAgICAgICAgICAgICB0eSA9IE1vZHVsZS5nZXRWYWx1ZShwdHIgKyBvZmZzZXQsIFwiZG91YmxlXCIpO1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IDg7XHJcbiAgICAgICAgICAgICAgICB0eiA9IE1vZHVsZS5nZXRWYWx1ZShwdHIgKyBvZmZzZXQsIFwiZG91YmxlXCIpO1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IDg7XHJcbiAgICAgICAgICAgICAgICByeCA9IE1vZHVsZS5nZXRWYWx1ZShwdHIgKyBvZmZzZXQsIFwiZG91YmxlXCIpO1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IDg7XHJcbiAgICAgICAgICAgICAgICByeSA9IE1vZHVsZS5nZXRWYWx1ZShwdHIgKyBvZmZzZXQsIFwiZG91YmxlXCIpO1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IDg7XHJcbiAgICAgICAgICAgICAgICByeiA9IE1vZHVsZS5nZXRWYWx1ZShwdHIgKyBvZmZzZXQsIFwiZG91YmxlXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIG1hcmtlcnMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHR4OiB0eCxcclxuICAgICAgICAgICAgICAgICAgICB0eTogdHksXHJcbiAgICAgICAgICAgICAgICAgICAgdHo6IHR6LFxyXG4gICAgICAgICAgICAgICAgICAgIHJ4OiByeCxcclxuICAgICAgICAgICAgICAgICAgICByeTogcnksXHJcbiAgICAgICAgICAgICAgICAgICAgcno6IHJ6XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcG9zdE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICAgICAgbWFya2VyczogbWFya2Vyc1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVBc3luYygpOiBQcm9taXNlPEV4YW1wbGVNYXJrZXJUcmFja2VyPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPEV4YW1wbGVNYXJrZXJUcmFja2VyPigocmVzb2x2ZTogKHRyYWNrZXI6IEV4YW1wbGVNYXJrZXJUcmFja2VyKSA9PiB2b2lkKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCB0cmFja2VyID0gbmV3IEV4YW1wbGVNYXJrZXJUcmFja2VyKCk7XHJcbiAgICAgICAgICAgIHRyYWNrZXIuX3dvcmtlciA9IERlZGljYXRlZFdvcmtlci5jcmVhdGVGcm9tTG9jYXRpb24oXHJcbiAgICAgICAgICAgICAgICBFeGFtcGxlTWFya2VyVHJhY2tlci5NT0RVTEVfVVJMLFxyXG4gICAgICAgICAgICAgICAgRXhhbXBsZU1hcmtlclRyYWNrZXIub25Jbml0aWFsaXplZCxcclxuICAgICAgICAgICAgICAgIEV4YW1wbGVNYXJrZXJUcmFja2VyLm9uTWVzc2FnZSk7XHJcbiAgICAgICAgICAgIHRyYWNrZXIuX3dvcmtlci5vbm1lc3NhZ2UgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJhY2tlci5fd29ya2VyLm9ubWVzc2FnZSA9IERlZGljYXRlZFdvcmtlci51bmV4cGVjdGVkTWVzc2FnZUhhbmRsZXI7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRyYWNrZXIpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXRDYWxpYnJhdGlvbkFzeW5jKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3dvcmtlci5vbm1lc3NhZ2UgPSBEZWRpY2F0ZWRXb3JrZXIudW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxpYnJhdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlc3VsdC5kYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLl93b3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICBjYWxpYnJhdGU6IHRydWUsXHJcbiAgICAgICAgICAgIHdpZHRoOiB3aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiBoZWlnaHRcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGZpbmRNYXJrZXJzSW5JbWFnZUFzeW5jKHZpZGVvVGV4dHVyZTogVmlkZW9UZXh0dXJlKTogUHJvbWlzZTxhbnlbXT4ge1xyXG4gICAgICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZTxhbnlbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLl93b3JrZXIub25tZXNzYWdlID0gKHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IERlZGljYXRlZFdvcmtlci51bmV4cGVjdGVkTWVzc2FnZUhhbmRsZXI7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZGF0YS5tYXJrZXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQuZGF0YS5tYXJrZXJzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXN1bHQuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuX3dvcmtlci5wb3N0TWVzc2FnZSh7XHJcbiAgICAgICAgICAgIHRyYWNrOiB0cnVlLFxyXG4gICAgICAgICAgICB3aWR0aDogdmlkZW9UZXh0dXJlLmdldFNpemUoKS53aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb1RleHR1cmUuZ2V0U2l6ZSgpLmhlaWdodCxcclxuICAgICAgICAgICAgaW1hZ2VEYXRhOiB2aWRlb1RleHR1cmUucmVhZFBpeGVscygpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IHsgTnVsbGFibGUsIE9ic2VydmVyLCBRdWF0ZXJuaW9uLCBTY2VuZSwgU3RyaW5nRGljdGlvbmFyeSwgVmVjdG9yMywgVmlkZW9UZXh0dXJlIH0gZnJvbSBcImJhYnlsb25qc1wiO1xyXG5cclxuaW1wb3J0IHsgRXhhbXBsZU1hcmtlclRyYWNrZXIgfSBmcm9tIFwiLi9leGFtcGxlTWFya2VyVHJhY2tlclwiXHJcbmltcG9ydCB7IEZpbHRlcmVkVmVjdG9yMyB9IGZyb20gXCIuLi9zaGFyZWQvZmlsdGVyZWRWZWN0b3IzXCJcclxuaW1wb3J0IHsgVHJhY2tlZE5vZGUgfSBmcm9tIFwiLi4vc2hhcmVkL3RyYWNrZWROb2RlXCJcclxuXHJcbmV4cG9ydCBjbGFzcyBFeGFtcGxlT2JqZWN0VHJhY2tlciB7XHJcbiAgICBwcml2YXRlIF9zY2VuZTogU2NlbmU7XHJcbiAgICBwcml2YXRlIF92aWRlb1RleHR1cmU6IFZpZGVvVGV4dHVyZTtcclxuICAgIHByaXZhdGUgX3J1blRyYWNraW5nT2JzZXJ2ZXI6IE51bGxhYmxlPE9ic2VydmVyPFNjZW5lPj4gPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBfdHJhY2tlcjogRXhhbXBsZU1hcmtlclRyYWNrZXI7XHJcbiAgICBwcml2YXRlIF90cmFja2FibGVPYmplY3RzOiBTdHJpbmdEaWN0aW9uYXJ5PFRyYWNrZWROb2RlPiA9IG5ldyBTdHJpbmdEaWN0aW9uYXJ5PFRyYWNrZWROb2RlPigpO1xyXG5cclxuICAgIHByaXZhdGUgX19wb3NFc3RpbWF0ZTogVmVjdG9yMyA9IFZlY3RvcjMuWmVybygpO1xyXG4gICAgcHJpdmF0ZSBfX3Bvc0VzdGltYXRlQ291bnQ6IG51bWJlciA9IDA7XHJcbiAgICBwcml2YXRlIF9fcmlnaHRFc3RpbWF0ZTogVmVjdG9yMyA9IFZlY3RvcjMuWmVybygpO1xyXG4gICAgcHJpdmF0ZSBfX3JpZ2h0RXN0aW1hdGVDb3VudDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgX19mb3J3YXJkRXN0aW1hdGU6IFZlY3RvcjMgPSBWZWN0b3IzLlplcm8oKTtcclxuICAgIHByaXZhdGUgX19mb3J3YXJkRXN0aW1hdGVDb3VudDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgX19zY3JhdGNoVmVjOiBWZWN0b3IzID0gVmVjdG9yMy5aZXJvKCk7XHJcbiAgICBwcml2YXRlIF9fZmlsdGVyZWRQb3M6IEZpbHRlcmVkVmVjdG9yMyA9IG5ldyBGaWx0ZXJlZFZlY3RvcjMoMC4wLCAwLjAsIDAuMCk7XHJcbiAgICBwcml2YXRlIF9fZmlsdGVyZWRSaWdodDogRmlsdGVyZWRWZWN0b3IzID0gbmV3IEZpbHRlcmVkVmVjdG9yMygwLjAsIDAuMCwgMC4wKTtcclxuICAgIHByaXZhdGUgX19maWx0ZXJlZEZvcndhcmQ6IEZpbHRlcmVkVmVjdG9yMyA9IG5ldyBGaWx0ZXJlZFZlY3RvcjMoMC4wLCAwLjAsIDAuMCk7XHJcbiAgICBwcml2YXRlIF9fdGFyZ2V0UG9zaXRpb246IFZlY3RvcjMgPSBWZWN0b3IzLlplcm8oKTtcclxuICAgIHByaXZhdGUgX190YXJnZXRSb3RhdGlvbjogUXVhdGVybmlvbiA9IFF1YXRlcm5pb24uSWRlbnRpdHkoKTtcclxuICAgIHByaXZhdGUgX191bElkOiBudW1iZXIgPSAtMTtcclxuICAgIHByaXZhdGUgX191cklkOiBudW1iZXIgPSAtMTtcclxuICAgIHByaXZhdGUgX19sbElkOiBudW1iZXIgPSAtMTtcclxuICAgIHByaXZhdGUgX19scklkOiBudW1iZXIgPSAtMTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih2aWRlb1RleHR1cmU6IFZpZGVvVGV4dHVyZSwgc2NlbmU6IFNjZW5lKSB7XHJcbiAgICAgICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcclxuICAgICAgICB0aGlzLl92aWRlb1RleHR1cmUgPSB2aWRlb1RleHR1cmU7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkVHJhY2thYmxlT2JqZWN0KHVsOiBudW1iZXIsIHVyOiBudW1iZXIsIGxsOiBudW1iZXIsIGxyOiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBkZXNjcmlwdG9yID0gW3VsLCB1ciwgbGwsIGxyXS50b1N0cmluZygpO1xyXG4gICAgICAgIHRoaXMuX3RyYWNrYWJsZU9iamVjdHMuYWRkKGRlc2NyaXB0b3IsIG5ldyBUcmFja2VkTm9kZShkZXNjcmlwdG9yLnRvU3RyaW5nKCksIHRoaXMuX3NjZW5lKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYWNrYWJsZU9iamVjdHMuZ2V0KGRlc2NyaXB0b3IpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb2Nlc3NSZXN1bHRzKHJlc3VsdHM6IGFueSkge1xyXG4gICAgICAgIC8vIFRPRE86IFRISVMgSVMgSEFDS0VEIENPREVcclxuXHJcbiAgICAgICAgdGhpcy5fdHJhY2thYmxlT2JqZWN0cy5mb3JFYWNoKChkZXNjcmlwdG9yOiBzdHJpbmcsIHRyYWNrZWRPYmplY3Q6IFRyYWNrZWROb2RlKSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBudW1zID0gZGVzY3JpcHRvci5zcGxpdCgnLCcpO1xyXG4gICAgICAgICAgICB0aGlzLl9fdWxJZCA9IHBhcnNlSW50KG51bXNbMF0pO1xyXG4gICAgICAgICAgICB0aGlzLl9fdXJJZCA9IHBhcnNlSW50KG51bXNbMV0pO1xyXG4gICAgICAgICAgICB0aGlzLl9fbGxJZCA9IHBhcnNlSW50KG51bXNbMl0pO1xyXG4gICAgICAgICAgICB0aGlzLl9fbHJJZCA9IHBhcnNlSW50KG51bXNbM10pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fX3Bvc0VzdGltYXRlLnNldCgwLjAsIDAuMCwgMC4wKTtcclxuICAgICAgICAgICAgdGhpcy5fX3Bvc0VzdGltYXRlQ291bnQgPSAwLjA7XHJcbiAgICAgICAgICAgIHRoaXMuX19yaWdodEVzdGltYXRlLnNldCgwLjAsIDAuMCwgMC4wKTtcclxuICAgICAgICAgICAgdGhpcy5fX3JpZ2h0RXN0aW1hdGVDb3VudCA9IDAuMDtcclxuICAgICAgICAgICAgdGhpcy5fX2ZvcndhcmRFc3RpbWF0ZS5zZXQoMC4wLCAwLjAsIDAuMCk7XHJcbiAgICAgICAgICAgIHRoaXMuX19mb3J3YXJkRXN0aW1hdGVDb3VudCA9IDAuMDtcclxuXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRzW3RoaXMuX19sbElkXSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHNbdGhpcy5fX3VySWRdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuc2V0KDAuMCwgMC4wLCAwLjApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLmFkZEluUGxhY2UocmVzdWx0c1t0aGlzLl9fbGxJZF0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLmFkZEluUGxhY2UocmVzdWx0c1t0aGlzLl9fdXJJZF0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnNjYWxlSW5QbGFjZSgwLjUpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19wb3NFc3RpbWF0ZS5hZGRJblBsYWNlKHRoaXMuX19zY3JhdGNoVmVjKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fcG9zRXN0aW1hdGVDb3VudCArPSAxLjA7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHNbdGhpcy5fX2xySWRdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuc2V0KDAuMCwgMC4wLCAwLjApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLmFkZEluUGxhY2UocmVzdWx0c1t0aGlzLl9fbHJJZF0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnN1YnRyYWN0SW5QbGFjZShyZXN1bHRzW3RoaXMuX19sbElkXS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3JpZ2h0RXN0aW1hdGUuYWRkSW5QbGFjZSh0aGlzLl9fc2NyYXRjaFZlYyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3JpZ2h0RXN0aW1hdGVDb3VudCArPSAxLjA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHRzW3RoaXMuX191bElkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnNldCgwLjAsIDAuMCwgMC4wKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fc2NyYXRjaFZlYy5hZGRJblBsYWNlKHJlc3VsdHNbdGhpcy5fX3VsSWRdLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fc2NyYXRjaFZlYy5zdWJ0cmFjdEluUGxhY2UocmVzdWx0c1t0aGlzLl9fbGxJZF0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19mb3J3YXJkRXN0aW1hdGUuYWRkSW5QbGFjZSh0aGlzLl9fc2NyYXRjaFZlYyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2ZvcndhcmRFc3RpbWF0ZUNvdW50ICs9IDEuMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlc3VsdHNbdGhpcy5fX3VySWRdKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0c1t0aGlzLl9fbHJJZF0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fc2NyYXRjaFZlYy5zZXQoMC4wLCAwLjAsIDAuMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuYWRkSW5QbGFjZShyZXN1bHRzW3RoaXMuX191cklkXS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuc3VidHJhY3RJblBsYWNlKHJlc3VsdHNbdGhpcy5fX2xySWRdLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fc2NyYXRjaFZlYy5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fZm9yd2FyZEVzdGltYXRlLmFkZEluUGxhY2UodGhpcy5fX3NjcmF0Y2hWZWMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19mb3J3YXJkRXN0aW1hdGVDb3VudCArPSAxLjA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHRzW3RoaXMuX191bElkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnNldCgwLjAsIDAuMCwgMC4wKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fc2NyYXRjaFZlYy5hZGRJblBsYWNlKHJlc3VsdHNbdGhpcy5fX3VySWRdLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fc2NyYXRjaFZlYy5zdWJ0cmFjdEluUGxhY2UocmVzdWx0c1t0aGlzLl9fdWxJZF0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19yaWdodEVzdGltYXRlLmFkZEluUGxhY2UodGhpcy5fX3NjcmF0Y2hWZWMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19yaWdodEVzdGltYXRlQ291bnQgKz0gMS4wO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVzdWx0c1t0aGlzLl9fbHJJZF0gJiYgcmVzdWx0c1t0aGlzLl9fdWxJZF0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLnNldCgwLjAsIDAuMCwgMC4wKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX19zY3JhdGNoVmVjLmFkZEluUGxhY2UocmVzdWx0c1t0aGlzLl9fbHJJZF0ucG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fX3NjcmF0Y2hWZWMuYWRkSW5QbGFjZShyZXN1bHRzW3RoaXMuX191bElkXS5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9fc2NyYXRjaFZlYy5zY2FsZUluUGxhY2UoMC41KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgdGhpcy5fX3Bvc0VzdGltYXRlLmFkZEluUGxhY2UodGhpcy5fX3NjcmF0Y2hWZWMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fX3Bvc0VzdGltYXRlQ291bnQgKz0gMS4wO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fX3Bvc0VzdGltYXRlQ291bnQgKiB0aGlzLl9fcmlnaHRFc3RpbWF0ZUNvdW50ICogdGhpcy5fX2ZvcndhcmRFc3RpbWF0ZUNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fX3Bvc0VzdGltYXRlLnNjYWxlSW5QbGFjZSgxLjAgLyB0aGlzLl9fcG9zRXN0aW1hdGVDb3VudCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9fcmlnaHRFc3RpbWF0ZS5zY2FsZUluUGxhY2UoMS4wIC8gdGhpcy5fX3JpZ2h0RXN0aW1hdGVDb3VudCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9fZm9yd2FyZEVzdGltYXRlLnNjYWxlSW5QbGFjZSgxLjAgLyB0aGlzLl9fZm9yd2FyZEVzdGltYXRlQ291bnQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuX19maWx0ZXJlZFBvcy5hZGRTYW1wbGUodGhpcy5fX3Bvc0VzdGltYXRlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX19maWx0ZXJlZFJpZ2h0LmFkZFNhbXBsZSh0aGlzLl9fcmlnaHRFc3RpbWF0ZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9fZmlsdGVyZWRGb3J3YXJkLmFkZFNhbXBsZSh0aGlzLl9fZm9yd2FyZEVzdGltYXRlKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9fdGFyZ2V0UG9zaXRpb24uY29weUZyb20odGhpcy5fX2ZpbHRlcmVkUG9zKTtcclxuICAgICAgICAgICAgICAgIFF1YXRlcm5pb24uUm90YXRpb25RdWF0ZXJuaW9uRnJvbUF4aXNUb1JlZihcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fZmlsdGVyZWRSaWdodCwgXHJcbiAgICAgICAgICAgICAgICAgICAgVmVjdG9yMy5Dcm9zcyh0aGlzLl9fZmlsdGVyZWRGb3J3YXJkLCB0aGlzLl9fZmlsdGVyZWRSaWdodCksIFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19maWx0ZXJlZEZvcndhcmQsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RhcmdldFJvdGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0cmFja2VkT2JqZWN0LnNldFRyYWNraW5nKFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX190YXJnZXRQb3NpdGlvbiwgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RhcmdldFJvdGF0aW9uLCBcclxuICAgICAgICAgICAgICAgICAgICB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRyYWNrZWRPYmplY3Quc2V0VHJhY2tpbmcoXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3RhcmdldFBvc2l0aW9uLCBcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fdGFyZ2V0Um90YXRpb24sIFxyXG4gICAgICAgICAgICAgICAgICAgIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0Q2FsaWJyYXRpb25Bc3luYyhzY2FsYXIgPSAxKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYWNrZXIuc2V0Q2FsaWJyYXRpb25Bc3luYyhcclxuICAgICAgICAgICAgTWF0aC5yb3VuZChzY2FsYXIgKiB0aGlzLl92aWRlb1RleHR1cmUuZ2V0U2l6ZSgpLndpZHRoKSwgXHJcbiAgICAgICAgICAgIE1hdGgucm91bmQoc2NhbGFyICogdGhpcy5fdmlkZW9UZXh0dXJlLmdldFNpemUoKS5oZWlnaHQpKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZ2V0UXVhdGVybmlvbkZyb21Sb2RyaWd1ZXMoeDogbnVtYmVyLCB5OiBudW1iZXIsIHo6IG51bWJlcikge1xyXG4gICAgICAgIHZhciByb3QgPSBuZXcgVmVjdG9yMygteCwgeSwgLXopO1xyXG4gICAgICAgIHZhciB0aGV0YSA9IHJvdC5sZW5ndGgoKTtcclxuICAgICAgICByb3Quc2NhbGVJblBsYWNlKDEuMCAvIHRoZXRhKTtcclxuICAgICAgICBpZiAodGhldGEgIT09IDAuMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gUXVhdGVybmlvbi5Sb3RhdGlvbkF4aXMocm90LCB0aGV0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHN0YXJ0VHJhY2tpbmcoKSB7XHJcbiAgICAgICAgdmFyIHJ1bm5pbmcgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLl9ydW5UcmFja2luZ09ic2VydmVyID0gdGhpcy5fc2NlbmUub25BZnRlclJlbmRlck9ic2VydmFibGUuYWRkKCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFydW5uaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBydW5uaW5nID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLl90cmFja2VyLmZpbmRNYXJrZXJzSW5JbWFnZUFzeW5jKHRoaXMuX3ZpZGVvVGV4dHVyZSkudGhlbihtYXJrZXJzID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWFya2Vycykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0czogYW55ID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXJzLmZvckVhY2gobWFya2VyID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHNbbWFya2VyLmlkXSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbmV3IFZlY3RvcjMobWFya2VyLnR4LCAtbWFya2VyLnR5LCBtYXJrZXIudHopLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uOiBFeGFtcGxlT2JqZWN0VHJhY2tlci5nZXRRdWF0ZXJuaW9uRnJvbVJvZHJpZ3VlcyhtYXJrZXIucngsIG1hcmtlci5yeSwgbWFya2VyLnJ6KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1Jlc3VsdHMocmVzdWx0cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHN0b3BUcmFja2luZygpIHtcclxuICAgICAgICB0aGlzLl9zY2VuZS5vbkFmdGVyUmVuZGVyT2JzZXJ2YWJsZS5yZW1vdmUodGhpcy5fcnVuVHJhY2tpbmdPYnNlcnZlcik7XHJcbiAgICAgICAgdGhpcy5fcnVuVHJhY2tpbmdPYnNlcnZlciA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGNyZWF0ZUFzeW5jKHZpZGVvVGV4dHVyZTogVmlkZW9UZXh0dXJlLCBzY2VuZTogU2NlbmUpIHtcclxuICAgICAgICB2YXIgb2JqZWN0VHJhY2tlciA9IG5ldyBFeGFtcGxlT2JqZWN0VHJhY2tlcih2aWRlb1RleHR1cmUsIHNjZW5lKTtcclxuICAgICAgICByZXR1cm4gRXhhbXBsZU1hcmtlclRyYWNrZXIuY3JlYXRlQXN5bmMoKS50aGVuKHRyYWNrZXIgPT4ge1xyXG4gICAgICAgICAgICBvYmplY3RUcmFja2VyLl90cmFja2VyID0gdHJhY2tlcjtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdFRyYWNrZXIuc2V0Q2FsaWJyYXRpb25Bc3luYygpO1xyXG4gICAgICAgIH0pLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0VHJhY2tlcjtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufSIsImltcG9ydCB7IERlZGljYXRlZFdvcmtlciB9IGZyb20gXCIuLi9zaGFyZWQvZGVkaWNhdGVkV29ya2VyXCJcclxuXHJcbmRlY2xhcmUgZnVuY3Rpb24gcG9zdE1lc3NhZ2UoZGF0YTogYW55KTogdm9pZDtcclxuXHJcbmV4cG9ydCBjbGFzcyBFeGFtcGxlV29ya2VyIHtcclxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IE1PRFVMRV9VUkw6IHN0cmluZyA9IFwiaHR0cHM6Ly9zeW50aGV0aWNtYWd1cy5naXRodWIuaW8vcHJvdG90eXBpbmcvYmFieWxvbmFyL3dhc20vd2VicGlsZWQtYXJ1Y28tYXIuanNcIjtcclxuXHJcbiAgICBwcml2YXRlIF93b3JrZXI6IFdvcmtlcjtcclxuXHJcbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKCkge31cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBvbkluaXRpYWxpemVkKCk6IHZvaWQge1xyXG4gICAgICAgIHBvc3RNZXNzYWdlKHtcclxuICAgICAgICAgICAgbWVzc2FnZTogXCJHb3QgYSBtb2R1bGUhXCJcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBvbk1lc3NhZ2UoZXZlbnQ6IE1lc3NhZ2VFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIGxldCBkYXRhID0gZXZlbnQuZGF0YTtcclxuICAgICAgICBkYXRhLndlbnRUb1dvcmtlciA9IHRydWU7XHJcbiAgICAgICAgcG9zdE1lc3NhZ2UoZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVBc3luYygpOiBQcm9taXNlPEV4YW1wbGVXb3JrZXI+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8RXhhbXBsZVdvcmtlcj4oKHJlc29sdmU6ICh3b3JrZXI6IEV4YW1wbGVXb3JrZXIpID0+IHZvaWQpID0+IHtcclxuICAgICAgICAgICAgbGV0IGV4YW1wbGVXb3JrZXIgPSBuZXcgRXhhbXBsZVdvcmtlcigpO1xyXG4gICAgICAgICAgICBleGFtcGxlV29ya2VyLl93b3JrZXIgPSBEZWRpY2F0ZWRXb3JrZXIuY3JlYXRlRnJvbUxvY2F0aW9uKFxyXG4gICAgICAgICAgICAgICAgRXhhbXBsZVdvcmtlci5NT0RVTEVfVVJMLFxyXG4gICAgICAgICAgICAgICAgRXhhbXBsZVdvcmtlci5vbkluaXRpYWxpemVkLFxyXG4gICAgICAgICAgICAgICAgRXhhbXBsZVdvcmtlci5vbk1lc3NhZ2UpO1xyXG4gICAgICAgICAgICBleGFtcGxlV29ya2VyLl93b3JrZXIub25tZXNzYWdlID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGV4YW1wbGVXb3JrZXIuX3dvcmtlci5vbm1lc3NhZ2UgPSBEZWRpY2F0ZWRXb3JrZXIudW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShleGFtcGxlV29ya2VyKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2VuZE1lc3NhZ2VBc3luYyhkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgICAgIGxldCBwcm9taXNlID0gbmV3IFByb21pc2U8YW55PigocmVzb2x2ZTogKHZhbHVlOiBhbnkpID0+IHZvaWQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKGV2ZW50LmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IERlZGljYXRlZFdvcmtlci51bmV4cGVjdGVkTWVzc2FnZUhhbmRsZXI7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuX3dvcmtlci5wb3N0TWVzc2FnZShkYXRhKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XHJcbiAgICB9XHJcbn0iLCJleHBvcnQgY2xhc3MgRGVkaWNhdGVkV29ya2VyIHtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBjcmVhdGVGcm9tU291cmNlcyguLi5zb3VyY2VzOiBhbnlbXSk6IFdvcmtlciB7XHJcbiAgICAgICAgbGV0IHdvcmtlckNvZGU6IHN0cmluZyA9IFwiXCI7XHJcbiAgICAgICAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgc291cmNlcy5sZW5ndGggLSAxOyBpZHgrKykge1xyXG4gICAgICAgICAgICB3b3JrZXJDb2RlICs9IHNvdXJjZXNbaWR4XS50b1N0cmluZygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB3b3JrZXJDb2RlICs9IFwiKFwiICsgc291cmNlc1tzb3VyY2VzLmxlbmd0aCAtIDFdLnRvU3RyaW5nKCkgKyBcIikoKTtcIjtcclxuICAgICAgICByZXR1cm4gbmV3IFdvcmtlcih3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbd29ya2VyQ29kZV0pKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVGcm9tTG9jYXRpb24oanNVcmw6IHN0cmluZywgb25Jbml0aWFsaXplZDogKCkgPT4gdm9pZCwgb25NZXNzYWdlOiAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4gdm9pZCk6IFdvcmtlciB7XHJcbiAgICAgICAgbGV0IG1vZHVsZURlZml0aW9uOiBzdHJpbmcgPSBgTW9kdWxlID0ge1xyXG4gICAgICAgICAgICBsb2NhdGVGaWxlOiBmdW5jdGlvbiAocGF0aCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFxcXCJgICsganNVcmwucmVwbGFjZSgvLmpzJC8sIFwiLndhc21cIikgKyBgXFxcIjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb25SdW50aW1lSW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIChgICsgb25Jbml0aWFsaXplZC50b1N0cmluZygpICsgYCkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07YDtcclxuICAgICAgICBsZXQgbWVzc2FnZUhhbmRsZXI6IHN0cmluZyA9IFwidGhpcy5vbm1lc3NhZ2UgPSBcIiArIG9uTWVzc2FnZS50b1N0cmluZygpICsgXCI7XCI7XHJcbiAgICAgICAgbGV0IGltcG9ydEphdmFzY3JpcHQ6IHN0cmluZyA9IFwiZnVuY3Rpb24gaW1wb3J0SmF2YXNjcmlwdCgpIHsgaW1wb3J0U2NyaXB0cyhcXFwiXCIgKyBqc1VybCArIFwiXFxcIik7IH1cIjtcclxuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVGcm9tU291cmNlcyhtb2R1bGVEZWZpdGlvbiwgbWVzc2FnZUhhbmRsZXIsIGltcG9ydEphdmFzY3JpcHQpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgdW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyKGV2ZW50OiBNZXNzYWdlRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICB0aHJvdyBFcnJvcihcIlVuZXhwZWN0ZWQgbWVzc2FnZSBmcm9tIFdlYldvcmtlcjogXCIgKyBldmVudCk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBWZWN0b3IzIH0gZnJvbSBcImJhYnlsb25qc1wiXHJcblxyXG5leHBvcnQgY2xhc3MgRmlsdGVyZWRWZWN0b3IzIGV4dGVuZHMgVmVjdG9yMyB7XHJcbiAgICBwcml2YXRlIF9pZHg6IG51bWJlcjtcclxuICAgIHByaXZhdGUgX3NhbXBsZXM6IFZlY3RvcjNbXTtcclxuICAgIHByaXZhdGUgX3NhbXBsZVNxdWFyZWREaXN0YW5jZXM6IG51bWJlcltdO1xyXG4gICAgcHJpdmF0ZSBfc2FtcGxlQXZlcmFnZTogVmVjdG9yMztcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3IoeDogbnVtYmVyLCB5OiBudW1iZXIsIHo6IG51bWJlciwgc2FtcGxlQ291bnQ6IG51bWJlciA9IDEpIHtcclxuICAgICAgICBzdXBlcih4LCB5LCB6KTtcclxuXHJcbiAgICAgICAgdGhpcy5faWR4ID0gMDtcclxuICAgICAgICB0aGlzLl9zYW1wbGVzID0gW107XHJcbiAgICAgICAgdGhpcy5fc2FtcGxlU3F1YXJlZERpc3RhbmNlcyA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IHNhbXBsZUNvdW50OyArK2lkeCkge1xyXG4gICAgICAgICAgICB0aGlzLl9zYW1wbGVzLnB1c2gobmV3IFZlY3RvcjMoeCwgeSwgeikpO1xyXG4gICAgICAgICAgICB0aGlzLl9zYW1wbGVTcXVhcmVkRGlzdGFuY2VzLnB1c2goMC4wKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX3NhbXBsZUF2ZXJhZ2UgPSBuZXcgVmVjdG9yMyh4LCB5LCB6KTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYWRkU2FtcGxlKHNhbXBsZTogVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuX3NhbXBsZUF2ZXJhZ2Uuc2NhbGVJblBsYWNlKHRoaXMuX3NhbXBsZXMubGVuZ3RoKTtcclxuICAgICAgICB0aGlzLl9zYW1wbGVBdmVyYWdlLnN1YnRyYWN0SW5QbGFjZSh0aGlzLl9zYW1wbGVzW3RoaXMuX2lkeF0pO1xyXG4gICAgICAgIHRoaXMuX3NhbXBsZXNbdGhpcy5faWR4XS5jb3B5RnJvbShzYW1wbGUpO1xyXG4gICAgICAgIHRoaXMuX3NhbXBsZUF2ZXJhZ2UuYWRkSW5QbGFjZSh0aGlzLl9zYW1wbGVzW3RoaXMuX2lkeF0pO1xyXG4gICAgICAgIHRoaXMuX3NhbXBsZUF2ZXJhZ2Uuc2NhbGVJblBsYWNlKDEuMCAvIHRoaXMuX3NhbXBsZXMubGVuZ3RoKTtcclxuICAgICAgICB0aGlzLl9pZHggPSAodGhpcy5faWR4ICsgMSkgJSB0aGlzLl9zYW1wbGVzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgbGV0IGF2Z1NxdWFyZWREaXN0YW5jZSA9IDAuMDtcclxuICAgICAgICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLl9zYW1wbGVzLmxlbmd0aDsgKytpZHgpIHtcclxuICAgICAgICAgICAgdGhpcy5fc2FtcGxlU3F1YXJlZERpc3RhbmNlc1tpZHhdID0gVmVjdG9yMy5EaXN0YW5jZVNxdWFyZWQodGhpcy5fc2FtcGxlQXZlcmFnZSwgdGhpcy5fc2FtcGxlc1tpZHhdKTtcclxuICAgICAgICAgICAgYXZnU3F1YXJlZERpc3RhbmNlICs9IHRoaXMuX3NhbXBsZVNxdWFyZWREaXN0YW5jZXNbaWR4XTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXZnU3F1YXJlZERpc3RhbmNlIC89IHRoaXMuX3NhbXBsZXMubGVuZ3RoO1xyXG5cclxuICAgICAgICBsZXQgbnVtSW5jbHVkZWRTYW1wbGVzID0gMDtcclxuICAgICAgICB0aGlzLnNldCgwLjAsIDAuMCwgMC4wKTtcclxuICAgICAgICBmb3IgKGxldCBpZHggPSAwOyBpZHggPD0gdGhpcy5fc2FtcGxlcy5sZW5ndGg7ICsraWR4KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9zYW1wbGVTcXVhcmVkRGlzdGFuY2VzW2lkeF0gPD0gYXZnU3F1YXJlZERpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEluUGxhY2UodGhpcy5fc2FtcGxlc1tpZHhdKTtcclxuICAgICAgICAgICAgICAgIG51bUluY2x1ZGVkU2FtcGxlcyArPSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2NhbGVJblBsYWNlKDEuMCAvIG51bUluY2x1ZGVkU2FtcGxlcyk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBPYnNlcnZhYmxlLCBRdWF0ZXJuaW9uLCBTY2VuZSwgVHJhbnNmb3JtTm9kZSwgVmVjdG9yMyB9IGZyb20gXCJiYWJ5bG9uanNcIlxyXG5cclxuZXhwb3J0IGNsYXNzIFRyYWNrZWROb2RlIGV4dGVuZHMgVHJhbnNmb3JtTm9kZSB7XHJcbiAgICBwcml2YXRlIF9pc1RyYWNraW5nOiBib29sZWFuO1xyXG4gICAgcHJpdmF0ZSBfbm90VHJhY2tlZEZyYW1lc0NvdW50OiBudW1iZXI7IC8vIFRPRE86IFJlbW92ZSB0aGlzIGZlYXR1cmUsIHdoaWNoIG9ubHkgZXhpc3RzIGFzIGEgc3RvcGdhcC5cclxuXHJcbiAgICBwdWJsaWMgb25UcmFja2luZ0FjcXVpcmVkT2JzZXJ2YWJsZTogT2JzZXJ2YWJsZTxUcmFja2VkTm9kZT47XHJcbiAgICBwdWJsaWMgb25UcmFja2luZ0xvc3RPYnNlcnZhYmxlOiBPYnNlcnZhYmxlPFRyYWNrZWROb2RlPjtcclxuICAgIHB1YmxpYyBkaXNhYmxlV2hlbk5vdFRyYWNrZWQ6IGJvb2xlYW47XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgc2NlbmU/OiBTY2VuZSB8IG51bGwgfCB1bmRlZmluZWQsIGRpc2FibGVXaGVuTm90VHJhY2tlZDogYm9vbGVhbiA9IHRydWUpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBzY2VuZSwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIHRoaXMuX2lzVHJhY2tpbmcgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmRpc2FibGVXaGVuTm90VHJhY2tlZCA9IGRpc2FibGVXaGVuTm90VHJhY2tlZDtcclxuICAgICAgICBpZiAodGhpcy5kaXNhYmxlV2hlbk5vdFRyYWNrZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRFbmFibGVkKGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX25vdFRyYWNrZWRGcmFtZXNDb3VudCA9IDEwO1xyXG5cclxuICAgICAgICB0aGlzLm9uVHJhY2tpbmdBY3F1aXJlZE9ic2VydmFibGUgPSBuZXcgT2JzZXJ2YWJsZShvYnNlcnZlciA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc1RyYWNraW5nKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uVHJhY2tpbmdBY3F1aXJlZE9ic2VydmFibGUubm90aWZ5T2JzZXJ2ZXIob2JzZXJ2ZXIsIHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5vblRyYWNraW5nTG9zdE9ic2VydmFibGUgPSBuZXcgT2JzZXJ2YWJsZSgpO1xyXG5cclxuICAgICAgICB0aGlzLnJvdGF0aW9uUXVhdGVybmlvbiA9IFF1YXRlcm5pb24uSWRlbnRpdHkoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaXNUcmFja2luZygpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5faXNUcmFja2luZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0VHJhY2tpbmcocG9zaXRpb246IFZlY3RvcjMsIHJvdGF0aW9uOiBRdWF0ZXJuaW9uLCBpc1RyYWNraW5nOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbi5jb3B5RnJvbShwb3NpdGlvbik7XHJcbiAgICAgICAgdGhpcy5yb3RhdGlvblF1YXRlcm5pb24gPyB0aGlzLnJvdGF0aW9uUXVhdGVybmlvbi5jb3B5RnJvbShyb3RhdGlvbikgOiB0aGlzLnJvdGF0aW9uUXVhdGVybmlvbiA9IHJvdGF0aW9uLmNsb25lKCk7XHJcblxyXG4gICAgICAgIC8vIFRPRE86IFJlbW92ZSB0aGlzIGZlYXR1cmUsIHdoaWNoIG9ubHkgZXhpc3RzIGFzIGEgc3RvcGdhcC5cclxuICAgICAgICBpZiAoaXNUcmFja2luZykge1xyXG4gICAgICAgICAgICB0aGlzLl9ub3RUcmFja2VkRnJhbWVzQ291bnQgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5fbm90VHJhY2tlZEZyYW1lc0NvdW50ICs9IDE7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9ub3RUcmFja2VkRnJhbWVzQ291bnQgPCA1KSB7XHJcbiAgICAgICAgICAgICAgICBpc1RyYWNraW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLl9pc1RyYWNraW5nICYmIGlzVHJhY2tpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy5vblRyYWNraW5nQWNxdWlyZWRPYnNlcnZhYmxlLm5vdGlmeU9ic2VydmVycyh0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodGhpcy5faXNUcmFja2luZyAmJiAhaXNUcmFja2luZykge1xyXG4gICAgICAgICAgICB0aGlzLm9uVHJhY2tpbmdMb3N0T2JzZXJ2YWJsZS5ub3RpZnlPYnNlcnZlcnModGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX2lzVHJhY2tpbmcgPSBpc1RyYWNraW5nO1xyXG4gICAgICAgIHRoaXMuc2V0RW5hYmxlZCghdGhpcy5kaXNhYmxlV2hlbk5vdFRyYWNrZWQgfHwgdGhpcy5faXNUcmFja2luZyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbiJdfQ==

window.define = externalDefine;window.require = externalRequire;
