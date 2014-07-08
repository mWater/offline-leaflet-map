async = require 'async'
IndexedDBDataStorage = require './IndexedDBDataStorage'
WebSQLDataStorage = require './WebSQLDataStorage'

# Saves and stores images using either Web SQL or IndexedDB
# Uses an async queue and can be canceled
# Will emit events while the saving of images is in progress

module.exports = class ImageStore
  constructor: (eventEmitter, imageRetriever) ->
    if not imageRetriever?
      throw new Error('the image store needs an imageRetriever')
    if not eventEmitter?
      throw new Error('the image store needs an eventEmitter')

    @_eventEmitter = eventEmitter
    @_nbTilesLeftToSave = 0
    @_nbImagesCurrentlyBeingRetrieved = 0
    @_imageRetriever = imageRetriever
    @_myQueue = null
    @_beingCanceled = false
    @_running = false

  createDB: (storeName, onReady, onError, useWebSQL) ->
    _useWebSQL = useWebSQL
    if not onReady?
      throw new Error('This async function needs a callback')

    if not _useWebSQL
      @storage = new IndexedDBDataStorage(storeName, onReady, onError)
    else
      @storage = new WebSQLDataStorage(storeName, onReady, onError)

  cancel: () ->
    if not @_running
      return false

    if @_beingCanceled
      return true

    @_beingCanceled = true
    if @_myQueue?
      @_myQueue.kill()
      if @_nbImagesCurrentlyBeingRetrieved == 0
        @_finish()
      return true
    return false

  isBusy: () ->
    return @_running

  get: (key, onSuccess, onError) ->
    if not onSuccess? or not onError?
      throw new Error('This async function needs callbacks')
    @storage.get(key, onSuccess, onError)

  clear: (onSuccess, onError) ->
    if not onSuccess? or not onError?
      throw new Error('This async function needs callbacks')
    @storage.clear(onSuccess, onError)

  _finish: (error, onError) ->
    @_running = false
    @_beingCanceled = false
    @_eventEmitter.fire('tilecachingprogressdone', null)
    @_myQueue = null
    @_nbImagesCurrentlyBeingRetrieved = 0
    if error?
      onError(error)
    else
      @_onSaveImagesSuccess()

  saveImages: (tileImagesToQuery, onStarted, onSuccess, onError) ->
    @_running = true
    if @_myQueue?
      throw new Error('Not allowed to save images while saving is already in progress')
    if not onStarted? or not onSuccess? or not onError?
      throw new Error('This async function needs callbacks')
    @_onSaveImagesSuccess = onSuccess

    @_getImagesNotInDB(tileImagesToQuery,
      (tileInfoOfImagesNotInDB) =>
        if not @_beingCanceled and tileInfoOfImagesNotInDB? and tileInfoOfImagesNotInDB.length > 0
          MAX_NB_IMAGES_RETRIEVED_SIMULTANEOUSLY = 8
          @_myQueue = async.queue((data, callback) =>
            @_saveTile(data, callback)
          , MAX_NB_IMAGES_RETRIEVED_SIMULTANEOUSLY);
          @_myQueue.drain = (error) =>
            @_finish(error, onError)

          @_myQueue.push data for data in tileInfoOfImagesNotInDB
          onStarted()
        else
          #nothing to do
          onStarted()
          @_finish()
      ,
      (error) ->
        onError(error)
    )

  _getImagesNotInDB: (tileImagesToQuery, callback, onError) ->
    tileImagesToQueryArray = []

    for imageKey of tileImagesToQuery
      tileImagesToQueryArray.push(imageKey)

    # Query all the needed tiles from the DB
    @storage.getDenseBatch(tileImagesToQueryArray,
      (tileImages) =>
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
      ,
      (error) ->
        onError(error)
    )

  _saveTile: (data, callback) ->
    # when the image is received, it is stored inside the DB using Base64 format
    gettingImage = (response) =>
      @storage.put(data.key, {"image": response},
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
      @_eventEmitter._reportError(errorType, {data: errorData, tileInfo: data.tileInfo})
      callback(errorType)

    @_nbImagesCurrentlyBeingRetrieved++
    @_imageRetriever.retrieveImage(data.tileInfo, gettingImage, errorGettingImage)

  # called when the total number of tiles is known
  _updateTotalNbImagesLeftToSave: (nbTiles) ->
    @_nbTilesLeftToSave = nbTiles
    @_eventEmitter.fire('tilecachingprogressstart', {nbTiles: @_nbTilesLeftToSave})

  # called each time a tile as been handled
  _decrementNbTilesLeftToSave: () ->
    @_nbTilesLeftToSave--
    if not @_beingCanceled
      @_eventEmitter.fire('tilecachingprogress', {nbTiles:@_nbTilesLeftToSave})

    # I need to do this so the ImageStore only call finish when everything is done canceling
    @_nbImagesCurrentlyBeingRetrieved--
    if @_beingCanceled and @_nbImagesCurrentlyBeingRetrieved == 0
      @_finish()
