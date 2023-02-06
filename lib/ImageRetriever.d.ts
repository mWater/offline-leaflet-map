import OfflineLayer from './OfflineLayer';
import { TileInfo } from './types';
declare class ImageRetriever {
    private offlineLayer;
    constructor(offlineLayer: OfflineLayer);
    retrieveImage(tileInfo: TileInfo, callback: XMLHttpRequest['response'], error: (code: string, err: any) => void): void;
}
export default ImageRetriever;
