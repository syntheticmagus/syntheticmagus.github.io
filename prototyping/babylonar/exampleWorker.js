(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.BabylonAR = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
// declare var Module: any;
// declare function postMessage(data: any): void;
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
},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dedicatedWorker_1 = require("./dedicatedWorker");
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
            exampleWorker._worker = dedicatedWorker_1.DedicatedWorker.createFromLocation("https://syntheticmagus.github.io/webpiled-aruco-ar/v0.02/webpiled-aruco-ar/webpiled-aruco-ar.js", ExampleWorker.onInitialized, ExampleWorker.onMessage);
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
    return ExampleWorker;
}());
exports.ExampleWorker = ExampleWorker;
},{"./dedicatedWorker":1}]},{},[2])(2)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZGVkaWNhdGVkV29ya2VyLnRzIiwic3JjL2V4YW1wbGVXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUEsMkJBQTJCO0FBQzNCLGlEQUFpRDs7QUFFakQ7SUFBQTtJQTRCQSxDQUFDO0lBMUJrQixpQ0FBaUIsR0FBaEM7UUFBaUMsaUJBQWlCO2FBQWpCLFVBQWlCLEVBQWpCLHFCQUFpQixFQUFqQixJQUFpQjtZQUFqQiw0QkFBaUI7O1FBQzlDLElBQUksVUFBVSxHQUFXLEVBQUUsQ0FBQztRQUM1QixLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDL0MsVUFBVSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUN6QztRQUNELFVBQVUsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFDO1FBQ3BFLE9BQU8sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRWEsa0NBQWtCLEdBQWhDLFVBQWlDLEtBQWEsRUFBRSxhQUF5QixFQUFFLFNBQXdDO1FBQy9HLElBQUksY0FBYyxHQUFXLGtGQUVYLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcseUZBRzVDLEdBQUcsYUFBYSxDQUFDLFFBQVEsRUFBRSxHQUFHLGlDQUVyQyxDQUFDO1FBQ0osSUFBSSxjQUFjLEdBQVcsbUJBQW1CLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxHQUFHLEdBQUcsQ0FBQztRQUM5RSxJQUFJLGdCQUFnQixHQUFXLGdEQUFnRCxHQUFHLEtBQUssR0FBRyxRQUFRLENBQUM7UUFDbkcsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFYSx3Q0FBd0IsR0FBdEMsVUFBdUMsS0FBbUI7UUFDdEQsTUFBTSxLQUFLLENBQUMscUNBQXFDLEdBQUcsS0FBSyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUNMLHNCQUFDO0FBQUQsQ0E1QkEsQUE0QkMsSUFBQTtBQTVCWSwwQ0FBZTs7OztBQ0g1QixxREFBbUQ7QUFJbkQ7SUFHSTtJQUF1QixDQUFDO0lBRVQsMkJBQWEsR0FBNUI7UUFDSSxXQUFXLENBQUM7WUFDUixPQUFPLEVBQUUsZUFBZTtTQUMzQixDQUFDLENBQUM7SUFDUCxDQUFDO0lBRWMsdUJBQVMsR0FBeEIsVUFBeUIsS0FBbUI7UUFDeEMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUN0QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUN6QixXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUVhLHlCQUFXLEdBQXpCO1FBQ0ksT0FBTyxJQUFJLE9BQU8sQ0FBZ0IsVUFBQyxPQUF3QztZQUN2RSxJQUFJLGFBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ3hDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsaUNBQWUsQ0FBQyxrQkFBa0IsQ0FDdEQsaUdBQWlHLEVBQ2pHLGFBQWEsQ0FBQyxhQUFhLEVBQzNCLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM3QixhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxVQUFDLEtBQW1CO2dCQUNsRCxhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxpQ0FBZSxDQUFDLHdCQUF3QixDQUFDO2dCQUMzRSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU0sd0NBQWdCLEdBQXZCLFVBQXdCLElBQVM7UUFBakMsaUJBV0M7UUFWRyxJQUFJLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBTSxVQUFDLE9BQTZCO1lBQ3pELEtBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLFVBQUMsS0FBbUI7Z0JBQ3pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3BCLEtBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLGlDQUFlLENBQUMsd0JBQXdCLENBQUM7WUFDdEUsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUvQixPQUFPLE9BQU8sQ0FBQztJQUNuQixDQUFDO0lBQ0wsb0JBQUM7QUFBRCxDQTNDQSxBQTJDQyxJQUFBO0FBM0NZLHNDQUFhIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gZGVjbGFyZSB2YXIgTW9kdWxlOiBhbnk7XG4vLyBkZWNsYXJlIGZ1bmN0aW9uIHBvc3RNZXNzYWdlKGRhdGE6IGFueSk6IHZvaWQ7XG5cbmV4cG9ydCBjbGFzcyBEZWRpY2F0ZWRXb3JrZXIge1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgY3JlYXRlRnJvbVNvdXJjZXMoLi4uc291cmNlczogYW55W10pOiBXb3JrZXIge1xuICAgICAgICBsZXQgd29ya2VyQ29kZTogc3RyaW5nID0gXCJcIjtcbiAgICAgICAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgc291cmNlcy5sZW5ndGggLSAxOyBpZHgrKykge1xuICAgICAgICAgICAgd29ya2VyQ29kZSArPSBzb3VyY2VzW2lkeF0udG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICB3b3JrZXJDb2RlICs9IFwiKFwiICsgc291cmNlc1tzb3VyY2VzLmxlbmd0aCAtIDFdLnRvU3RyaW5nKCkgKyBcIikoKTtcIjtcbiAgICAgICAgcmV0dXJuIG5ldyBXb3JrZXIod2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwobmV3IEJsb2IoW3dvcmtlckNvZGVdKSkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlRnJvbUxvY2F0aW9uKGpzVXJsOiBzdHJpbmcsIG9uSW5pdGlhbGl6ZWQ6ICgpID0+IHZvaWQsIG9uTWVzc2FnZTogKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHZvaWQpOiBXb3JrZXIge1xuICAgICAgICBsZXQgbW9kdWxlRGVmaXRpb246IHN0cmluZyA9IGBNb2R1bGUgPSB7XG4gICAgICAgICAgICBsb2NhdGVGaWxlOiBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcXFwiYCArIGpzVXJsLnJlcGxhY2UoLy5qcyQvLCBcIi53YXNtXCIpICsgYFxcXCI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25SdW50aW1lSW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAoYCArIG9uSW5pdGlhbGl6ZWQudG9TdHJpbmcoKSArIGApKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07YDtcbiAgICAgICAgbGV0IG1lc3NhZ2VIYW5kbGVyOiBzdHJpbmcgPSBcInRoaXMub25tZXNzYWdlID0gXCIgKyBvbk1lc3NhZ2UudG9TdHJpbmcoKSArIFwiO1wiO1xuICAgICAgICBsZXQgaW1wb3J0SmF2YXNjcmlwdDogc3RyaW5nID0gXCJmdW5jdGlvbiBpbXBvcnRKYXZhc2NyaXB0KCkgeyBpbXBvcnRTY3JpcHRzKFxcXCJcIiArIGpzVXJsICsgXCJcXFwiKTsgfVwiO1xuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVGcm9tU291cmNlcyhtb2R1bGVEZWZpdGlvbiwgbWVzc2FnZUhhbmRsZXIsIGltcG9ydEphdmFzY3JpcHQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgdW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyKGV2ZW50OiBNZXNzYWdlRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJVbmV4cGVjdGVkIG1lc3NhZ2UgZnJvbSBXZWJXb3JrZXI6IFwiICsgZXZlbnQpO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBEZWRpY2F0ZWRXb3JrZXIgfSBmcm9tIFwiLi9kZWRpY2F0ZWRXb3JrZXJcIlxuXG5kZWNsYXJlIGZ1bmN0aW9uIHBvc3RNZXNzYWdlKGRhdGE6IGFueSk6IHZvaWQ7XG5cbmV4cG9ydCBjbGFzcyBFeGFtcGxlV29ya2VyIHtcbiAgICBwcml2YXRlIF93b3JrZXI6IFdvcmtlcjtcblxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoKSB7fVxuXG4gICAgcHJpdmF0ZSBzdGF0aWMgb25Jbml0aWFsaXplZCgpOiB2b2lkIHtcbiAgICAgICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgbWVzc2FnZTogXCJHb3QgYSBtb2R1bGUhXCJcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzdGF0aWMgb25NZXNzYWdlKGV2ZW50OiBNZXNzYWdlRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgbGV0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICBkYXRhLndlbnRUb1dvcmtlciA9IHRydWU7XG4gICAgICAgIHBvc3RNZXNzYWdlKGRhdGEpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlQXN5bmMoKTogUHJvbWlzZTxFeGFtcGxlV29ya2VyPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxFeGFtcGxlV29ya2VyPigocmVzb2x2ZTogKHdvcmtlcjogRXhhbXBsZVdvcmtlcikgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgICAgbGV0IGV4YW1wbGVXb3JrZXIgPSBuZXcgRXhhbXBsZVdvcmtlcigpO1xuICAgICAgICAgICAgZXhhbXBsZVdvcmtlci5fd29ya2VyID0gRGVkaWNhdGVkV29ya2VyLmNyZWF0ZUZyb21Mb2NhdGlvbihcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vc3ludGhldGljbWFndXMuZ2l0aHViLmlvL3dlYnBpbGVkLWFydWNvLWFyL3YwLjAyL3dlYnBpbGVkLWFydWNvLWFyL3dlYnBpbGVkLWFydWNvLWFyLmpzXCIsXG4gICAgICAgICAgICAgICAgRXhhbXBsZVdvcmtlci5vbkluaXRpYWxpemVkLFxuICAgICAgICAgICAgICAgIEV4YW1wbGVXb3JrZXIub25NZXNzYWdlKTtcbiAgICAgICAgICAgIGV4YW1wbGVXb3JrZXIuX3dvcmtlci5vbm1lc3NhZ2UgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGV4YW1wbGVXb3JrZXIuX3dvcmtlci5vbm1lc3NhZ2UgPSBEZWRpY2F0ZWRXb3JrZXIudW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZXhhbXBsZVdvcmtlcik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2VuZE1lc3NhZ2VBc3luYyhkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmU6ICh2YWx1ZTogYW55KSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl93b3JrZXIub25tZXNzYWdlID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3dvcmtlci5vbm1lc3NhZ2UgPSBEZWRpY2F0ZWRXb3JrZXIudW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fd29ya2VyLnBvc3RNZXNzYWdlKGRhdGEpO1xuXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbn0iXX0=
