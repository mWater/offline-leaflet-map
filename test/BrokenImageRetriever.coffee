
module.exports = class BrokenImageRetriever
  constructor: () ->
    null

  retrieveImage: (tileInfo, callback, error) ->
    setTimeout(callback, 100)
