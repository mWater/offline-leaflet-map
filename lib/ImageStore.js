"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_1 = __importDefault(require("async"));
const IndexedDBDataStorage_1 = __importDefault(require("./IndexedDBDataStorage"));
const WebSQLDataStorage_1 = __importDefault(require("./WebSQLDataStorage"));
// Saves and stores images using either Web SQL or IndexedDB
// Uses an async queue and can be canceled
// Will emit events while the saving of images is in progress
class ImageStore {
    constructor(eventEmitter, imageRetriever) {
        if (imageRetriever == null) {
            throw new Error('the image store needs an imageRetriever');
        }
        if (eventEmitter == null) {
            throw new Error('the image store needs an eventEmitter');
        }
        this._eventEmitter = eventEmitter;
        this._nbTilesLeftToSave = 0;
        this._nbImagesCurrentlyBeingRetrieved = 0;
        this._imageRetriever = imageRetriever;
        this._myQueue = null;
        this._beingCanceled = false;
        this._running = false;
    }
    createDB(storeName, onReady, onError, useWebSQL) {
        const _useWebSQL = useWebSQL;
        if (onReady == null) {
            throw new Error('This async function needs a callback');
        }
        if (!_useWebSQL) {
            return (this.storage = new IndexedDBDataStorage_1.default(storeName, onReady, onError));
        }
        else {
            return (this.storage = new WebSQLDataStorage_1.default(storeName, onReady, onError));
        }
    }
    cancel() {
        if (!this._running) {
            return false;
        }
        if (this._beingCanceled) {
            return true;
        }
        this._beingCanceled = true;
        if (this._myQueue != null) {
            this._myQueue.kill();
            if (this._nbImagesCurrentlyBeingRetrieved === 0) {
                this._finish(null);
            }
            return true;
        }
        return false;
    }
    isBusy() {
        return this._running;
    }
    get(key, onSuccess, onError) {
        if (onSuccess == null || onError == null) {
            throw new Error('This async function needs callbacks');
        }
        return this.storage.get(key, onSuccess, onError);
    }
    clear(onSuccess, onError) {
        if (onSuccess == null || onError == null) {
            throw new Error('This async function needs callbacks');
        }
        return this.storage.clear(onSuccess, onError);
    }
    _finish(error, onError) {
        this._running = false;
        this._beingCanceled = false;
        this._eventEmitter.fire('tilecachingprogressdone', null);
        this._myQueue = null;
        this._nbImagesCurrentlyBeingRetrieved = 0;
        if (error && error !== null && onError) {
            onError(error);
        }
        else {
            this._onSaveImagesSuccess && this._onSaveImagesSuccess();
        }
    }
    saveImages(tileImagesToQuery, onStarted, onSuccess, onError) {
        this._running = true;
        if (this._myQueue != null) {
            throw new Error('Not allowed to save images while saving is already in progress');
        }
        if (onStarted == null || onSuccess == null || onError == null) {
            throw new Error('This async function needs callbacks');
        }
        this._onSaveImagesSuccess = onSuccess;
        this._getImagesNotInDB(tileImagesToQuery, (tileInfoOfImagesNotInDB) => {
            if (!this._beingCanceled && tileInfoOfImagesNotInDB != null && tileInfoOfImagesNotInDB.length > 0) {
                const MAX_NB_IMAGES_RETRIEVED_SIMULTANEOUSLY = 8;
                this._myQueue = async_1.default.queue((data, callback) => {
                    this._saveTile(data, callback);
                }, MAX_NB_IMAGES_RETRIEVED_SIMULTANEOUSLY);
                this._myQueue.drain(this._finish);
                for (var data of Array.from(tileInfoOfImagesNotInDB)) {
                    this._myQueue.push(data);
                }
                onStarted();
            }
            else {
                //nothing to do
                onStarted();
                this._finish();
            }
        }, onError);
    }
    _getImagesNotInDB(tileImagesToQuery, callback, onError) {
        const tileImagesToQueryArray = [];
        for (var imageKey in tileImagesToQuery) {
            tileImagesToQueryArray.push(imageKey);
        }
        // Query all the needed tiles from the DB
        this.storage.getDenseBatch(tileImagesToQueryArray, (tileImages) => {
            let i = 0;
            const tileInfoOfImagesNotInDB = [];
            this._eventEmitter.fire('tilecachingstart', null);
            this._nbTilesLeftToSave = 0;
            const testTile = (tileImage) => {
                if (!tileImage) {
                    // that tile image is not present in the DB
                    const key = tileImagesToQueryArray[i];
                    const tileInfo = tileImagesToQuery[key];
                    this._nbTilesLeftToSave++;
                    tileInfoOfImagesNotInDB.push({ key, tileInfo });
                }
                i++;
            };
            for (var tileImage of Array.from(tileImages)) {
                testTile(tileImage);
            }
            this._updateTotalNbImagesLeftToSave(this._nbTilesLeftToSave);
            callback(tileInfoOfImagesNotInDB);
        }, (error) => onError(error));
    }
    _saveTile(data, callback) {
        // when the image is received, it is stored inside the DB using Base64 format
        const gettingImage = (response) => {
            this.storage.put(data.key, { image: response }, () => {
                this._decrementNbTilesLeftToSave();
                callback();
            }, (error) => {
                this._decrementNbTilesLeftToSave();
                callback(error);
            });
        };
        const errorGettingImage = (errorType, errorData) => {
            this._decrementNbTilesLeftToSave();
            this._eventEmitter._reportError(errorType, { data: errorData, tileInfo: data.tileInfo });
            callback(new Error(`${errorType} - ${JSON.stringify(errorData)}`));
        };
        this._nbImagesCurrentlyBeingRetrieved++;
        this._imageRetriever.retrieveImage(data.tileInfo, gettingImage, errorGettingImage);
    }
    // called when the total number of tiles is known
    _updateTotalNbImagesLeftToSave(nbTiles) {
        this._nbTilesLeftToSave = nbTiles;
        this._eventEmitter.fire('tilecachingprogressstart', { nbTiles: this._nbTilesLeftToSave });
    }
    // called each time a tile as been handled
    _decrementNbTilesLeftToSave() {
        this._nbTilesLeftToSave--;
        if (!this._beingCanceled) {
            this._eventEmitter.fire('tilecachingprogress', { nbTiles: this._nbTilesLeftToSave });
        }
        // I need to do this so the ImageStore only call finish when everything is done canceling
        this._nbImagesCurrentlyBeingRetrieved--;
        if (this._beingCanceled && this._nbImagesCurrentlyBeingRetrieved === 0) {
            this._finish();
        }
    }
}
exports.default = ImageStore;
