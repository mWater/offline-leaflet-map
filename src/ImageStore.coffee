IDBStore = require 'idb-wrapper'
async = require 'async'

module.exports = class ImageStore
  constructor: (eventEmitter, imageRetriever) ->
    if not imageRetriever?
      throw new Error('the image store needs an imageRetriever')
    if not eventEmitter?
      throw new Error('the image store needs an eventEmitter')

    @eventEmitter = eventEmitter
    @_nbTilesLeftToSave = 0
    @_nbTilesWithError = 0
    @_hasBeenCanceled = false
    @_imageRetriever = imageRetriever

  createDB: (storeName, onReady) ->
    @_idbStore = new IDBStore({
      dbVersion: 1,
      storeName: storeName,
      keyPath: null,
      autoIncrement: false
    }, onReady)

  cancel: () ->
    if(@_myQueue)
      @_hasBeenCanceled = true
      return true

    @_imageRetriever.cancel()
    return false

  isBusy: () ->
    return @_myQueue or @_hasBeenCanceled

  get: (key, onSuccess, onError) ->
    @_idbStore.get(key, onSuccess, onError)

  clear: (onSuccess, onError) ->
    @_idbStore.clear(onSuccess, onError)

  saveImages: (tileImagesToQuery, onSuccess, onError) ->
    @_hasBeenCanceled = false
    @_imageRetriever.reset()

    tileImagesToQueryArray = []

    for imageKey of tileImagesToQuery
      tileImagesToQueryArray.push(imageKey)

    # Query all the needed tiles from the DB
    @_idbStore.getBatch(tileImagesToQueryArray, (tileImages) =>
      console.log 'starting getBatch'
      i = 0
      tileInfoOfImagesNotInDB = []
      @eventEmitter.fire('tilecachingstart', null)

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

      saveTile = (data, callback) =>
        # when the image is received, it is stored inside the DB using Base64 format
        gettingImage = (response) =>
          @_idbStore.put(data.key, {"image": response},
            () =>
              @_decrementNbTilesLeftToSave()
              console.log 'put'
              callback()
            ,
            () =>
              #should be reporting the error
              @_incrementNbTilesWithError()
              @_decrementNbTilesLeftToSave()
              console.log 'error2'
              callback()
          )


        errorGettingImage = (errorType, errorData) =>
          @_incrementNbTilesWithError()
          @_decrementNbTilesLeftToSave()
          @_reportError(errorType, errorData, tileInfo)
          console.log 'error'
          callback(errorType)

        canceled = () =>
          console.log 'cancel'
          callback()

        @_imageRetriever.retrieveImage(data.tileInfo, gettingImage, errorGettingImage, canceled)

      # will be loading and saving a maximum of 8 tiles at a time
      console.log 'starting each: ' + tileInfoOfImagesNotInDB
      async.eachLimit(tileInfoOfImagesNotInDB, 1, saveTile, (error) =>
        console.log 'done each: ' + error
        @_hasBeenCanceled = false
        @eventEmitter.fire('tilecachingprogressdone', null)
        if error?
          onError()
        else
          onSuccess()
      )
    ,@_onBatchQueryError, 'dense'
    )

  # called when the total number of tiles is known
  _updateTotalNbImagesLeftToSave: (nbTiles) ->
    @_nbTilesLeftToSave = nbTiles
    @eventEmitter.fire('tilecachingprogressstart', {nbTiles: @_nbTilesLeftToSave})


  # called each time a tile as been handled
  _decrementNbTilesLeftToSave: () ->
    @_nbTilesLeftToSave--
    @eventEmitter.fire('tilecachingprogress', {nbTiles:@_nbTilesLeftToSave})

  _incrementNbTilesWithError: () ->
    #Not used for now...
    @_nbTilesWithError++

