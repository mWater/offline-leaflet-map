export type SuccessCallback = (item: any) => void
export type ErrorCallback = (err: any) => void


export interface DataStorage {
  get: (key: string, onSuccess: SuccessCallback, onError: ErrorCallback) => any;
  clear: (onSuccess: SuccessCallback, onError: ErrorCallback) => void;
  put: (key: string, object: any, onSuccess: SuccessCallback, onError: ErrorCallback) => void;
  getDenseBatch: (tileImagesToQueryArray: any[], onSuccess: SuccessCallback, onError: ErrorCallback) => any;
}

export type TileInfo = {
  x: number
  y: number
  z: number
}