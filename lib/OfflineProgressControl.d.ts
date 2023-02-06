import { Control } from "leaflet";
declare class OfflineProgressControl extends Control {
    onAdd(map: any): HTMLDivElement;
    onProgressStart(): any;
    onProgressDone(): any;
    updateTotalNbTilesLeftToSave(event: any): string | undefined;
    updateNbTilesLeftToSave(event: any): string | undefined;
    onCancelClick(): any;
    setOfflineLayer(offlineLayer: any): any;
}
export default OfflineProgressControl;
