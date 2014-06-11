IDBStore = require 'idb-wrapper'
async = require 'async'

module.exports = class ImageStore
  constructor: (eventEmitter, imageRetriever) ->
    if not imageRetriever?
      throw new Error('the image store needs an imageRetriever')
    if not eventEmitter?
      throw new Error('the image store needs an eventEmitter')

    @_eventEmitter = eventEmitter
    @_nbTilesLeftToSave = 0
    @_imageRetriever = imageRetriever
    @_myQueue = null

  createDB: (storeName, onReady, useWebSQL) ->
    _useWebSQL = useWebSQL
    if not onReady?
      throw new Error('This async function needs a callback')

    if _useWebSQL
      @_idbStore = new IDBStore({
        dbVersion: 1,
        storeName: storeName,
        keyPath: null,
        autoIncrement: false
      }, onReady)
    else
      null

  cancel: () ->
    if @_myQueue?
      @_myQueue.pause()
      return true
    return false

  isBusy: () ->
    return @_myQueue?

  get: (key, onSuccess, onError) ->
    if not onSuccess? or not onError?
      throw new Error('This async function needs callbacks')
    @_idbStore.get(key, onSuccess, onError)

  clear: (onSuccess, onError) ->
    if not onSuccess? or not onError?
      throw new Error('This async function needs callbacks')
    @_idbStore.clear(onSuccess, onError)

  saveImages: (tileImagesToQuery, started, onSuccess, onError) ->
    if not started? or not onSuccess? or not onError?
      throw new Error('This async function needs callbacks')

    @_getImagesNotInDB(tileImagesToQuery, (tileInfoOfImagesNotInDB) =>
      if tileInfoOfImagesNotInDB? and tileInfoOfImagesNotInDB.length > 0
        @_myQueue = async.queue((data, callback) =>
          @_saveTile(data, callback)
        , 8);
        @_myQueue.drain = (error) =>
          @_eventEmitter.fire('tilecachingprogressdone', null)
          @_myQueue = null
          if error?
            onError()
          else
            onSuccess()

        @_myQueue.push data for data in tileInfoOfImagesNotInDB
        started()
      else
        #nothing to do
        started()
        onSuccess()
    )

  _getImagesNotInDB: (tileImagesToQuery, callback) ->
    tileImagesToQueryArray = []

    for imageKey of tileImagesToQuery
      tileImagesToQueryArray.push(imageKey)

    # Query all the needed tiles from the DB
    @_idbStore.getBatch(tileImagesToQueryArray, (tileImages) =>
      i = 0
      tileInfoOfImagesNotInDB = []
      @_eventEmitter.fire('tilecachingstart', null)

      @_nbTilesLeftToSave = 0
      testTile = (tileImage) =>
        if not tileImage
          # that tile image is not present in the DB
          key = tileImagesToQueryArray[i]
          tileInfo = tileImagesToQuery[key]

          @_nbTilesLeftToSave++
          tileInfoOfImagesNotInDB.push({key: key, tileInfo: tileInfo})

        i++

      testTile(tileImage) for tileImage in tileImages
      @_updateTotalNbImagesLeftToSave(@_nbTilesLeftToSave)

      callback(tileInfoOfImagesNotInDB)

    ,@_onBatchQueryError, 'dense'
    )

  _saveTile: (data, callback) ->
    # when the image is received, it is stored inside the DB using Base64 format
    gettingImage = (response) =>
      @_idbStore.put(data.key, {"image": response},
      () =>
        @_decrementNbTilesLeftToSave()
        callback()
      ,
      (error) =>
        @_decrementNbTilesLeftToSave()
        callback(error)
      )

    errorGettingImage = (errorType, errorData) =>
      @_decrementNbTilesLeftToSave()
      @_eventEmitter._reportError(errorType, errorData, data.tileInfo)
      callback(errorType)

    canceled = () =>
      callback()

    @_imageRetriever.retrieveImage(data.tileInfo, gettingImage, errorGettingImage, canceled)

  # called when the total number of tiles is known
  _updateTotalNbImagesLeftToSave: (nbTiles) ->
    @_nbTilesLeftToSave = nbTiles
    @_eventEmitter.fire('tilecachingprogressstart', {nbTiles: @_nbTilesLeftToSave})

  # called each time a tile as been handled
  _decrementNbTilesLeftToSave: () ->
    @_nbTilesLeftToSave--
    @_eventEmitter.fire('tilecachingprogress', {nbTiles:@_nbTilesLeftToSave})
