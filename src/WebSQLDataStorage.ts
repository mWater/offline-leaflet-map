import { DataStorage, ErrorCallback, SuccessCallback } from "./types";

class WebSQLDataStorage implements DataStorage{
  private _storeName
  private _webSQLDB: Database

  private _webSqlErrorHandler: (onError: ErrorCallback) => SQLStatementErrorCallback

  constructor(storeName: string, onReady: () => void, onError: ErrorCallback) {
    this._storeName = storeName;

    this._webSqlErrorHandler = (onError: ErrorCallback) => (_: SQLTransaction, err: SQLError) => {
      onError(err)
      return true
    }

    if (window["sqlitePlugin"]) {
      this.initSqlite(onReady, onError)
    } else {
      this._webSQLDB = window.openDatabase('OfflineTileImages', '1.0', 'Store tile images for OfflineLeaftMap', 40 * 1024 * 1024);
      this._webSQLDB.transaction(tx => {
        tx.executeSql(`CREATE TABLE IF NOT EXISTS ${this._storeName} (key unique, image)`)
      }, onError, onReady);
    }
  }

  initSqlite(onReady: () => void, onError: ErrorCallback) {
    window["sqlitePlugin"].openDatabase(
      { name: "OfflineTileImages", location: "default" },
        (sqliteDb: any) => {
          console.log("Database open successful")
          this._webSQLDB = sqliteDb
          this._webSQLDB.transaction(tx => {
            tx.executeSql(`CREATE TABLE IF NOT EXISTS ${this._storeName} (key unique, image)`)
          }, onError, onReady);
        }
    )
  }

  get(key: string, onSuccess: SuccessCallback, onError: ErrorCallback) {
    this._webSQLDB.transaction(tx => {
      const onSQLSuccess = function(_: any, results: any) {
        const len = results.rows.length;
        if (len === 0) {
          onSuccess(undefined);
        } else if (len === 1) {
          onSuccess(results.rows.item(0));
        } else {
          onError('There should be no more than one entry');
        }
      };

      tx.executeSql(`SELECT * FROM ${this._storeName} WHERE key='${key}'`, [], onSQLSuccess, this._webSqlErrorHandler(onError));
    });
  }

  clear(onSuccess: SuccessCallback, onError: ErrorCallback) {
    this._webSQLDB.transaction(tx => {
      tx.executeSql(`DELETE FROM ${this._storeName}`, [], onSuccess, this._webSqlErrorHandler(onError));
    });
  }

  put(key: string, object: any, onSuccess: SuccessCallback, onError: ErrorCallback) {
    this._webSQLDB.transaction(tx => {
      tx.executeSql(`INSERT OR REPLACE INTO ${this._storeName} VALUES (?, ?)`, [key, object.image], onSuccess, this._webSqlErrorHandler(onError));
    });
  }

  // That one is trickier
  // IndexedDB has an option called 'dense'. The idea is that the result array matches the queried keys array, both
  // in size and position. If nothing has been found for a key, there will be undefined at that index in the response.
  // Note: For now, getDenseBatch is only used to find the missing keys
  getDenseBatch(tileImagesToQueryArray: any[], onSuccess: SuccessCallback, onError: ErrorCallback) {
    if (tileImagesToQueryArray.length === 0) {
      onSuccess([]);
    }

    this._webSQLDB.transaction(tx => {
      let asc, end, j;
      let i;
      const result: any[] = [];
      const tileImagesToQueryArray2 = [];
      // 2 things are being done here
      // Add '' around the keys to create a valid string for the SQL query
      // Create the result array with one undefined for each key
      for (j = 0, i = j, end = tileImagesToQueryArray.length, asc = 0 <= end; asc ? j < end : j > end; asc ? j++ : j--, i = j) {
        tileImagesToQueryArray2.push("'" + tileImagesToQueryArray[i] + "'");
        result.push(undefined);
      }
      const keys = tileImagesToQueryArray2.join(',');

      const onSQLSuccess = function(_: any, results: any) {
        let asc1, end1;
        for (i = 0, end1 = results.rows.length, asc1 = 0 <= end1; asc1 ? i < end1 : i > end1; asc1 ? i++ : i--) {
          var item = results.rows.item(i);
          // look up the key index and set the value
          var index = tileImagesToQueryArray.indexOf(item.key);
          if (index >= 0) {
            result[index] = item;
          }
        }
        onSuccess(result);
      };

      tx.executeSql(`SELECT * FROM ${this._storeName} WHERE key IN (${keys})`, [], onSQLSuccess, this._webSqlErrorHandler(onError));
    });
  }
}

export default WebSQLDataStorage
