export type SuccessCallback = (item: any) => void
export type ErrorCallback = (err: Error) => void

export type DataStorageErrorCallback = (err: Error) => void

export interface DataStorage {
  get: (key: string, onSuccess: SuccessCallback, onError: DataStorageErrorCallback) => any
  clear: (onSuccess: SuccessCallback, onError: DataStorageErrorCallback) => void
  put: (key: string, object: any, onSuccess: SuccessCallback, onError: DataStorageErrorCallback) => void
  getDenseBatch: (tileImagesToQueryArray: any[], onSuccess: SuccessCallback, onError: DataStorageErrorCallback) => any
}

export type TileInfo = {
  x: number
  y: number
  z: number
}
