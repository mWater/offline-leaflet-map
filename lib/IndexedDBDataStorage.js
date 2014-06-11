var IDBStore, IndexedDBDataStorage;

IDBStore = require('idb-wrapper');

module.exports = IndexedDBDataStorage = (function() {
  function IndexedDBDataStorage(storeName, onReady) {
    this._idbStore = new IDBStore({
      dbVersion: 1,
      storeName: storeName,
      keyPath: null,
      autoIncrement: false
    }, onReady);
  }

  IndexedDBDataStorage.prototype.get = function(key, onSuccess, onError) {
    return this._idbStore.get(key, onSuccess, onError);
  };

  IndexedDBDataStorage.prototype.clear = function(onSuccess, onError) {
    return this._idbStore.clear(onSuccess, onError);
  };

  IndexedDBDataStorage.prototype.put = function(key, object, onSuccess, onError) {
    return this._idbStore.put(key, object, onSuccess, onError);
  };

  IndexedDBDataStorage.prototype.getDenseBatch = function(tileImagesToQueryArray, onSuccess, onError) {
    return this._idbStore.getBatch(tileImagesToQueryArray, onSuccess, onError, 'dense');
  };

  return IndexedDBDataStorage;

})();
