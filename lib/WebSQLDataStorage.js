var IndexedDBDataStorage;

module.exports = IndexedDBDataStorage = (function() {
  function IndexedDBDataStorage(storeName, onReady) {
    this._storeName = storeName;
    this._webSQLDB = openDatabase('mydb', '1.0', 'my first database', 50 * 1024 * 1024);
    this._webSQLDB.transaction(function(tx) {
      tx.executeSql("CREATE TABLE IF NOT EXISTS " + this._storeName + " (id unique, image)");
      return onReady();
    });
  }

  IndexedDBDataStorage.prototype.get = function(key, onSuccess, onError) {
    return this._webSQLDB.transaction(function(tx) {
      console.log('key: ' + key);
      return tx.executeSql("SELECT * FROM " + this._storeName + " WHERE id='" + key + "'", [], function(tx, results) {
        var len;
        len = results.rows.length;
        if (len === 0) {
          return onSuccess(null);
        } else if (len === 1) {
          return onSuccess(results.rows.item(0));
        } else {
          return onError('There should be no more than one entry');
        }
      });
    });
  };

  IndexedDBDataStorage.prototype.clear = function(onSuccess, onError) {
    return this._webSQLDB.transaction(function(tx) {
      return tx.executeSql("DELETE FROM " + this._storeName, [], function() {
        return onSuccess();
      });
    });
  };

  IndexedDBDataStorage.prototype.put = function(key, object, onSuccess, onError) {
    return this._webSQLDB.transaction(function(tx) {
      tx.executeSql("INSERT OR REPLACE INTO " + this._storeName + " VALUES (?, ?)", [key, object.image]);
      return onSuccess();
    });
  };

  IndexedDBDataStorage.prototype.getDenseBatch = function(tileImagesToQueryArray, onSuccess, onError) {
    if (tileImagesToQueryArray.length === 0) {
      onSuccess([]);
    }
    return this._webSQLDB.transaction(function(tx) {
      var i, keys, result, tileImagesToQueryArray2, _i, _ref;
      result = [];
      tileImagesToQueryArray2 = [];
      for (i = _i = 0, _ref = tileImagesToQueryArray.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        tileImagesToQueryArray2.push("'" + tileImagesToQueryArray[i] + "'");
        result.push(null);
      }
      keys = tileImagesToQueryArray2.join(',');
      console.log(keys);
      return tx.executeSql("SELECT * FROM " + this._storeName + " WHERE id IN (" + keys + ")", [], function(tx, results) {
        var index, item, _j, _ref1;
        for (i = _j = 0, _ref1 = results.rows.length; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
          item = results.rows.item(i);
          index = tileImagesToQueryArray.indexOf(item.id);
          result[index] = item.image;
        }
        return onSuccess(result);
      });
    });
  };

  return IndexedDBDataStorage;

})();
