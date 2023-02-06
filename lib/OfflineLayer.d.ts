import { TileLayer, TileLayerOptions } from 'leaflet';
import { ErrorCallback, SuccessCallback } from './types';
type OfflineLayerOptions = {
    onReady: () => void;
    onError: (code: string, message?: Error, message1?: string) => void;
    dbOption: string;
    storeName?: string;
} & TileLayerOptions;
declare class OfflineLayer extends TileLayer {
    private _alreadyReportedErrorForThisActions;
    private _onReady;
    private _onError;
    private _tileImagesStore;
    private _minZoomLevel;
    constructor(urlTemplate: string, options: OfflineLayerOptions);
    _setUpTile(tile: any, key: string, value: string): this;
    _reportError(errorType: string, errorData?: any): void;
    _loadTile(tile: any, tilePoint: any): any;
    useDB(): boolean;
    cancel(): boolean;
    clearTiles(onSuccess: SuccessCallback, onError: ErrorCallback): void;
    calculateNbTiles(zoomLevelLimit: number): number;
    isBusy(): boolean;
    _getTileImages(zoomLevelLimit: number): {};
    saveTiles(zoomLevelLimit: any, onStarted: any, onSuccess: any, onError: any): void;
    _getZoomedInTiles(x: any, y: any, currentZ: any, maxZ: any, tileImagesToQuery: any, minY: any, maxY: any, minX: any, maxX: any): any;
    _getZoomedOutTiles(x: any, y: any, currentZ: any, finalZ: any, tileImagesToQuery: any, minY: any, maxY: any, minX: any, maxX: any): any;
    _getTileImage(x: any, y: any, z: any, tileImagesToQuery: any, minY: any, maxY: any, minX: any, maxX: any): {
        key: string;
        x: any;
        y: any;
        z: any;
    } | undefined;
    _createNormalizedTilePoint(x: any, y: any, z: any): {
        x: any;
        y: any;
        z: any;
    };
    _createURL(x: any, y: any, z: any): string;
    _createTileKey(x: any, y: any, z: any): string;
    getTileUrl(coords: any): string;
}
export default OfflineLayer;
