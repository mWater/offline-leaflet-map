
module.exports = class FakeImageRetriever
  constructor: () ->
    null

  retrieveImage: (tileInfo, callback, error, cancel) ->
    callback(tileInfo)

  reset: ()->
    null
