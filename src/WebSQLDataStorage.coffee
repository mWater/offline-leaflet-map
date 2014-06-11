
module.exports = class IndexedDBDataStorage
  constructor: (storeName, onReady) ->
    @_storeName = storeName
    @_webSQLDB = openDatabase('mydb', '1.0', 'my first database', 50 * 1024 * 1024)
    @_webSQLDB.transaction((tx) ->
      tx.executeSql("CREATE TABLE IF NOT EXISTS #{@_storeName} (id unique, image)")
      onReady()
    )

  get: (key, onSuccess, onError) ->
    @_webSQLDB.transaction((tx) ->
      console.log 'key: ' + key
      tx.executeSql("SELECT * FROM #{@_storeName} WHERE id='#{key}'", [], (tx, results) ->
        len = results.rows.length;
        if len == 0
          onSuccess(null)
        else if len == 1
          onSuccess(results.rows.item(0))
        else
          onError('There should be no more than one entry')

      )

    )

  clear: (onSuccess, onError) ->
    @_webSQLDB.transaction((tx) ->
      tx.executeSql("DELETE FROM #{@_storeName}", [], () ->
        onSuccess()
      )
    )

  put: (key, object, onSuccess, onError) ->
    @_webSQLDB.transaction((tx) ->
      tx.executeSql("INSERT OR REPLACE INTO #{@_storeName} VALUES (?, ?)", [key, object.image])
      onSuccess()
    )

  getDenseBatch: (tileImagesToQueryArray, onSuccess, onError) ->
    if tileImagesToQueryArray.length == 0
      onSuccess([])

    @_webSQLDB.transaction((tx) ->
      result = []
      tileImagesToQueryArray2 = []
      for i in [0 ... tileImagesToQueryArray.length]
        tileImagesToQueryArray2.push "'" + tileImagesToQueryArray[i] + "'"
        result.push null
      keys = tileImagesToQueryArray2.join(',')
      console.log keys
      tx.executeSql("SELECT * FROM #{@_storeName} WHERE id IN (#{keys})", [], (tx, results) ->
        for i in [0 ... results.rows.length]
          item = results.rows.item(i)
          index = tileImagesToQueryArray.indexOf(item.id)
          result[index] = item.image
        onSuccess(result)
      )
    )
