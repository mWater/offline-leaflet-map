"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const leaflet_1 = require("leaflet");
class OfflineProgressControl extends leaflet_1.Control {
    onAdd(map) {
        const controls = leaflet_1.DomUtil.create('div', 'offlinemap-controls', this.getContainer());
        controls.setAttribute('id', 'offlinemap-controls');
        this._counter = leaflet_1.DomUtil.create('div', 'offlinemap-controls-counter', controls);
        this._counter.setAttribute('id', 'offlinemap-controls-counter');
        this._counter.innerHTML = 'Ready';
        this._cancelButton = leaflet_1.DomUtil.create('input', 'offlinemap-controls-cancel-button', controls);
        this._cancelButton.setAttribute('type', 'button');
        this._cancelButton.setAttribute('id', 'cancelBtn');
        this._cancelButton.setAttribute('value', 'Cancel');
        this._cancelButton.disabled = true;
        leaflet_1.DomEvent.addListener(this._cancelButton, 'click', this.onCancelClick, this);
        leaflet_1.DomEvent.disableClickPropagation(this._cancelButton);
        return controls;
    }
    onProgressStart() {
        // Tiles will get downloaded and probably cached while we are still looking at the result from the DB
        // To avoid any weird display, we set _evaluating to false and display nothing until the total nb tiles
        // is known.
        this._evaluating = true;
        this._counter.innerHTML = '...';
        this._cancelButton.removeAttribute('disabled');
    }
    onProgressDone() {
        this._counter.innerHTML = 'Ready';
        this._cancelButton.removeAttribute('disabled');
    }
    updateTotalNbTilesLeftToSave(event) {
        this._evaluating = false;
        this._nbTilesToSave = event.nbTiles;
        this.updateNbTilesLeftToSave(event);
    }
    updateNbTilesLeftToSave(event) {
        if (!this._evaluating) {
            if (this._nbTilesToSave === 0) {
                this._counter.innerHTML = '100%';
            }
            else {
                this._counter.innerHTML = Math.floor(((this._nbTilesToSave - event.nbTiles) / this._nbTilesToSave) * 100) + '%';
            }
        }
    }
    onCancelClick() {
        if (this._offlineLayer.cancel()) {
            this._counter.innerHTML = 'Canceling...';
            this._cancelButton.disabled = true;
        }
    }
    setOfflineLayer(offlineLayer) {
        this._offlineLayer = offlineLayer;
        this._offlineLayer.on('tilecachingstart', this.onProgressStart, this);
        this._offlineLayer.on('tilecachingprogressstart', this.updateTotalNbTilesLeftToSave, this);
        this._offlineLayer.on('tilecachingprogress', this.updateNbTilesLeftToSave, this);
        this._offlineLayer.on('tilecachingprogressdone', this.onProgressDone, this);
    }
}
exports.default = OfflineProgressControl;
