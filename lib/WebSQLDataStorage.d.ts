import { DataStorage, ErrorCallback, SuccessCallback } from "./types";
declare class WebSQLDataStorage implements DataStorage {
    private _storeName;
    private _webSQLDB;
    private _webSqlErrorHandler;
    constructor(storeName: string, onReady: () => void, onError: ErrorCallback);
    initSqlite(onReady: () => void, onError: ErrorCallback): void;
    get(key: string, onSuccess: SuccessCallback, onError: ErrorCallback): void;
    clear(onSuccess: SuccessCallback, onError: ErrorCallback): void;
    put(key: string, object: any, onSuccess: SuccessCallback, onError: ErrorCallback): void;
    getDenseBatch(tileImagesToQueryArray: any[], onSuccess: SuccessCallback, onError: ErrorCallback): void;
}
export default WebSQLDataStorage;
