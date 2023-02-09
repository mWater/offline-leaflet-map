import { DataStorage, DataStorageErrorCallback, SuccessCallback } from './types';
declare class WebSQLDataStorage implements DataStorage {
    private _storeName;
    private _webSQLDB;
    private _webSqlErrorHandler;
    constructor(storeName: string, onReady: () => void, onError: DataStorageErrorCallback);
    initSqlite(onReady: () => void, onError: DataStorageErrorCallback): void;
    get(key: string, onSuccess: SuccessCallback, onError: DataStorageErrorCallback): void;
    clear(onSuccess: SuccessCallback, onError: DataStorageErrorCallback): void;
    put(key: string, object: any, onSuccess: SuccessCallback, onError: DataStorageErrorCallback): void;
    getDenseBatch(tileImagesToQueryArray: any[], onSuccess: SuccessCallback, onError: DataStorageErrorCallback): void;
}
export default WebSQLDataStorage;
