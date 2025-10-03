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
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.pickHealthyInstance = void 0;
var node_fetch_1 = require("node-fetch");
var healthCache = new Map();
var HEALTH_CHECK_TTL = 5 * 60 * 1000;
var HEALTH_CHECK_TIMEOUT = 5000;
function checkInstanceHealth(instance) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, now, controller_1, timeout, response, isHealthy, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = instance.toString();
                    cached = healthCache.get(cacheKey);
                    now = Date.now();
                    if (cached && now - cached.lastChecked < HEALTH_CHECK_TTL) {
                        return [2 /*return*/, cached.isHealthy];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    controller_1 = new AbortController();
                    timeout = setTimeout(function () { return controller_1.abort(); }, HEALTH_CHECK_TIMEOUT);
                    return [4 /*yield*/, (0, node_fetch_1["default"])(instance.toString(), {
                            method: "GET",
                            signal: controller_1.signal,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                            }
                        })];
                case 2:
                    response = _a.sent();
                    clearTimeout(timeout);
                    isHealthy = response.ok;
                    healthCache.set(cacheKey, { isHealthy: isHealthy, lastChecked: now });
                    return [2 /*return*/, isHealthy];
                case 3:
                    error_1 = _a.sent();
                    healthCache.set(cacheKey, { isHealthy: false, lastChecked: now });
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function pickHealthyInstance(instances) {
    return __awaiter(this, void 0, void 0, function () {
        var shuffled;
        return __generator(this, function (_a) {
            shuffled = __spreadArray([], instances, true).sort(function () { return Math.random() - 0.5; });
            return [2 /*return*/, new Promise(function (resolve) {
                    var settledCount = 0;
                    var total = shuffled.length;
                    var _loop_1 = function (instance) {
                        checkInstanceHealth(instance).then(function (healthy) {
                            if (healthy) {
                                resolve(instance);
                            }
                            else {
                                settledCount++;
                                if (settledCount === total) {
                                    resolve(null);
                                }
                            }
                        });
                    };
                    for (var _i = 0, shuffled_1 = shuffled; _i < shuffled_1.length; _i++) {
                        var instance = shuffled_1[_i];
                        _loop_1(instance);
                    }
                })];
        });
    });
}
exports.pickHealthyInstance = pickHealthyInstance;
