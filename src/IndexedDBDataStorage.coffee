IDBStore = require 'idb-wrapper'

module.exports = class IndexedDBDataStorage
  constructor: (storeName, onReady) ->
    @_idbStore = new IDBStore({
      dbVersion: 1,
      storeName: storeName,
      keyPath: null,
      autoIncrement: false
    }, onReady)

  get: (key, onSuccess, onError) ->
    @_idbStore.get(key, onSuccess, onError)

  clear: (onSuccess, onError) ->
    @_idbStore.clear(onSuccess, onError)

  put: (key, object, onSuccess, onError) ->
    @_idbStore.put(key, object, onSuccess, onError)

  getDenseBatch: (tileImagesToQueryArray, onSuccess, onError) ->
    @_idbStore.getBatch(tileImagesToQueryArray, onSuccess, onError, 'dense')
