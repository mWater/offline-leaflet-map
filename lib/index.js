var queue = require('queue-async');
var IDBStore = require('idb-wrapper');

OfflineLayer = L.TileLayer.extend({
    initialize: function (url, options) {
        L.TileLayer.prototype.initialize.call(this, url, options);

        this._onReady = options["onReady"];
        this._onError = options["onError"];
        var storeName = options["storeName"] || 'OfflineLeafletTileImages';

        this._hasBeenCanceled = false;
        this._nbTilesLeftToSave = 0;
        this._nbTilesWithError = 0;

        // Create the DB store and then call the this._onReady callback
        this._tileImagesStore = new IDBStore({
            dbVersion: 1,
            storeName: storeName,
            keyPath: null,
            autoIncrement: false
        }, this._onReady);
    },

    _setUpTile: function (tile, key, value) {
        // Start loading the tile with either the cached tile image or the result of getTileUrl
        tile.src = value;
        this.fire('tileloadstart', {
            tile: tile,
            url: tile.src
        });
    },

    _loadTile: function (tile, tilePoint) {
        // Reproducing TileLayer._loadTile behavior, but the tile.src will be set later
        tile._layer = this;
        tile.onerror = this._tileOnError;
        this._adjustTilePoint(tilePoint);
        tile.onload = this._tileOnLoad;
        // Done reproducing _loadTile

        var self = this;
        var onSuccess = function(dbEntry){
            if(dbEntry){
                // if the tile has been cached, use the stored Base64 value
                self._setUpTile(tile, key, dbEntry.image);
            }
            else{
                // query the map provider for the tile
                self._setUpTile(tile, key, self.getTileUrl(tilePoint));
            }
        }

        var onError = function() {
            // Error while getting the key from the DB
            // will get the tile from the map provider
            self._setUpTile(tile, key, this.getTileUrl(tilePoint));
            if(self._onError){
                self._onError();
            }
        }

        var key = this._createTileKey(tilePoint.x, tilePoint.y, tilePoint.z);
        // Look for the tile in the DB
        this._tileImagesStore.get(key, onSuccess, onError);
    },

    // called when the total number of tiles is known
    _updateTotalNbImagesLeftToSave: function(nbTiles){
        this._nbTilesLeftToSave = nbTiles;
        this.fire('tilecachingprogressstart', {nbTiles: this._nbTilesLeftToSave});
    },

    // called each time a tile as been handled
    _decrementNbTilesLeftToSave: function(){
        this._nbTilesLeftToSave--;
        this.fire('tilecachingprogress', {nbTiles:this._nbTilesLeftToSave});
    },

    _incrementNbTilesWithError: function(){
        //Not used for now...
        this._nbTilesWithError++;
    },

    cancel: function(){
        // no reason to cancel if it's not doing anything
        if(this._myQueue){
            this._hasBeenCanceled = true;
            return true;
        }
        return false;
    },

    clearTiles: function(){
        this._tileImagesStore.clear();
    },

    // calculateNbTiles includes potentially already saved tiles.
    calculateNbTiles: function(){
        var count = 0;
        var tileImagesToQuery = this._getTileImages();
        for(var key in tileImagesToQuery){
            count++;
        }
        return count;
    },

    isBusy: function(){
        return this._myQueue || this._hasBeenCanceled;
    },

    // Returns the tiles currently displayed
    // this._tiles could return tiles that are currently loaded but not displayed
    // that is why the tiles are recalculated here.
    _getTileImages: function(){
        var tileImagesToQuery = {};

        var map = this._map;
        var startingZoom = map.getZoom();
        var maxZoom = map.getMaxZoom();

        var bounds = map.getPixelBounds();
        var tileSize = this._getTileSize();

        // bounds are rounded down since a tile cover all the pixels from it's rounded down value until the next tile
        var roundedTileBounds = L.bounds(
            bounds.min.divideBy(tileSize)._floor(),
            bounds.max.divideBy(tileSize)._floor());

        var tilesInScreen = [];
        var j, i;

        for (j = roundedTileBounds.min.y; j <= roundedTileBounds.max.y; j++) {
            for (i = roundedTileBounds.min.x; i <= roundedTileBounds.max.x; i++) {
                tilesInScreen.push(new L.Point(i, j));
            }
        }

        // We will use the exact bound values to test if sub tiles are still inside these bounds.
        // The idea is to avoid caching images outside the screen.
        var tileBounds = L.bounds(
            bounds.min.divideBy(tileSize),
            bounds.max.divideBy(tileSize));
        var minY = tileBounds.min.y;
        var maxY = tileBounds.max.y;
        var minX = tileBounds.min.x;
        var maxX = tileBounds.max.x;

        var arrayLength = tilesInScreen.length;
        for (var i = 0; i < arrayLength; i++){
            var point = tilesInScreen[i];
            var x = point.x;
            var y = point.y;
            this._getZoomedInTiles(x, y, startingZoom, maxZoom, tileImagesToQuery, minY, maxY, minX, maxX);
            this._getZoomedOutTiles(x, y, startingZoom, 0, tileImagesToQuery, minY, maxY, minX, maxX);
        }

        return tileImagesToQuery;
    },

    // saves the tiles currently on screen + lower and higher zoom levels.
    saveTiles: function(){
        if(this.isBusy()){
            alert("system is busy.");
            return;
        }

        this._hasBeenCanceled = false;

        var tileImagesToQuery = this._getTileImages();

        var tileImagesToQueryArray = [];
        for(var key in tileImagesToQuery){
            tileImagesToQueryArray.push(key);
        }

        var self = this;
        // Query all the needed tiles from the DB
        this._tileImagesStore.getBatch(tileImagesToQueryArray, function(items){
            // will be loading and saving a maximum of 8 tiles at a time
            self._myQueue = queue(8);
            var i = 0;
            self.fire('tilecachingstart', null);

            self._nbTilesLeftToSave = 0;
            items.forEach(function (item){
                if(!item){
                    // that tile image is not present in the DB
                    var key = tileImagesToQueryArray[i];
                    var tileInfo = tileImagesToQuery[key];

                    self._nbTilesLeftToSave++;

                    // that call will load the image from the map provider
                    var makingAjaxCall = function(url, callback, error, queueCallback){
                        if(self._hasBeenCanceled){
                            queueCallback();
                            return;
                        }

                        ajax(url, callback, error, queueCallback);
                    }

                    // when the image is received, it is stored inside the DB using Base64 format
                    var gettingImage = function (response) {
                        self._tileImagesStore.put(key, {"image": arrayBufferToBase64ImagePNG(response)});
                        self._decrementNbTilesLeftToSave();
                    }

                    var errorGettingImage = function (){
                        self._incrementNbTilesWithError();
                        self._decrementNbTilesLeftToSave();
                        if(this._onError){
                            this._onError();
                        }
                    };

                    // using queue-async to limit the number of simultaneous ajax calls
                    self._myQueue.defer(makingAjaxCall, self._createURL(tileInfo.x, tileInfo.y, tileInfo.z),
                                        gettingImage, errorGettingImage);
                }

                i++;
            });

            self._updateTotalNbImagesLeftToSave(self._nbTilesLeftToSave);

            // wait for all tiles to be saved or found in the DB
            self._myQueue.awaitAll(function(error, data) {
                self._hasBeenCanceled = false;
                self._myQueue = null;
                self.fire('tilecachingprogressdone', null);
            });
        }, this._onBatchQueryError, 'dense' /* using dense returns undefined for each entry not present in the DB */);
    },

    _getZoomedInTiles: function(x, y, currentZ, maxZ, tileImagesToQuery, minY, maxY, minX, maxX){
        this._getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX, true);

        if(currentZ < maxZ){
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
    },

    _getZoomedOutTiles: function(x, y, currentZ, finalZ, tileImagesToQuery, minY, maxY, minX, maxX){
        this._getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX, false);

        if(currentZ > finalZ){
            minY /= 2;
            maxY /= 2;
            minX /= 2;
            maxX /= 2;
            // getting the zoomed out tile containing this tile
            this._getZoomedOutTiles(Math.floor(x / 2), Math.floor(y / 2), currentZ - 1, finalZ, tileImagesToQuery,
                                    minY, maxY, minX, maxX);
        }
    },

    _getTileImage: function(x, y, z, tileImagesToQuery, minY, maxY, minX, maxX){
        // is the tile outside the bounds?
        if(x < Math.floor(minX) || x > Math.floor(maxX) || y < Math.floor(minY) || y > Math.floor(maxY)){
            return;
        }

        // At this point, we only add the image to a "dictionary"
        // This is being done to avoid multiple requests when zooming out, since zooming int should never overlap
        var key = this._createTileKey(x, y, z);
        if(!tileImagesToQuery[key]){
            tileImagesToQuery[key] = {key:key, x: x, y: y, z: z};
        }
    },

    _onBatchQueryError: function(){
        if(this._onError){
            this._onError();
        }
    },

    _createNormalizedTilePoint: function(x, y, z){
        var nbTilesAtZoomLevel = Math.pow(2, z);

        while(x > nbTilesAtZoomLevel){
            x -= nbTilesAtZoomLevel;
        }
        while(x < 0){
            x += nbTilesAtZoomLevel;
        }

        while(y > nbTilesAtZoomLevel){
            y -= nbTilesAtZoomLevel;
        }
        while(y < 0){
            y += nbTilesAtZoomLevel;
        }
        return {x: x, y: y, z: z};
    },

    _createURL: function(x, y, z){
        var tilePoint = this._createNormalizedTilePoint(x, y, z);

        return this.getTileUrl(tilePoint);
    },

    _createTileKey: function(x, y, z){
        var tilePoint = this._createNormalizedTilePoint(x, y, z);

        return tilePoint.x + ", " + tilePoint.y + ", " + tilePoint.z;
    }
});
module.exports.OfflineLayer = OfflineLayer;

OfflineProgressControl = L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        var controls = L.DomUtil.create('div', 'offlinemap-controls', this._container);
        controls.setAttribute('id', 'offlinemap-controls');

        this._counter = L.DomUtil.create('div', 'offlinemap-controls-counter', controls);
        this._counter.setAttribute('id', 'offlinemap-controls-counter');
        this._counter.innerHTML = "Ready";

        var cancelButton = L.DomUtil.create('input', 'offlinemap-controls-cancel-button', controls);
        cancelButton.setAttribute('type', "button");
        cancelButton.setAttribute('id', "cancelBtn");
        cancelButton.setAttribute('value', "Cancel");

        L.DomEvent.addListener(cancelButton, 'click', this.onCancelClick, this);
        L.DomEvent.disableClickPropagation(cancelButton);

        return controls;
    },

    onProgressStart: function(){
        // Tiles will get downloaded and probably cached while we are still looking at the result from the DB
        // To avoid any weird display, we set _evaluating to false and display nothing until the total nb tiles
        // is known.
        this._evaluating = true;
        this._counter.innerHTML = "...";
    },

    onProgressDone: function(){
        this._counter.innerHTML = "Ready";
    },

    updateTotalNbTilesLeftToSave: function (event){
        this._evaluating = false;
        this._nbTilesToSave = event.nbTiles;
        this.updateNbTilesLeftToSave(event);
    },

    updateNbTilesLeftToSave: function (event){
        if(!this._evaluating){
            if(this._nbTilesToSave == 0){
                this._counter.innerHTML = "100%";
            }
            else{
                this._counter.innerHTML = Math.floor((this._nbTilesToSave - event.nbTiles) / this._nbTilesToSave * 100) + "%";
            }
        }
    },

    onCancelClick: function (){
        if(this._offlineLayer.cancel()){
            this._counter.innerHTML = "Canceling...";
        };
    },

    setOfflineLayer: function (offlineLayer){
        this._offlineLayer = offlineLayer;
        this._offlineLayer.on('tilecachingstart', this.onProgressStart, this);
        this._offlineLayer.on('tilecachingprogressstart', this.updateTotalNbTilesLeftToSave, this);
        this._offlineLayer.on('tilecachingprogress', this.updateNbTilesLeftToSave, this);
        this._offlineLayer.on('tilecachingprogressdone', this.onProgressDone, this);

    }
});
module.exports.OfflineProgressControl = OfflineProgressControl;

// The following code was taken from https://github.com/tbicr/OfflineMap
// under the MIT License (MIT)
/*
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
 */

function ajax(url, callback, error, queueCallback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(err) {
        if (this.status == 200) {
            callback(this.response);
        }
        else{
            error();
        }
        queueCallback();
    };
    xhr.send();
}

/*
 Probably btoa can work incorrect, you can override btoa with next example:
 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding#Solution_.232_.E2.80.93_rewriting_atob%28%29_and_btoa%28%29_using_TypedArrays_and_UTF-8
 */
function arrayBufferToBase64ImagePNG(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    for (var i = 0, l = bytes.byteLength; i < l; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return 'data:image/png;base64,' + btoa(binary);
}
