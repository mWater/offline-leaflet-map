"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const idb_wrapper_1 = __importDefault(require("idb-wrapper"));
// Very simple, one to one matching of IDBStore methods, I could have directly used the IDBStore but I wanted to
// have full control over the interface and hide the IDBStore construction.
// The whole idea of that class is to have a fixed interface that WebSQLDataStorage can emulate.
// NOTE: WebSQLDataStorage and IndexedDBDataStorage should have the same behavior
class IndexedDBDataStorage {
    constructor(storeName, onReady, onError) {
        this._idbStore = new idb_wrapper_1.default({
            dbVersion: 1,
            storeName,
            keyPath: null,
            autoIncrement: false,
        }, onReady, onError);
    }
    get(key, onSuccess, onError) {
        return this._idbStore.get(key, onSuccess, onError);
    }
    clear(onSuccess, onError) {
        return this._idbStore.clear(onSuccess, onError);
    }
    put(key, object, onSuccess, onError) {
        return this._idbStore.put(key, object, onSuccess, onError);
    }
    // IndexedDB has an option called 'dense'. The idea is that the result array matches the queried keys array, both
    // in size and position. If nothing has been found for a key, there will be undefined at that index in the response.
    getDenseBatch(tileImagesToQueryArray, onSuccess, onError) {
        return this._idbStore.getBatch(tileImagesToQueryArray, onSuccess, onError, 'dense');
    }
}
exports.default = IndexedDBDataStorage;
