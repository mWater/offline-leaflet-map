IDBStore = require 'idb-wrapper'

# Very simple, one to one matching of IDBStore methods, I could have directly used the IDBStore but I wanted to
# have full control over the interface and hide the IDBStore construction.
# The whole idea of that class is to have a fixed interface that WebSQLDataStorage can emulate.
# NOTE: WebSQLDataStorage and IndexedDBDataStorage should have the same behavior
module.exports = class IndexedDBDataStorage
  constructor: (storeName, onReady, onError) ->
    @_idbStore = new IDBStore({
      dbVersion: 1,
      storeName: storeName,
      keyPath: null,
      autoIncrement: false
    }, onReady, onError)

  get: (key, onSuccess, onError) ->
    @_idbStore.get(key, onSuccess, onError)

  clear: (onSuccess, onError) ->
    @_idbStore.clear(onSuccess, onError)

  put: (key, object, onSuccess, onError) ->
    @_idbStore.put(key, object, onSuccess, onError)

  # IndexedDB has an option called 'dense'. The idea is that the result array matches the queried keys array, both
  # in size and position. If nothing has been found for a key, there will be undefined at that index in the response.
  getDenseBatch: (tileImagesToQueryArray, onSuccess, onError) ->
    @_idbStore.getBatch(tileImagesToQueryArray, onSuccess, onError, 'dense')
