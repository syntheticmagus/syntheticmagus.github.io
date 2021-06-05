(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Microsoft = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MageSlam = void 0;
var babylonjs_1 = (typeof window !== "undefined" ? window['BABYLON'] : typeof global !== "undefined" ? global['BABYLON'] : null);
var dedicatedWorker_1 = require("../shared/dedicatedWorker");
var WASM_URL = "https://syntheticmagus.github.io/prototyping/mageslam/wasm/mageslam.js";
var MageSlam = /** @class */ (function () {
    function MageSlam(videoTexture) {
        this._videoTexture = videoTexture;
        this.onTrackingUpdatedObservable = new babylonjs_1.Observable();
    }
    MageSlam.onInitialized = function () {
        postMessage({ initialized: true });
    };
    MageSlam.onMessage = function (event) {
        var args = event.data;
        if (args.initialize) {
            Module._mageslam_initialize();
            postMessage({
                initialized: true
            });
        }
        else if (args.uninitialize) {
            Module._mageslam_uninitialize();
            postMessage({ uninitialized: true });
        }
        else if (args.track) {
            // Initialize the image data buffer.
            var buf = Module._malloc(args.imageData.length * args.imageData.BYTES_PER_ELEMENT);
            Module.HEAP8.set(args.imageData, buf);
            // Register the callback handler.
            var tracked_1 = false;
            Module._mageslam_frame_processed_callback = function (isPoseGood, isPoseSkipped, trackingState, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
                tracked_1 = isPoseGood;
            };
            // Process the image.
            Module._mageslam_process_frame(args.width, args.height, buf);
            // Clean up.
            Module._mageslam_frame_processed_callback = function () { };
            Module._free(buf);
            // Post results back to the main thread.
            postMessage({
                tracked: tracked_1
            });
        }
    };
    MageSlam.CreateAsync = function (videoTexture) {
        return new Promise(function (resolve) {
            var tracker = new MageSlam(videoTexture);
            tracker._worker = dedicatedWorker_1.DedicatedWorker.createFromLocation(WASM_URL, MageSlam.onInitialized, MageSlam.onMessage);
            tracker._worker.onmessage = function (event) {
                tracker._worker.onmessage = dedicatedWorker_1.DedicatedWorker.unexpectedMessageHandler;
                resolve(tracker);
            };
        });
    };
    MageSlam.prototype.startTracking = function () {
        var _this = this;
        this._tracking = true;
        this._trackingLoop = new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this._worker.onmessage = function () {
                    var loopFunction = function (data) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, _b, _c;
                        var _this = this;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    if (data.tracked) {
                                        // TODO: Pass along the correct data.
                                        this.onTrackingUpdatedObservable.notifyObservers(true);
                                    }
                                    else {
                                        this.onTrackingUpdatedObservable.notifyObservers(false);
                                    }
                                    if (!this._tracking) return [3 /*break*/, 2];
                                    _b = (_a = this._worker).postMessage;
                                    _c = {
                                        track: true,
                                        width: this._videoTexture.getSize().width,
                                        height: this._videoTexture.getSize().height
                                    };
                                    return [4 /*yield*/, this._videoTexture.readPixels()];
                                case 1:
                                    _b.apply(_a, [(_c.imageData = _d.sent(),
                                            _c)]);
                                    return [3 /*break*/, 3];
                                case 2:
                                    this._worker.onmessage = function () {
                                        _this._worker.onmessage = dedicatedWorker_1.DedicatedWorker.unexpectedMessageHandler;
                                        resolve();
                                    };
                                    this._worker.postMessage({
                                        uninitialize: true
                                    });
                                    _d.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); };
                    _this._worker.onmessage = function (result) {
                        loopFunction(result.data);
                    };
                    loopFunction({ tracked: false });
                };
                this._worker.postMessage({
                    initialize: true,
                    width: this._videoTexture.getSize().width,
                    height: this._videoTexture.getSize().height
                });
                return [2 /*return*/];
            });
        }); });
    };
    MageSlam.prototype.stopTrackingAsync = function () {
        this._tracking = false;
        return this._trackingLoop;
    };
    return MageSlam;
}());
exports.MageSlam = MageSlam;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../shared/dedicatedWorker":2}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DedicatedWorker = void 0;
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
},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvdHMvbWFnZXNsYW0vbWFnZXNsYW0udHMiLCJzcmMvdHMvc2hhcmVkL2RlZGljYXRlZFdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNBQSx1Q0FBb0Q7QUFFcEQsNkRBQTJEO0FBRTNELElBQU0sUUFBUSxHQUFHLHdFQUF3RSxDQUFDO0FBSzFGO0lBU0ksa0JBQW9CLFlBQTBCO1FBQzFDLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDO1FBQ2xDLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLHNCQUFVLEVBQVcsQ0FBQztJQUNqRSxDQUFDO0lBRWMsc0JBQWEsR0FBNUI7UUFDSSxXQUFXLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRWMsa0JBQVMsR0FBeEIsVUFBeUIsS0FBbUI7UUFDeEMsSUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUV4QixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDakIsTUFBTSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDOUIsV0FBVyxDQUFDO2dCQUNSLFdBQVcsRUFBRSxJQUFJO2FBQ3BCLENBQUMsQ0FBQztTQUNOO2FBQ0ksSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2hDLFdBQVcsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ3hDO2FBQ0ksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2pCLG9DQUFvQztZQUNwQyxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMs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KCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImltcG9ydCB7IE9ic2VydmFibGUsIFZpZGVvVGV4dHVyZSB9IGZyb20gXCJiYWJ5bG9uanNcIlxyXG5cclxuaW1wb3J0IHsgRGVkaWNhdGVkV29ya2VyIH0gZnJvbSBcIi4uL3NoYXJlZC9kZWRpY2F0ZWRXb3JrZXJcIlxyXG5cclxuY29uc3QgV0FTTV9VUkwgPSBcImh0dHBzOi8vc3ludGhldGljbWFndXMuZ2l0aHViLmlvL3Byb3RvdHlwaW5nL21hZ2VzbGFtL3dhc20vbWFnZXNsYW0uanNcIjtcclxuXHJcbmRlY2xhcmUgdmFyIE1vZHVsZTogYW55O1xyXG5kZWNsYXJlIGZ1bmN0aW9uIHBvc3RNZXNzYWdlKGRhdGE6IGFueSk6IHZvaWQ7XHJcblxyXG5leHBvcnQgY2xhc3MgTWFnZVNsYW0ge1xyXG4gICAgcHJpdmF0ZSBfd29ya2VyOiBXb3JrZXI7XHJcblxyXG4gICAgcHJpdmF0ZSBfdHJhY2tpbmc6IGJvb2xlYW47XHJcbiAgICBwcml2YXRlIF90cmFja2luZ0xvb3A6IFByb21pc2U8dm9pZD47XHJcbiAgICBwcml2YXRlIF92aWRlb1RleHR1cmU6IFZpZGVvVGV4dHVyZTtcclxuXHJcbiAgICBwdWJsaWMgb25UcmFja2luZ1VwZGF0ZWRPYnNlcnZhYmxlOiBPYnNlcnZhYmxlPGJvb2xlYW4+O1xyXG5cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IodmlkZW9UZXh0dXJlOiBWaWRlb1RleHR1cmUpIHtcclxuICAgICAgICB0aGlzLl92aWRlb1RleHR1cmUgPSB2aWRlb1RleHR1cmU7XHJcbiAgICAgICAgdGhpcy5vblRyYWNraW5nVXBkYXRlZE9ic2VydmFibGUgPSBuZXcgT2JzZXJ2YWJsZTxib29sZWFuPigpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIG9uSW5pdGlhbGl6ZWQoKSB7XHJcbiAgICAgICAgcG9zdE1lc3NhZ2UoeyBpbml0aWFsaXplZDogdHJ1ZSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBvbk1lc3NhZ2UoZXZlbnQ6IE1lc3NhZ2VFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGFyZ3MgPSBldmVudC5kYXRhO1xyXG5cclxuICAgICAgICBpZiAoYXJncy5pbml0aWFsaXplKSB7XHJcbiAgICAgICAgICAgIE1vZHVsZS5fbWFnZXNsYW1faW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgICAgICBwb3N0TWVzc2FnZSh7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplZDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoYXJncy51bmluaXRpYWxpemUpIHtcclxuICAgICAgICAgICAgTW9kdWxlLl9tYWdlc2xhbV91bmluaXRpYWxpemUoKTtcclxuICAgICAgICAgICAgcG9zdE1lc3NhZ2UoeyB1bmluaXRpYWxpemVkOiB0cnVlIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChhcmdzLnRyYWNrKSB7XHJcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGltYWdlIGRhdGEgYnVmZmVyLlxyXG4gICAgICAgICAgICBsZXQgYnVmID0gTW9kdWxlLl9tYWxsb2MoYXJncy5pbWFnZURhdGEubGVuZ3RoICogYXJncy5pbWFnZURhdGEuQllURVNfUEVSX0VMRU1FTlQpO1xyXG4gICAgICAgICAgICBNb2R1bGUuSEVBUDguc2V0KGFyZ3MuaW1hZ2VEYXRhLCBidWYpO1xyXG5cclxuICAgICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIGNhbGxiYWNrIGhhbmRsZXIuXHJcbiAgICAgICAgICAgIGxldCB0cmFja2VkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgICAgIE1vZHVsZS5fbWFnZXNsYW1fZnJhbWVfcHJvY2Vzc2VkX2NhbGxiYWNrID0gKFxyXG4gICAgICAgICAgICAgICAgaXNQb3NlR29vZDogYm9vbGVhbiwgXHJcbiAgICAgICAgICAgICAgICBpc1Bvc2VTa2lwcGVkOiBib29sZWFuLFxyXG4gICAgICAgICAgICAgICAgdHJhY2tpbmdTdGF0ZTogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgbTAwOiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICBtMDE6IG51bWJlcixcclxuICAgICAgICAgICAgICAgIG0wMjogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgbTAzOiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICBtMTA6IG51bWJlcixcclxuICAgICAgICAgICAgICAgIG0xMTogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgbTEyOiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICBtMTM6IG51bWJlcixcclxuICAgICAgICAgICAgICAgIG0yMDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgbTIxOiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICBtMjI6IG51bWJlcixcclxuICAgICAgICAgICAgICAgIG0yMzogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgbTMwOiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICBtMzE6IG51bWJlcixcclxuICAgICAgICAgICAgICAgIG0zMjogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgbTMzOiBudW1iZXIpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICB0cmFja2VkID0gaXNQb3NlR29vZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gUHJvY2VzcyB0aGUgaW1hZ2UuXHJcbiAgICAgICAgICAgIE1vZHVsZS5fbWFnZXNsYW1fcHJvY2Vzc19mcmFtZShhcmdzLndpZHRoLCBhcmdzLmhlaWdodCwgYnVmKTtcclxuXHJcbiAgICAgICAgICAgIC8vIENsZWFuIHVwLlxyXG4gICAgICAgICAgICBNb2R1bGUuX21hZ2VzbGFtX2ZyYW1lX3Byb2Nlc3NlZF9jYWxsYmFjayA9ICgpID0+IHt9O1xyXG4gICAgICAgICAgICBNb2R1bGUuX2ZyZWUoYnVmKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFBvc3QgcmVzdWx0cyBiYWNrIHRvIHRoZSBtYWluIHRocmVhZC5cclxuICAgICAgICAgICAgcG9zdE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICAgICAgdHJhY2tlZDogdHJhY2tlZFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBDcmVhdGVBc3luYyh2aWRlb1RleHR1cmU6IFZpZGVvVGV4dHVyZSk6IFByb21pc2U8TWFnZVNsYW0+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8TWFnZVNsYW0+KChyZXNvbHZlOiAodHJhY2tlcjogTWFnZVNsYW0pID0+IHZvaWQpID0+IHtcclxuICAgICAgICAgICAgbGV0IHRyYWNrZXIgPSBuZXcgTWFnZVNsYW0odmlkZW9UZXh0dXJlKTtcclxuICAgICAgICAgICAgdHJhY2tlci5fd29ya2VyID0gRGVkaWNhdGVkV29ya2VyLmNyZWF0ZUZyb21Mb2NhdGlvbihcclxuICAgICAgICAgICAgICAgIFdBU01fVVJMLFxyXG4gICAgICAgICAgICAgICAgTWFnZVNsYW0ub25Jbml0aWFsaXplZCxcclxuICAgICAgICAgICAgICAgIE1hZ2VTbGFtLm9uTWVzc2FnZSk7XHJcbiAgICAgICAgICAgIHRyYWNrZXIuX3dvcmtlci5vbm1lc3NhZ2UgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJhY2tlci5fd29ya2VyLm9ubWVzc2FnZSA9IERlZGljYXRlZFdvcmtlci51bmV4cGVjdGVkTWVzc2FnZUhhbmRsZXI7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRyYWNrZXIpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzdGFydFRyYWNraW5nKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuX3RyYWNraW5nID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLl90cmFja2luZ0xvb3AgPSBuZXcgUHJvbWlzZTx2b2lkPihhc3luYyAocmVzb2x2ZTogKCkgPT4gdm9pZCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLl93b3JrZXIub25tZXNzYWdlID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdmFyIGxvb3BGdW5jdGlvbiA9IGFzeW5jIChkYXRhOiB7IHRyYWNrZWQ6IGJvb2xlYW4gfSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnRyYWNrZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogUGFzcyBhbG9uZyB0aGUgY29ycmVjdCBkYXRhLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uVHJhY2tpbmdVcGRhdGVkT2JzZXJ2YWJsZS5ub3RpZnlPYnNlcnZlcnModHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vblRyYWNraW5nVXBkYXRlZE9ic2VydmFibGUubm90aWZ5T2JzZXJ2ZXJzKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl90cmFja2luZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl93b3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2s6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGhpcy5fdmlkZW9UZXh0dXJlLmdldFNpemUoKS53aWR0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdGhpcy5fdmlkZW9UZXh0dXJlLmdldFNpemUoKS5oZWlnaHQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWFnZURhdGE6IGF3YWl0IHRoaXMuX3ZpZGVvVGV4dHVyZS5yZWFkUGl4ZWxzKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3dvcmtlci5vbm1lc3NhZ2UgPSBEZWRpY2F0ZWRXb3JrZXIudW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl93b3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5pbml0aWFsaXplOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsb29wRnVuY3Rpb24ocmVzdWx0LmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGxvb3BGdW5jdGlvbih7IHRyYWNrZWQ6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fd29ya2VyLnBvc3RNZXNzYWdlKHtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxpemU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogdGhpcy5fdmlkZW9UZXh0dXJlLmdldFNpemUoKS53aWR0aCxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogdGhpcy5fdmlkZW9UZXh0dXJlLmdldFNpemUoKS5oZWlnaHRcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0b3BUcmFja2luZ0FzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHRoaXMuX3RyYWNraW5nID0gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYWNraW5nTG9vcDtcclxuICAgIH1cclxufVxyXG4iLCJleHBvcnQgY2xhc3MgRGVkaWNhdGVkV29ya2VyIHtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBjcmVhdGVGcm9tU291cmNlcyguLi5zb3VyY2VzOiBhbnlbXSk6IFdvcmtlciB7XHJcbiAgICAgICAgbGV0IHdvcmtlckNvZGU6IHN0cmluZyA9IFwiXCI7XHJcbiAgICAgICAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgc291cmNlcy5sZW5ndGggLSAxOyBpZHgrKykge1xyXG4gICAgICAgICAgICB3b3JrZXJDb2RlICs9IHNvdXJjZXNbaWR4XS50b1N0cmluZygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB3b3JrZXJDb2RlICs9IFwiKFwiICsgc291cmNlc1tzb3VyY2VzLmxlbmd0aCAtIDFdLnRvU3RyaW5nKCkgKyBcIikoKTtcIjtcclxuICAgICAgICByZXR1cm4gbmV3IFdvcmtlcih3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbd29ya2VyQ29kZV0pKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVGcm9tTG9jYXRpb24oanNVcmw6IHN0cmluZywgb25Jbml0aWFsaXplZDogKCkgPT4gdm9pZCwgb25NZXNzYWdlOiAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4gdm9pZCk6IFdvcmtlciB7XHJcbiAgICAgICAgbGV0IG1vZHVsZURlZml0aW9uOiBzdHJpbmcgPSBgTW9kdWxlID0ge1xyXG4gICAgICAgICAgICBsb2NhdGVGaWxlOiBmdW5jdGlvbiAocGF0aCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFxcXCJgICsganNVcmwucmVwbGFjZSgvLmpzJC8sIFwiLndhc21cIikgKyBgXFxcIjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb25SdW50aW1lSW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIChgICsgb25Jbml0aWFsaXplZC50b1N0cmluZygpICsgYCkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07YDtcclxuICAgICAgICBsZXQgbWVzc2FnZUhhbmRsZXI6IHN0cmluZyA9IFwidGhpcy5vbm1lc3NhZ2UgPSBcIiArIG9uTWVzc2FnZS50b1N0cmluZygpICsgXCI7XCI7XHJcbiAgICAgICAgbGV0IGltcG9ydEphdmFzY3JpcHQ6IHN0cmluZyA9IFwiZnVuY3Rpb24gaW1wb3J0SmF2YXNjcmlwdCgpIHsgaW1wb3J0U2NyaXB0cyhcXFwiXCIgKyBqc1VybCArIFwiXFxcIik7IH1cIjtcclxuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVGcm9tU291cmNlcyhtb2R1bGVEZWZpdGlvbiwgbWVzc2FnZUhhbmRsZXIsIGltcG9ydEphdmFzY3JpcHQpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgdW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyKGV2ZW50OiBNZXNzYWdlRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICB0aHJvdyBFcnJvcihcIlVuZXhwZWN0ZWQgbWVzc2FnZSBmcm9tIFdlYldvcmtlcjogXCIgKyBldmVudCk7XHJcbiAgICB9XHJcbn0iXX0=
