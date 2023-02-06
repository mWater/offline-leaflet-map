import ImageStore from './ImageStore'
import ImageRetriever from './ImageRetriever'
import { TileLayer, TileLayerOptions } from 'leaflet'
import { ErrorCallback, SuccessCallback } from './types'

// Main class of the project
// By default, it behaves just like a L.TileLayer. If the dbOption is set to WebSQL or IndexedDB, it creates
// a DB and starts querying the tiles and only loads the image from the image provider if they are not present in the
// DB.
// calculateNbTiles(zoomLimit) can be used to know how many tiles are currently being shown, including all the sub tiles up to
// the zoomLimit
// saveTiles(zoomLimit, ...) will cache all the tiles currently shown, including all the sub tiles up to the zoomLimit
// Note: When dbOption is not set to WebSQL or IndexedDB, this class behaves just like a normal L.TileLayer
// Note: saveTiles will also save all the zoomed out tiles

type OfflineLayerOptions = {
  onReady: () => void
  onError: (code: string, message?: Error, message1?: string) => void
  dbOption: string
  storeName?: string
} & TileLayerOptions

class OfflineLayer extends TileLayer {

  private _alreadyReportedErrorForThisActions: boolean
  private _onReady: () => void
  private _onError: (code: string, error: Error) => void
  private _tileImagesStore: null | ImageStore
  private _minZoomLevel: number

  constructor(urlTemplate: string, options: OfflineLayerOptions) {
    super(urlTemplate, options)

    this._alreadyReportedErrorForThisActions = false;
    this._onReady = options["onReady"];
    this._onError = options["onError"];
    const dbOption = options["dbOption"];
    const storeName = options["storeName"] || 'OfflineLeafletTileImages';
    this._tileImagesStore = null;
    this._minZoomLevel = 12;
    if (options["minZoomLevel"] != null) {
      this._minZoomLevel = parseInt(options["minZoomLevel"]);
    }

    if ((dbOption != null) && (dbOption !== "None")) {
      try {
        let useWebSQL;
        if(dbOption === "WebSQL") {
          useWebSQL = true;
        } else if(dbOption === "IndexedDB") {
          useWebSQL = false;
        } else {
          this._onError("COULD_NOT_CREATE_DB", "Invalid dbOption parameter: " + dbOption);
          return
        }

        // Create the DB store and then call the @_onReady callback
        const imageRetriever = new ImageRetriever(this);
        this._tileImagesStore = new ImageStore(this, imageRetriever);
        this._tileImagesStore.createDB(storeName,
            () => {
              this._onReady();
            }
          ,(error: Error) => {
              this._tileImagesStore = null;
              this._reportError("COULD_NOT_CREATE_DB", error);
              setTimeout(() => {
                  this._onReady();
                }
                , 0
              );
            }
          , useWebSQL
        );
      } catch (err) {
        this._tileImagesStore = null;
        this._reportError("COULD_NOT_CREATE_DB", err);
        setTimeout(() => {
            this._onReady();
          }
          , 0
        );
      }
    } else {
      setTimeout(() => {
          this._onReady();
        }, 0);
    }
  }

  // look at the code from L.TileLayer for more details
  _setUpTile(tile: any, key: string, value: string) {
    // Start loading the tile with either the cached tile image or the result of getTileUrl
    tile.src = value;
    return this.fire('tileloadstart', {
        tile,
        url: tile.src
      }
    );
  }

  _reportError(errorType: string, errorData?: any) {
    if (this._onError) {
      if (!this._alreadyReportedErrorForThisActions) {
        this._alreadyReportedErrorForThisActions = true;
        return this._onError(errorType, errorData);
      }
    }
  }

  // look at the code from L.TileLayer for more details
  _loadTile(tile: any, tilePoint: any) {
    if (!this._tileImagesStore) {
      return TileLayer.prototype._loadTile.call(this, tile, tilePoint);
    }

    // Reproducing TileLayer._loadTile behavior, but the tile.src will be set later
    tile._layer = this;
    tile.onerror = this._tileOnError;
    this._adjustTilePoint(tilePoint);
    tile.onload = this._tileOnLoad;
    // Done reproducing _loadTile

    const onSuccess = (dbEntry: any) => {
      if (dbEntry) {
        // if the tile has been cached, use the stored Base64 value
        return this._setUpTile(tile, key, dbEntry.image);
      } else {
        // query the map provider for the tile
        return this._setUpTile(tile, key, this.getTileUrl(tilePoint));
      }
    };

    const onError = () => {
      // Error while getting the key from the DB
      // will get the tile from the map provider
      this._setUpTile(tile, key, this.getTileUrl(tilePoint));
      return this._reportError("DB_GET", key);
    };

    var key = this._createTileKey(tilePoint.x, tilePoint.y, tilePoint.z);
    // Look for the tile in the DB
    return this._tileImagesStore.get(key, onSuccess, onError);
  }

  useDB() {
    return this._tileImagesStore !== null;
  }

  cancel() {
    if (this._tileImagesStore != null) {
      return this._tileImagesStore.cancel();
    }
    return false;
  }

  clearTiles(onSuccess: SuccessCallback, onError: ErrorCallback) {
    if(!this.useDB()) {
      this._reportError("NO_DB", "No DB available");
      onError("No DB available");
      return;
    }

    if(this.isBusy()) {
      this._reportError("SYSTEM_BUSY", "System is busy.");
      onError("System is busy.");
      return;
    }

    this._tileImagesStore?.clear(onSuccess, error => {
      this._reportError("COULD_NOT_CLEAR_DB", error);
      onError(error);
    });
  }

  // calculateNbTiles includes potentially already saved tiles.
  calculateNbTiles(zoomLevelLimit: number) {
    if (this._map.getZoom() < this._minZoomLevel) {
      this._reportError("ZOOM_LEVEL_TOO_LOW");
      return -1;
    }

    let count = 0;
    const tileImagesToQuery = this._getTileImages(zoomLevelLimit);
    for (var key in tileImagesToQuery) {
      count++;
    }
    return count;
  }

  isBusy(): boolean {
    if (this._tileImagesStore != null) {
      return this._tileImagesStore.isBusy();
    }
    return false;
  }

  // Returns the tiles currently displayed
  // @_tiles could return tiles that are currently loaded but not displayed
  // that is why the tiles are recalculated here.
  _getTileImages(zoomLevelLimit: number) {
    let i;
    let asc2, end2;
    zoomLevelLimit = zoomLevelLimit || this._map.getMaxZoom();

    const tileImagesToQuery = {};

    const map = this._map;
    const startingZoom = Math.min(map.getZoom(), zoomLevelLimit);
    const bounds = map.getPixelBounds();
    // Handle both Leaflet 0.7 (_getTileSize) and 1.0
    const tileSize = this._getTileSize ? this._getTileSize() : this.getTileSize().x;

    // bounds are rounded down since a tile cover all the pixels from it's rounded down value until the next tile
    const roundedTileBounds = L.bounds(
      bounds.min.divideBy(tileSize)._floor(),
      bounds.max.divideBy(tileSize)._floor()
    );

    const tilesInScreen = [];

    for (let j = roundedTileBounds.min.y, end = roundedTileBounds.max.y, asc = roundedTileBounds.min.y <= end; asc ? j <= end : j >= end; asc ? j++ : j--) {
      var asc1, end1;
      for (i = roundedTileBounds.min.x, end1 = roundedTileBounds.max.x, asc1 = roundedTileBounds.min.x <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
        tilesInScreen.push(new L.Point(i, j));
      }
    }

    // We will use the exact bound values to test if sub tiles are still inside these bounds.
    // The idea is to avoid caching images outside the screen.
    const tileBounds = L.bounds(
      bounds.min.divideBy(tileSize),
      bounds.max.divideBy(tileSize)
    );
    const minY = tileBounds.min.y;
    const maxY = tileBounds.max.y;
    const minX = tileBounds.min.x;
    const maxX = tileBounds.max.x;

    const arrayLength = tilesInScreen.length;
    for (i = 0, end2 = arrayLength, asc2 = 0 <= end2; asc2 ? i < end2 : i > end2; asc2 ? i++ : i--) {
      var point = tilesInScreen[i];
      var {
        x
      } = point;
      var {
        y
      } = point;
      this._getZoomedInTiles(x, y, startingZoom, zoomLevelLimit, tileImagesToQuery, minY, maxY, minX, maxX);
      this._getZoomedOutTiles(x, y, startingZoom, 0, tileImagesToQuery, minY, maxY, minX, maxX);
    }

    return tileImagesToQuery;
  }

  // saves the tiles currently on screen + lower and higher zoom levels.
  saveTiles(zoomLevelLimit, onStarted, onSuccess, onError) {
    this._alreadyReportedErrorForThisActions = false;

    if(!this._tileImagesStore) {
      this._reportError("NO_DB", "No DB available");
      onError("No DB available");
      return;
    }

    if(this.isBusy()) {
      this._reportError("SYSTEM_BUSY", "system is busy.");
      onError("system is busy.");
      return;
    }

    if (this._map.getZoom() < this._minZoomLevel) {
      this._reportError("ZOOM_LEVEL_TOO_LOW");
      onError("ZOOM_LEVEL_TOO_LOW");
      return;
    }

    //lock UI
    const tileImagesToQuery = this._getTileImages(zoomLevelLimit);
    return this._tileImagesStore.saveImages(tileImagesToQuery, onStarted, onSuccess, error => {
      this._reportError("SAVING_TILES", error);
      return onError(error);
    });
  }

  // returns all the tiles with higher zoom levels
  _getZoomedInTiles(x, y, currentZ, maxZ, tileImagesToQuery, minY, maxY, minX, maxX) {
    this._getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX, true);

    if (currentZ < maxZ) {
      // getting the 4 tile under the current tile
      minY *= 2;
      maxY *= 2;
      minX *= 2;
      maxX *= 2;
      this._getZoomedInTiles(x * 2, y * 2, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
      this._getZoomedInTiles((x * 2) + 1, y * 2, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
      this._getZoomedInTiles(x * 2, (y * 2) + 1, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
      return this._getZoomedInTiles((x * 2) + 1, (y * 2) + 1, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
    }
  }

  // returns all the tiles with lower zoom levels
  _getZoomedOutTiles(x, y, currentZ, finalZ, tileImagesToQuery, minY, maxY, minX, maxX) {
    this._getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX, false);

    if (currentZ > finalZ) {
      minY /= 2;
      maxY /= 2;
      minX /= 2;
      maxX /= 2;
      // getting the zoomed out tile containing this tile
      return this._getZoomedOutTiles(Math.floor(x / 2), Math.floor(y / 2), currentZ - 1, finalZ, tileImagesToQuery,
        minY, maxY, minX, maxX);
    }
  }

  _getTileImage(x, y, z, tileImagesToQuery, minY, maxY, minX, maxX) {
    // is the tile outside the bounds?
    if ((x < Math.floor(minX)) || (x > Math.floor(maxX)) || (y < Math.floor(minY)) || (y > Math.floor(maxY))) {
      return;
    }

    // At this point, we only add the image to a "dictionary"
    // This is being done to avoid multiple requests when zooming out, since zooming int should never overlap
    const key = this._createTileKey(x, y, z);
    if(!tileImagesToQuery[key]) {
      return tileImagesToQuery[key] = {key, x, y, z};
    }
  }

  _createNormalizedTilePoint(x, y, z) {
    const nbTilesAtZoomLevel = Math.pow(2, z);

    while(x > nbTilesAtZoomLevel) {
      x -= nbTilesAtZoomLevel;
    }
    while(x < 0) {
      x += nbTilesAtZoomLevel;
    }

    while(y > nbTilesAtZoomLevel) {
      y -= nbTilesAtZoomLevel;
    }
    while(y < 0) {
      y += nbTilesAtZoomLevel;
    }

    return {x, y, z};
  }

  _createURL(x, y, z) {
    const tilePoint = this._createNormalizedTilePoint(x, y, z);
    return this.getTileUrl(tilePoint);
  }

  _createTileKey(x, y, z) {
    const tilePoint = this._createNormalizedTilePoint(x, y, z);
    return tilePoint.x + ", " + tilePoint.y + ", " + tilePoint.z;
  }

  // Override
  // The parent one does not care about the z parameter being passed
  getTileUrl(coords) {
    const data = {
      r: L.Browser.retina ? '@2x' : '',
      s: this._getSubdomain(coords),
      x: coords.x,
      y: coords.y,
      z: coords.z || this._getZoomForUrl()
    };

    if (this._map && !this._map.options.crs.infinite) {
      const invertedY = this._globalTileRange.max.y - coords.y;
      if (this.options.tms) {
        data['y'] = invertedY;
      }
      
      data['-y'] = invertedY;
    }
    
    return L.Util.template(this._url, L.extend(data, this.options));
  }
}

export default OfflineLayer


