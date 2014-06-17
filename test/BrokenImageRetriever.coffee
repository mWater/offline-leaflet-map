
module.exports = class BrokenImageRetriever
  constructor: () ->
    null

  retrieveImage: (tileInfo, callback, error) ->
    setTimeout(error, 100)
