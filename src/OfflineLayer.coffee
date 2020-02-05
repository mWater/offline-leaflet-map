ImageStore = require './ImageStore'
ImageRetriever = require './ImageRetriever'

# Main class of the project
# By default, it behaves just like a L.TileLayer. If the dbOption is set to WebSQL or IndexedDB, it creates
# a DB and starts querying the tiles and only loads the image from the image provider if they are not present in the
# DB.
# calculateNbTiles(zoomLimit) can be used to know how many tiles are currently being shown, including all the sub tiles up to
# the zoomLimit
# saveTiles(zoomLimit, ...) will cache all the tiles currently shown, including all the sub tiles up to the zoomLimit
# Note: When dbOption is not set to WebSQL or IndexedDB, this class behaves just like a normal L.TileLayer
# Note: saveTiles will also save all the zoomed out tiles

module.exports = class OfflineLayer extends L.TileLayer
  initialize: (url, options) ->
    L.TileLayer.prototype.initialize.call(this, url, options)

    @_alreadyReportedErrorForThisActions = false
    @_onReady = options["onReady"]
    @_onError = options["onError"]
    dbOption = options["dbOption"]
    storeName = options["storeName"] || 'OfflineLeafletTileImages'
    @_tileImagesStore = null
    @_minZoomLevel = 12
    if options["minZoomLevel"]?
      @_minZoomLevel = parseInt(options["minZoomLevel"])

    if dbOption? and dbOption != "None"
      try
        if(dbOption == "WebSQL")
          useWebSQL = true
        else if(dbOption == "IndexedDB")
          useWebSQL = false
        else
          @_onError("COULD_NOT_CREATE_DB", "Invalid dbOption parameter: " + dbOption)

        # Create the DB store and then call the @_onReady callback
        imageRetriever = new ImageRetriever(this)
        @_tileImagesStore = new ImageStore(this, imageRetriever)
        @_tileImagesStore.createDB(storeName,
            () =>
              @_onReady()
          ,
            (error) =>
              @_tileImagesStore = null
              @_reportError("COULD_NOT_CREATE_DB", error)
              setTimeout(() =>
                  @_onReady()
                , 0
              )
          , useWebSQL
        )
      catch err
        @_tileImagesStore = null
        @_reportError("COULD_NOT_CREATE_DB", err)
        setTimeout(() =>
            @_onReady()
          , 0
        )
    else
      setTimeout(() =>
          @_onReady()
        , 0
      )

  # look at the code from L.TileLayer for more details
  _setUpTile: (tile, key, value) ->
    # Start loading the tile with either the cached tile image or the result of getTileUrl
    tile.src = value
    @fire('tileloadstart', {
        tile: tile,
        url: tile.src
      }
    )

  _reportError: (errorType, errorData) ->
    if @_onError
      if not @_alreadyReportedErrorForThisActions
        @_alreadyReportedErrorForThisActions = true
        @_onError(errorType, errorData)

  # look at the code from L.TileLayer for more details
  _loadTile: (tile, tilePoint) ->
    if not @_tileImagesStore
      return L.TileLayer.prototype._loadTile.call(this, tile, tilePoint)

    # Reproducing TileLayer._loadTile behavior, but the tile.src will be set later
    tile._layer = this
    tile.onerror = @_tileOnError
    @_adjustTilePoint(tilePoint)
    tile.onload = @_tileOnLoad
    # Done reproducing _loadTile

    onSuccess = (dbEntry) =>
      if dbEntry
        # if the tile has been cached, use the stored Base64 value
        @_setUpTile(tile, key, dbEntry.image)
      else
        # query the map provider for the tile
        @_setUpTile(tile, key, @getTileUrl(tilePoint))

    onError = () =>
      # Error while getting the key from the DB
      # will get the tile from the map provider
      @_setUpTile(tile, key, @getTileUrl(tilePoint))
      @_reportError("DB_GET", key)

    key = @_createTileKey(tilePoint.x, tilePoint.y, tilePoint.z)
    # Look for the tile in the DB
    @_tileImagesStore.get(key, onSuccess, onError)

  useDB: () ->
    return @_tileImagesStore != null

  cancel: () ->
    if @_tileImagesStore?
      return @_tileImagesStore.cancel()
    return false

  clearTiles: (onSuccess, onError) ->
    if(!@useDB())
      @_reportError("NO_DB", "No DB available")
      onError("No DB available")
      return

    if(@isBusy())
      @_reportError("SYSTEM_BUSY", "System is busy.")
      onError("System is busy.")
      return

    @_tileImagesStore.clear(onSuccess, (error) =>
      @_reportError("COULD_NOT_CLEAR_DB", error)
      onError(error)
    )

  # calculateNbTiles includes potentially already saved tiles.
  calculateNbTiles: (zoomLevelLimit) ->
    if @_map.getZoom() < @_minZoomLevel
      @_reportError("ZOOM_LEVEL_TOO_LOW")
      return -1

    count = 0
    tileImagesToQuery = @_getTileImages(zoomLevelLimit)
    for key of tileImagesToQuery
      count++
    return count

  isBusy: () ->
    if @_tileImagesStore?
      return @_tileImagesStore.isBusy()
    return false

  # Returns the tiles currently displayed
  # @_tiles could return tiles that are currently loaded but not displayed
  # that is why the tiles are recalculated here.
  _getTileImages: (zoomLevelLimit) ->
    zoomLevelLimit = zoomLevelLimit || @_map.getMaxZoom()

    tileImagesToQuery = {}

    map = @_map
    startingZoom = Math.min(map.getZoom(), zoomLevelLimit)
    bounds = map.getPixelBounds()
    # Handle both Leaflet 0.7 (_getTileSize) and 1.0
    tileSize = if @_getTileSize then @_getTileSize() else @getTileSize().x

    # bounds are rounded down since a tile cover all the pixels from it's rounded down value until the next tile
    roundedTileBounds = L.bounds(
      bounds.min.divideBy(tileSize)._floor(),
      bounds.max.divideBy(tileSize)._floor()
    )

    tilesInScreen = []

    for j in [roundedTileBounds.min.y .. roundedTileBounds.max.y]
      for i in [roundedTileBounds.min.x .. roundedTileBounds.max.x]
        tilesInScreen.push(new L.Point(i, j))

    # We will use the exact bound values to test if sub tiles are still inside these bounds.
    # The idea is to avoid caching images outside the screen.
    tileBounds = L.bounds(
      bounds.min.divideBy(tileSize),
      bounds.max.divideBy(tileSize)
    )
    minY = tileBounds.min.y
    maxY = tileBounds.max.y
    minX = tileBounds.min.x
    maxX = tileBounds.max.x

    arrayLength = tilesInScreen.length
    for i in [0 ... arrayLength]
      point = tilesInScreen[i]
      x = point.x
      y = point.y
      @_getZoomedInTiles(x, y, startingZoom, zoomLevelLimit, tileImagesToQuery, minY, maxY, minX, maxX)
      @_getZoomedOutTiles(x, y, startingZoom, 0, tileImagesToQuery, minY, maxY, minX, maxX)

    return tileImagesToQuery

  # saves the tiles currently on screen + lower and higher zoom levels.
  saveTiles: (zoomLevelLimit, onStarted, onSuccess, onError) ->
    @_alreadyReportedErrorForThisActions = false

    if(!@_tileImagesStore)
      @_reportError("NO_DB", "No DB available")
      onError("No DB available")
      return

    if(@isBusy())
      @_reportError("SYSTEM_BUSY", "system is busy.")
      onError("system is busy.")
      return

    if @_map.getZoom() < @_minZoomLevel
      @_reportError("ZOOM_LEVEL_TOO_LOW")
      onError("ZOOM_LEVEL_TOO_LOW")
      return

    #lock UI
    tileImagesToQuery = @_getTileImages(zoomLevelLimit)
    @_tileImagesStore.saveImages(tileImagesToQuery, onStarted, onSuccess, (error) =>
      @_reportError("SAVING_TILES", error)
      onError(error)
    )

  # returns all the tiles with higher zoom levels
  _getZoomedInTiles: (x, y, currentZ, maxZ, tileImagesToQuery, minY, maxY, minX, maxX) ->
    @_getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX, true)

    if currentZ < maxZ
      # getting the 4 tile under the current tile
      minY *= 2
      maxY *= 2
      minX *= 2
      maxX *= 2
      @_getZoomedInTiles(x * 2, y * 2, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX)
      @_getZoomedInTiles(x * 2 + 1, y * 2, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX)
      @_getZoomedInTiles(x * 2, y * 2 + 1, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX)
      @_getZoomedInTiles(x * 2 + 1, y * 2 + 1, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX)

  # returns all the tiles with lower zoom levels
  _getZoomedOutTiles: (x, y, currentZ, finalZ, tileImagesToQuery, minY, maxY, minX, maxX) ->
    @_getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX, false)

    if currentZ > finalZ
      minY /= 2
      maxY /= 2
      minX /= 2
      maxX /= 2
      # getting the zoomed out tile containing this tile
      @_getZoomedOutTiles(Math.floor(x / 2), Math.floor(y / 2), currentZ - 1, finalZ, tileImagesToQuery,
        minY, maxY, minX, maxX)

  _getTileImage: (x, y, z, tileImagesToQuery, minY, maxY, minX, maxX) ->
    # is the tile outside the bounds?
    if x < Math.floor(minX) or x > Math.floor(maxX) or y < Math.floor(minY) or y > Math.floor(maxY)
      return

    # At this point, we only add the image to a "dictionary"
    # This is being done to avoid multiple requests when zooming out, since zooming int should never overlap
    key = @_createTileKey(x, y, z)
    if(!tileImagesToQuery[key])
      tileImagesToQuery[key] = {key:key, x: x, y: y, z: z}

  _createNormalizedTilePoint: (x, y, z) ->
    nbTilesAtZoomLevel = Math.pow(2, z)

    while(x > nbTilesAtZoomLevel)
      x -= nbTilesAtZoomLevel
    while(x < 0)
      x += nbTilesAtZoomLevel

    while(y > nbTilesAtZoomLevel)
      y -= nbTilesAtZoomLevel
    while(y < 0)
      y += nbTilesAtZoomLevel

    return {x: x, y: y, z: z}

  _createURL: (x, y, z) ->
    tilePoint = @_createNormalizedTilePoint(x, y, z)
    return @getTileUrl(tilePoint)

  _createTileKey: (x, y, z) ->
    tilePoint = @_createNormalizedTilePoint(x, y, z)
    return tilePoint.x + ", " + tilePoint.y + ", " + tilePoint.z

  # Override
  # The parent one does not care about the z parameter being passed
  getTileUrl: (coords) ->
    data = {
      r: if L.Browser.retina then '@2x' else '',
      s: @_getSubdomain(coords),
      x: coords.x,
      y: coords.y,
      z: coords.z or @_getZoomForUrl()
    }

    if @_map and not @_map.options.crs.infinite
      invertedY = @_globalTileRange.max.y - coords.y
      if @options.tms
        data['y'] = invertedY
      
      data['-y'] = invertedY
    
    L.Util.template(@_url, L.extend(data, @options));


