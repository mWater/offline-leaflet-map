# NOTE: WebSQLDataStorage and IndexedDBDataStorage should have the same behavior
# The system was designed with Indexed DB, so WebSQLDataStorage is copying the behavior of IndexedDB
module.exports = class IndexedDBDataStorage
  constructor: (storeName, onReady) ->
    @_storeName = storeName
    @_webSQLDB = openDatabase('mydb', '1.0', 'my first database', 50 * 1024 * 1024)
    @_webSQLDB.transaction((tx) ->
      tx.executeSql("CREATE TABLE IF NOT EXISTS #{@_storeName} (key unique, image)")
      onReady()
    )

  get: (key, onSuccess, onError) ->
    @_webSQLDB.transaction((tx) ->
      onSQLSuccess = (tx, results) ->
        len = results.rows.length;
        if len == 0
          onSuccess(null)
        else if len == 1
          onSuccess(results.rows.item(0))
        else
          onError('There should be no more than one entry')

      tx.executeSql("SELECT * FROM #{@_storeName} WHERE key='#{key}'", [], onSQLSuccess, onError)
    )

  clear: (onSuccess, onError) ->
    @_webSQLDB.transaction((tx) ->
      tx.executeSql("DELETE FROM #{@_storeName}", [], onSuccess, onError)
    )

  put: (key, object, onSuccess, onError) ->
    @_webSQLDB.transaction((tx) ->
      tx.executeSql("INSERT OR REPLACE INTO #{@_storeName} VALUES (?, ?)", [key, object.image], onSuccess, onError)
    )

  # That one is trickier
  # IndexedDB has an option called 'dense'. The idea is that the result array matches the queried keys array, both
  # in size and position. If nothing has been found for a key, there will be undefined at that index in the response.
  # Note: For now, getDenseBatch is only used to find the missing keys
  getDenseBatch: (tileImagesToQueryArray, onSuccess, onError) ->
    if tileImagesToQueryArray.length == 0
      onSuccess([])

    @_webSQLDB.transaction((tx) ->
      result = []
      tileImagesToQueryArray2 = []
      # 2 things are being done here
      # Add '' around the keys to create a valid string for the SQL query
      # Create the result array with one undefined for each key
      for i in [0 ... tileImagesToQueryArray.length]
        tileImagesToQueryArray2.push "'" + tileImagesToQueryArray[i] + "'"
        result.push undefined
      keys = tileImagesToQueryArray2.join(',')

      onSQLSuccess = (tx, results) ->
        for i in [0 ... results.rows.length]
          item = results.rows.item(i)
          # look up the key index and set the value
          index = tileImagesToQueryArray.indexOf(item.key)
          if index >= 0
            result[index] = item
        onSuccess(result)

      tx.executeSql("SELECT * FROM #{@_storeName} WHERE key IN (#{keys})", [], onSQLSuccess, onError)
    )
