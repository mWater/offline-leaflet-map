import L from 'leaflet';
import { ErrorCallback, SuccessCallback } from './types';
type OfflineLayerOptions = {
    onReady: () => void;
    onError: (code: string, message?: any) => void;
    dbOption: string;
    storeName?: string;
} & L.TileLayerOptions;
export type TileImageInfo = {
    [key: string]: {
        key: string;
        x: number;
        y: number;
        z: number;
    };
};
declare class OfflineLayer extends L.TileLayer {
    private _alreadyReportedErrorForThisActions;
    private _onReady;
    private _onError;
    private _tileImagesStore;
    private _minZoomLevel;
    constructor(urlTemplate: string, options: OfflineLayerOptions);
    protected createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement;
    _setUpTile(tile: any, key: string, value: string): this;
    _reportError(errorType: string, errorData?: any): void;
    useDB(): boolean;
    cancel(): boolean;
    clearTiles(onSuccess: SuccessCallback, onError: ErrorCallback): void;
    calculateNbTiles(zoomLevelLimit: number): number;
    isBusy(): boolean;
    _getTileImages(zoomLevelLimit: number): TileImageInfo;
    saveTiles(zoomLevelLimit: number, onStarted: () => void, onSuccess: () => void, onError: ErrorCallback): void;
    _getZoomedInTiles(x: number, y: number, currentZ: number, maxZ: number, tileImagesToQuery: TileImageInfo, minY: number, maxY: number, minX: number, maxX: number): void;
    _getZoomedOutTiles(x: number, y: number, currentZ: number, finalZ: number, tileImagesToQuery: TileImageInfo, minY: number, maxY: number, minX: number, maxX: number): void;
    _getTileImage(x: number, y: number, z: number, tileImagesToQuery: TileImageInfo, minY: number, maxY: number, minX: number, maxX: number): void;
    _createNormalizedTilePoint(x: number, y: number, z: number): {
        x: number;
        y: number;
        z: number;
    };
    _createURL(x: number, y: number, z: number): string;
    _createTileKey(x: number, y: number, z: number): string;
    getTileUrl(coords: L.Coords): string;
}
export default OfflineLayer;
