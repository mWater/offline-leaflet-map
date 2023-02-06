import { DataStorage, ErrorCallback, SuccessCallback } from './types';
declare class IndexedDBDataStorage implements DataStorage {
    private _idbStore;
    constructor(storeName: string, onReady: () => void, onError: ErrorCallback);
    get(key: string, onSuccess: SuccessCallback, onError: ErrorCallback): any;
    clear(onSuccess: SuccessCallback, onError: ErrorCallback): any;
    put(key: string, object: any, onSuccess: SuccessCallback, onError: ErrorCallback): any;
    getDenseBatch(tileImagesToQueryArray: any[], onSuccess: SuccessCallback, onError: ErrorCallback): any;
}
export default IndexedDBDataStorage;
