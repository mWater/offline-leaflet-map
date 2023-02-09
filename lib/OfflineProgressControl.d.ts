import { Control, Map, LeafletEvent } from 'leaflet';
import OfflineLayer from './OfflineLayer';
type ProgressEvent = {
    nbTiles: number;
} & LeafletEvent;
declare class OfflineProgressControl extends Control {
    private _counter;
    private _cancelButton;
    private _evaluating;
    private _nbTilesToSave;
    private _offlineLayer;
    onAdd(map: Map): HTMLDivElement;
    onProgressStart(): void;
    onProgressDone(): void;
    updateTotalNbTilesLeftToSave(event: ProgressEvent): void;
    updateNbTilesLeftToSave(event: ProgressEvent): void;
    onCancelClick(): void;
    setOfflineLayer(offlineLayer: OfflineLayer): void;
}
export default OfflineProgressControl;
