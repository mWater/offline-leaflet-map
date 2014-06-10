IDBStore = require 'idb-wrapper'
queue = require 'queue-async'

module.exports = class ImageStore
  constructor: (control) ->
    @control = control
    @_nbTilesLeftToSave = 0
    @_nbTilesWithError = 0
    @_hasBeenCanceled = false

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

    return false

  isBusy: () ->
    return @_myQueue or @_hasBeenCanceled

  get: (key, onSuccess, onError) ->
    @_idbStore.get(key, onSuccess, onError)

  clear: () ->
    @_idbStore.clear()

  saveImages: (tileImagesToQuery) ->
    @_hasBeenCanceled = false

    tileImagesToQueryArray = []

    for imageKey of tileImagesToQuery
      tileImagesToQueryArray.push(imageKey)

    # Query all the needed tiles from the DB
    @_idbStore.getBatch(tileImagesToQueryArray, (tileImages) =>
      # will be loading and saving a maximum of 8 tiles at a time
      @_myQueue = queue(8)
      i = 0
      @control.fire('tilecachingstart', null)

      @_nbTilesLeftToSave = 0
      saveTile = (tileImage) =>
        if not tileImage
          # that tile image is not present in the DB
          key = tileImagesToQueryArray[i]
          tileInfo = tileImagesToQuery[key]
          console.log 'current key ' + key

          @_nbTilesLeftToSave++

          # that call will load the image from the map provider
          makingAjaxCall = (url, callback, error, queueCallback) =>
            if(@_hasBeenCanceled)
              queueCallback()
              return

            ajax(url, callback, error, queueCallback)

          imageUrl = @control._createURL(tileInfo.x, tileInfo.y, tileInfo.z)

          # when the image is received, it is stored inside the DB using Base64 format
          gettingImage = (response) =>
            console.log 'saving image with key: ' + key
            @_idbStore.put(key, {"image": arrayBufferToBase64ImagePNG(response)})
            @_decrementNbTilesLeftToSave()

          errorGettingImage = (errorType, errorData) =>
            @_incrementNbTilesWithError()
            @_decrementNbTilesLeftToSave()
            @_reportError(errorType, errorData, imageUrl)

          # using queue-async to limit the number of simultaneous ajax calls
          @_myQueue.defer(makingAjaxCall, imageUrl, gettingImage, errorGettingImage)

        i++

      saveTile(tileImage) for tileImage in tileImages

      @_updateTotalNbImagesLeftToSave(@_nbTilesLeftToSave)

      # wait for all tiles to be saved or found in the DB
      # using dense returns undefined for each entry not present in the DB
      @_myQueue.awaitAll(
        (error, data) =>
          @_hasBeenCanceled = false
          @_myQueue = null
          @control.fire('tilecachingprogressdone', null)
      )
    ,@_onBatchQueryError, 'dense'
    )

  # called when the total number of tiles is known
  _updateTotalNbImagesLeftToSave: (nbTiles) ->
    @_nbTilesLeftToSave = nbTiles
    @control.fire('tilecachingprogressstart', {nbTiles: @_nbTilesLeftToSave})


  # called each time a tile as been handled
  _decrementNbTilesLeftToSave: () ->
    @_nbTilesLeftToSave--
    @control.fire('tilecachingprogress', {nbTiles:@_nbTilesLeftToSave})

  _incrementNbTilesWithError: () ->
    #Not used for now...
    @_nbTilesWithError++

## The following code was taken from https://github.com/tbicr/OfflineMap
## under the MIT License (MIT)
## and converted to CoffeeScript
###
 The MIT License (MIT)

 Copyright (c) <year> <copyright holders>

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
###

ajax = (url, callback, error, queueCallback) ->
  xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'arraybuffer';
  xhr.onload = (err) ->
    if (this.status == 200)
      callback(this.response)
    else
      error("GET_STATUS_ERROR", err)
    queueCallback()
  xhr.onerror = (errorMsg) ->
    error("NETWORK_ERROR", errorMsg)
    queueCallback()
  xhr.send()


###
Probably btoa can work incorrect, you can override btoa with next example:
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding#Solution_.232_.E2.80.93_rewriting_atob%28%29_and_btoa%28%29_using_TypedArrays_and_UTF-8
###
arrayBufferToBase64ImagePNG = (buffer) ->
  binary = ''
  bytes = new Uint8Array(buffer)
  for i in [0 ... bytes.byteLength]
    binary += String.fromCharCode(bytes[i])

  return 'data:image/png;base64,' + btoa(binary)