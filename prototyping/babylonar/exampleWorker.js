(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.BabylonAR = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dedicatedWorker_1 = require("./dedicatedWorker");
var ExampleWorker = /** @class */ (function () {
    function ExampleWorker() {
    }
    ExampleWorker.onInitialized = function () {
        dedicatedWorker_1.DedicatedWorker.postMessage({
            message: "Got a module!"
        });
    };
    ExampleWorker.onMessage = function (event) {
        var data = event.data;
        data.wentToWorker = true;
        dedicatedWorker_1.DedicatedWorker.postMessage(data);
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZGVkaWNhdGVkV29ya2VyLnRzIiwic3JjL2V4YW1wbGVXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0dBO0lBQUE7SUFvQ0EsQ0FBQztJQWxDa0IsaUNBQWlCLEdBQWhDO1FBQWlDLGlCQUFpQjthQUFqQixVQUFpQixFQUFqQixxQkFBaUIsRUFBakIsSUFBaUI7WUFBakIsNEJBQWlCOztRQUM5QyxJQUFJLFVBQVUsR0FBVyxFQUFFLENBQUM7UUFDNUIsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQy9DLFVBQVUsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDekM7UUFDRCxVQUFVLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLE1BQU0sQ0FBQztRQUNwRSxPQUFPLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUVhLGtDQUFrQixHQUFoQyxVQUFpQyxLQUFhLEVBQUUsYUFBeUIsRUFBRSxTQUF3QztRQUMvRyxJQUFJLGNBQWMsR0FBVyxrRkFFWCxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLHlGQUc1QyxHQUFHLGFBQWEsQ0FBQyxRQUFRLEVBQUUsR0FBRyxpQ0FFckMsQ0FBQztRQUNKLElBQUksY0FBYyxHQUFXLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxHQUFHLENBQUM7UUFDOUUsSUFBSSxnQkFBZ0IsR0FBVyxnREFBZ0QsR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDO1FBQ25HLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBRWEsc0JBQU0sR0FBcEI7UUFDSSxPQUFPLE1BQU0sQ0FBQTtJQUNqQixDQUFDO0lBRWEsMkJBQVcsR0FBekIsVUFBMEIsSUFBUztRQUMvQixXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUVhLHdDQUF3QixHQUF0QyxVQUF1QyxLQUFtQjtRQUN0RCxNQUFNLEtBQUssQ0FBQyxxQ0FBcUMsR0FBRyxLQUFLLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBQ0wsc0JBQUM7QUFBRCxDQXBDQSxBQW9DQyxJQUFBO0FBcENZLDBDQUFlOzs7O0FDSDVCLHFEQUFtRDtBQUVuRDtJQUdJO0lBQXVCLENBQUM7SUFFVCwyQkFBYSxHQUE1QjtRQUNJLGlDQUFlLENBQUMsV0FBVyxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxlQUFlO1NBQzNCLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFYyx1QkFBUyxHQUF4QixVQUF5QixLQUFtQjtRQUN4QyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLGlDQUFlLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFYSx5QkFBVyxHQUF6QjtRQUNJLE9BQU8sSUFBSSxPQUFPLENBQWdCLFVBQUMsT0FBd0M7WUFDdkUsSUFBSSxhQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUN4QyxhQUFhLENBQUMsT0FBTyxHQUFHLGlDQUFlLENBQUMsa0JBQWtCLENBQ3RELGlHQUFpRyxFQUNqRyxhQUFhLENBQUMsYUFBYSxFQUMzQixhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0IsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsVUFBQyxLQUFtQjtnQkFDbEQsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsaUNBQWUsQ0FBQyx3QkFBd0IsQ0FBQztnQkFDM0UsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzNCLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVNLHdDQUFnQixHQUF2QixVQUF3QixJQUFTO1FBQWpDLGlCQVdDO1FBVkcsSUFBSSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQU0sVUFBQyxPQUE2QjtZQUN6RCxLQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxVQUFDLEtBQW1CO2dCQUN6QyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwQixLQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxpQ0FBZSxDQUFDLHdCQUF3QixDQUFDO1lBQ3RFLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFL0IsT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQztJQUNMLG9CQUFDO0FBQUQsQ0EzQ0EsQUEyQ0MsSUFBQTtBQTNDWSxzQ0FBYSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImRlY2xhcmUgdmFyIE1vZHVsZTogYW55O1xuZGVjbGFyZSBmdW5jdGlvbiBwb3N0TWVzc2FnZShkYXRhOiBhbnkpOiB2b2lkO1xuXG5leHBvcnQgY2xhc3MgRGVkaWNhdGVkV29ya2VyIHtcblxuICAgIHByaXZhdGUgc3RhdGljIGNyZWF0ZUZyb21Tb3VyY2VzKC4uLnNvdXJjZXM6IGFueVtdKTogV29ya2VyIHtcbiAgICAgICAgbGV0IHdvcmtlckNvZGU6IHN0cmluZyA9IFwiXCI7XG4gICAgICAgIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IHNvdXJjZXMubGVuZ3RoIC0gMTsgaWR4KyspIHtcbiAgICAgICAgICAgIHdvcmtlckNvZGUgKz0gc291cmNlc1tpZHhdLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgd29ya2VyQ29kZSArPSBcIihcIiArIHNvdXJjZXNbc291cmNlcy5sZW5ndGggLSAxXS50b1N0cmluZygpICsgXCIpKCk7XCI7XG4gICAgICAgIHJldHVybiBuZXcgV29ya2VyKHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKG5ldyBCbG9iKFt3b3JrZXJDb2RlXSkpKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZUZyb21Mb2NhdGlvbihqc1VybDogc3RyaW5nLCBvbkluaXRpYWxpemVkOiAoKSA9PiB2b2lkLCBvbk1lc3NhZ2U6IChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB2b2lkKTogV29ya2VyIHtcbiAgICAgICAgbGV0IG1vZHVsZURlZml0aW9uOiBzdHJpbmcgPSBgTW9kdWxlID0ge1xuICAgICAgICAgICAgbG9jYXRlRmlsZTogZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXFxcImAgKyBqc1VybC5yZXBsYWNlKC8uanMkLywgXCIud2FzbVwiKSArIGBcXFwiO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uUnVudGltZUluaXRpYWxpemVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgKGAgKyBvbkluaXRpYWxpemVkLnRvU3RyaW5nKCkgKyBgKSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O2A7XG4gICAgICAgIGxldCBtZXNzYWdlSGFuZGxlcjogc3RyaW5nID0gXCJ0aGlzLm9ubWVzc2FnZSA9IFwiICsgb25NZXNzYWdlLnRvU3RyaW5nKCkgKyBcIjtcIjtcbiAgICAgICAgbGV0IGltcG9ydEphdmFzY3JpcHQ6IHN0cmluZyA9IFwiZnVuY3Rpb24gaW1wb3J0SmF2YXNjcmlwdCgpIHsgaW1wb3J0U2NyaXB0cyhcXFwiXCIgKyBqc1VybCArIFwiXFxcIik7IH1cIjtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlRnJvbVNvdXJjZXMobW9kdWxlRGVmaXRpb24sIG1lc3NhZ2VIYW5kbGVyLCBpbXBvcnRKYXZhc2NyaXB0KTtcbiAgICB9XG4gICAgXG4gICAgcHVibGljIHN0YXRpYyBtb2R1bGUoKTogYW55IHtcbiAgICAgICAgcmV0dXJuIE1vZHVsZVxuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgcG9zdE1lc3NhZ2UoZGF0YTogYW55KTogdm9pZCB7XG4gICAgICAgIHBvc3RNZXNzYWdlKGRhdGEpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgdW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyKGV2ZW50OiBNZXNzYWdlRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJVbmV4cGVjdGVkIG1lc3NhZ2UgZnJvbSBXZWJXb3JrZXI6IFwiICsgZXZlbnQpO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBEZWRpY2F0ZWRXb3JrZXIgfSBmcm9tIFwiLi9kZWRpY2F0ZWRXb3JrZXJcIlxuXG5leHBvcnQgY2xhc3MgRXhhbXBsZVdvcmtlciB7XG4gICAgcHJpdmF0ZSBfd29ya2VyOiBXb3JrZXI7XG5cbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKCkge31cblxuICAgIHByaXZhdGUgc3RhdGljIG9uSW5pdGlhbGl6ZWQoKTogdm9pZCB7XG4gICAgICAgIERlZGljYXRlZFdvcmtlci5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICBtZXNzYWdlOiBcIkdvdCBhIG1vZHVsZSFcIlxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHN0YXRpYyBvbk1lc3NhZ2UoZXZlbnQ6IE1lc3NhZ2VFdmVudCk6IHZvaWQge1xuICAgICAgICBsZXQgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICAgIGRhdGEud2VudFRvV29ya2VyID0gdHJ1ZTtcbiAgICAgICAgRGVkaWNhdGVkV29ya2VyLnBvc3RNZXNzYWdlKGRhdGEpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlQXN5bmMoKTogUHJvbWlzZTxFeGFtcGxlV29ya2VyPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxFeGFtcGxlV29ya2VyPigocmVzb2x2ZTogKHdvcmtlcjogRXhhbXBsZVdvcmtlcikgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgICAgbGV0IGV4YW1wbGVXb3JrZXIgPSBuZXcgRXhhbXBsZVdvcmtlcigpO1xuICAgICAgICAgICAgZXhhbXBsZVdvcmtlci5fd29ya2VyID0gRGVkaWNhdGVkV29ya2VyLmNyZWF0ZUZyb21Mb2NhdGlvbihcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vc3ludGhldGljbWFndXMuZ2l0aHViLmlvL3dlYnBpbGVkLWFydWNvLWFyL3YwLjAyL3dlYnBpbGVkLWFydWNvLWFyL3dlYnBpbGVkLWFydWNvLWFyLmpzXCIsXG4gICAgICAgICAgICAgICAgRXhhbXBsZVdvcmtlci5vbkluaXRpYWxpemVkLFxuICAgICAgICAgICAgICAgIEV4YW1wbGVXb3JrZXIub25NZXNzYWdlKTtcbiAgICAgICAgICAgIGV4YW1wbGVXb3JrZXIuX3dvcmtlci5vbm1lc3NhZ2UgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGV4YW1wbGVXb3JrZXIuX3dvcmtlci5vbm1lc3NhZ2UgPSBEZWRpY2F0ZWRXb3JrZXIudW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZXhhbXBsZVdvcmtlcik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2VuZE1lc3NhZ2VBc3luYyhkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmU6ICh2YWx1ZTogYW55KSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl93b3JrZXIub25tZXNzYWdlID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3dvcmtlci5vbm1lc3NhZ2UgPSBEZWRpY2F0ZWRXb3JrZXIudW5leHBlY3RlZE1lc3NhZ2VIYW5kbGVyO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fd29ya2VyLnBvc3RNZXNzYWdlKGRhdGEpO1xuXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbn0iXX0=
