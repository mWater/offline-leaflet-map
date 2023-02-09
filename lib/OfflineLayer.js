"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ImageStore_1 = __importDefault(require("./ImageStore"));
const ImageRetriever_1 = __importDefault(require("./ImageRetriever"));
const leaflet_1 = __importDefault(require("leaflet"));
class OfflineLayer extends leaflet_1.default.TileLayer {
    constructor(urlTemplate, options) {
        super(urlTemplate, options);
        this._alreadyReportedErrorForThisActions = false;
        this._onReady = options['onReady'];
        this._onError = options['onError'];
        const dbOption = options['dbOption'];
        const storeName = options['storeName'] || 'OfflineLeafletTileImages';
        this._tileImagesStore = null;
        this._minZoomLevel = 12;
        if (options['minZoomLevel'] != null) {
            this._minZoomLevel = parseInt(options['minZoomLevel']);
        }
        if (dbOption != null && dbOption !== 'None') {
            try {
                let useWebSQL;
                if (dbOption === 'WebSQL') {
                    useWebSQL = true;
                }
                else if (dbOption === 'IndexedDB') {
                    useWebSQL = false;
                }
                else {
                    this._onError('COULD_NOT_CREATE_DB', 'Invalid dbOption parameter: ' + dbOption);
                    return;
                }
                // Create the DB store and then call the @_onReady callback
                const imageRetriever = new ImageRetriever_1.default(this);
                this._tileImagesStore = new ImageStore_1.default(this, imageRetriever);
                this._tileImagesStore.createDB(storeName, () => {
                    this._onReady();
                }, (error) => {
                    this._tileImagesStore = null;
                    this._reportError('COULD_NOT_CREATE_DB', error);
                    setTimeout(() => {
                        this._onReady();
                    }, 0);
                }, useWebSQL);
            }
            catch (err) {
                this._tileImagesStore = null;
                this._reportError('COULD_NOT_CREATE_DB', err);
                setTimeout(() => {
                    this._onReady();
                }, 0);
            }
        }
        else {
            setTimeout(() => {
                this._onReady();
            }, 0);
        }
    }
    createTile(coords, done) {
        if (!this._tileImagesStore) {
            return super.createTile(coords, done);
        }
        const tile = document.createElement('img');
        leaflet_1.default.DomEvent.on(tile, 'load', leaflet_1.default.Util.bind(this._tileOnLoad, this, done, tile));
        leaflet_1.default.DomEvent.on(tile, 'error', leaflet_1.default.Util.bind(this._tileOnError, this, done, tile));
        if (this.options.crossOrigin || this.options.crossOrigin === '') {
            tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
        }
        tile.alt = '';
        tile.setAttribute('role', 'presentation');
        const onSuccess = (dbEntry) => {
            if (dbEntry) {
                // if the tile has been cached, use the stored Base64 value
                this._setUpTile(tile, key, dbEntry.image);
            }
            else {
                // query the map provider for the tile
                this._setUpTile(tile, key, this.getTileUrl(coords));
            }
        };
        const onError = () => {
            // Error while getting the key from the DB
            // will get the tile from the map provider
            this._setUpTile(tile, key, this.getTileUrl(coords));
            this._reportError('DB_GET', key);
        };
        var key = this._createTileKey(coords.x, coords.y, coords.z);
        this._tileImagesStore.get(key, onSuccess, onError);
        // this.setDataUrl(coords)
        //   .then((dataurl: string) => (tile.src = dataurl))
        //   .catch(() => (tile.src = this.getTileUrl(coords)));
        return tile;
    }
    // look at the code from L.TileLayer for more details
    _setUpTile(tile, key, value) {
        // Start loading the tile with either the cached tile image or the result of getTileUrl
        tile.src = value;
        return this.fire('tileloadstart', {
            tile,
            url: tile.src,
        });
    }
    _reportError(errorType, errorData) {
        if (this._onError) {
            if (!this._alreadyReportedErrorForThisActions) {
                this._alreadyReportedErrorForThisActions = true;
                this._onError(errorType, errorData);
            }
        }
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
    clearTiles(onSuccess, onError) {
        var _a;
        if (!this.useDB()) {
            this._reportError('NO_DB', 'No DB available');
            onError('No DB available');
            return;
        }
        if (this.isBusy()) {
            this._reportError('SYSTEM_BUSY', 'System is busy.');
            onError('System is busy.');
            return;
        }
        (_a = this._tileImagesStore) === null || _a === void 0 ? void 0 : _a.clear(onSuccess, (error) => {
            this._reportError('COULD_NOT_CLEAR_DB', error);
            onError(error);
        });
    }
    // calculateNbTiles includes potentially already saved tiles.
    calculateNbTiles(zoomLevelLimit) {
        if (this._map.getZoom() < this._minZoomLevel) {
            this._reportError('ZOOM_LEVEL_TOO_LOW');
            return -1;
        }
        let count = 0;
        const tileImagesToQuery = this._getTileImages(zoomLevelLimit);
        for (var key in tileImagesToQuery) {
            count++;
        }
        return count;
    }
    isBusy() {
        if (this._tileImagesStore != null) {
            return this._tileImagesStore.isBusy();
        }
        return false;
    }
    // Returns the tiles currently displayed
    // @_tiles could return tiles that are currently loaded but not displayed
    // that is why the tiles are recalculated here.
    _getTileImages(zoomLevelLimit) {
        let i;
        let asc2, end2;
        zoomLevelLimit = zoomLevelLimit || this._map.getMaxZoom();
        const tileImagesToQuery = {};
        const map = this._map;
        const startingZoom = Math.min(map.getZoom(), zoomLevelLimit);
        const bounds = map.getPixelBounds();
        const tileSize = this.getTileSize().x;
        // bounds are rounded down since a tile cover all the pixels from it's rounded down value until the next tile
        const roundedTileBounds = leaflet_1.default.bounds(bounds.min.divideBy(tileSize).floor(), bounds.max.divideBy(tileSize).floor());
        const tilesInScreen = [];
        for (let j = roundedTileBounds.min.y, end = roundedTileBounds.max.y, asc = roundedTileBounds.min.y <= end; asc ? j <= end : j >= end; asc ? j++ : j--) {
            var asc1, end1;
            for (i = roundedTileBounds.min.x, end1 = roundedTileBounds.max.x, asc1 = roundedTileBounds.min.x <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
                tilesInScreen.push(new leaflet_1.default.Point(i, j));
            }
        }
        // We will use the exact bound values to test if sub tiles are still inside these bounds.
        // The idea is to avoid caching images outside the screen.
        const tileBounds = leaflet_1.default.bounds(bounds.min.divideBy(tileSize), bounds.max.divideBy(tileSize));
        const minY = tileBounds.min.y;
        const maxY = tileBounds.max.y;
        const minX = tileBounds.min.x;
        const maxX = tileBounds.max.x;
        const arrayLength = tilesInScreen.length;
        for (i = 0, end2 = arrayLength, asc2 = 0 <= end2; asc2 ? i < end2 : i > end2; asc2 ? i++ : i--) {
            var point = tilesInScreen[i];
            var { x } = point;
            var { y } = point;
            this._getZoomedInTiles(x, y, startingZoom, zoomLevelLimit, tileImagesToQuery, minY, maxY, minX, maxX);
            this._getZoomedOutTiles(x, y, startingZoom, 0, tileImagesToQuery, minY, maxY, minX, maxX);
        }
        return tileImagesToQuery;
    }
    // saves the tiles currently on screen + lower and higher zoom levels.
    saveTiles(zoomLevelLimit, onStarted, onSuccess, onError) {
        this._alreadyReportedErrorForThisActions = false;
        if (!this._tileImagesStore) {
            this._reportError('NO_DB', 'No DB available');
            onError(new Error('No DB available'));
            return;
        }
        if (this.isBusy()) {
            this._reportError('SYSTEM_BUSY', 'system is busy.');
            onError(new Error('system is busy.'));
            return;
        }
        if (this._map.getZoom() < this._minZoomLevel) {
            this._reportError('ZOOM_LEVEL_TOO_LOW');
            onError(new Error('ZOOM_LEVEL_TOO_LOW'));
            return;
        }
        //lock UI
        const tileImagesToQuery = this._getTileImages(zoomLevelLimit);
        this._tileImagesStore.saveImages(tileImagesToQuery, onStarted, onSuccess, (error) => {
            this._reportError('SAVING_TILES', error);
            onError(error);
        });
    }
    // returns all the tiles with higher zoom levels
    _getZoomedInTiles(x, y, currentZ, maxZ, tileImagesToQuery, minY, maxY, minX, maxX) {
        this._getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX);
        if (currentZ < maxZ) {
            // getting the 4 tile under the current tile
            minY *= 2;
            maxY *= 2;
            minX *= 2;
            maxX *= 2;
            this._getZoomedInTiles(x * 2, y * 2, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
            this._getZoomedInTiles(x * 2 + 1, y * 2, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
            this._getZoomedInTiles(x * 2, y * 2 + 1, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
            this._getZoomedInTiles(x * 2 + 1, y * 2 + 1, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
        }
    }
    // returns all the tiles with lower zoom levels
    _getZoomedOutTiles(x, y, currentZ, finalZ, tileImagesToQuery, minY, maxY, minX, maxX) {
        this._getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX);
        if (currentZ > finalZ) {
            minY /= 2;
            maxY /= 2;
            minX /= 2;
            maxX /= 2;
            // getting the zoomed out tile containing this tile
            this._getZoomedOutTiles(Math.floor(x / 2), Math.floor(y / 2), currentZ - 1, finalZ, tileImagesToQuery, minY, maxY, minX, maxX);
        }
    }
    _getTileImage(x, y, z, tileImagesToQuery, minY, maxY, minX, maxX) {
        // is the tile outside the bounds?
        if (x < Math.floor(minX) || x > Math.floor(maxX) || y < Math.floor(minY) || y > Math.floor(maxY)) {
            return;
        }
        // At this point, we only add the image to a "dictionary"
        // This is being done to avoid multiple requests when zooming out, since zooming int should never overlap
        const key = this._createTileKey(x, y, z);
        if (!tileImagesToQuery[key]) {
            tileImagesToQuery[key] = { key, x, y, z };
        }
    }
    _createNormalizedTilePoint(x, y, z) {
        const nbTilesAtZoomLevel = Math.pow(2, z);
        while (x > nbTilesAtZoomLevel) {
            x -= nbTilesAtZoomLevel;
        }
        while (x < 0) {
            x += nbTilesAtZoomLevel;
        }
        while (y > nbTilesAtZoomLevel) {
            y -= nbTilesAtZoomLevel;
        }
        while (y < 0) {
            y += nbTilesAtZoomLevel;
        }
        return { x, y, z };
    }
    _createURL(x, y, z) {
        const tilePoint = this._createNormalizedTilePoint(x, y, z);
        return this.getTileUrl(tilePoint);
    }
    _createTileKey(x, y, z) {
        const tilePoint = this._createNormalizedTilePoint(x, y, z);
        return tilePoint.x + ', ' + tilePoint.y + ', ' + tilePoint.z;
    }
    // Override
    // The parent one does not care about the z parameter being passed
    getTileUrl(coords) {
        const data = {
            r: leaflet_1.default.Browser.retina ? '@2x' : '',
            s: this._getSubdomain(coords),
            x: coords.x,
            y: coords.y,
            z: coords.z || this._getZoomForUrl(),
        };
        if (this._map && !this._map.options.crs.infinite) {
            const invertedY = this._globalTileRange.max.y - coords.y;
            if (this.options.tms) {
                data['y'] = invertedY;
            }
            data['-y'] = invertedY;
        }
        return leaflet_1.default.Util.template(this._url, leaflet_1.default.extend(data, this.options));
    }
}
exports.default = OfflineLayer;
