_ = require 'lodash'
# Makes a ajax call to retrieve the image and returns it as Base64

module.exports = class ImageRetriever
  constructor: (offlineLayer) ->
    @offlineLayer = offlineLayer

  retrieveImage: (tileInfo, callback, error) ->
    imageUrl = @offlineLayer._createURL(tileInfo.x, tileInfo.y, tileInfo.z)

    ajax(imageUrl, (response) ->
      callback(arrayBufferToBase64ImagePNG(response))
    , error)



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
  xhr.onerror = (errorMsg) ->
    error("NETWORK_ERROR", errorMsg)
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