import IDBStore from 'idb-wrapper'
import {DataStorage, ErrorCallback, SuccessCallback} from './types'

// Very simple, one to one matching of IDBStore methods, I could have directly used the IDBStore but I wanted to
// have full control over the interface and hide the IDBStore construction.
// The whole idea of that class is to have a fixed interface that WebSQLDataStorage can emulate.
// NOTE: WebSQLDataStorage and IndexedDBDataStorage should have the same behavior

class IndexedDBDataStorage implements DataStorage {
  private _idbStore

  constructor(storeName: string, onReady: () => void, onError: ErrorCallback) {
    this._idbStore = new IDBStore(
      {
        dbVersion: 1,
        storeName,
        keyPath: null,
        autoIncrement: false,
      },
      onReady,
      onError,
    )
  }

  get(key: string, onSuccess: SuccessCallback, onError: ErrorCallback) {
    return this._idbStore.get(key, onSuccess, onError)
  }

  clear(onSuccess: SuccessCallback, onError: ErrorCallback) {
    return this._idbStore.clear(onSuccess, onError)
  }

  put(key: string, object: any, onSuccess: SuccessCallback, onError: ErrorCallback) {
    return this._idbStore.put(key, object, onSuccess, onError)
  }

  // IndexedDB has an option called 'dense'. The idea is that the result array matches the queried keys array, both
  // in size and position. If nothing has been found for a key, there will be undefined at that index in the response.
  getDenseBatch(tileImagesToQueryArray: any[], onSuccess: SuccessCallback, onError: ErrorCallback) {
    return this._idbStore.getBatch(tileImagesToQueryArray, onSuccess, onError, 'dense')
  }
}

export default IndexedDBDataStorage
