var OfflineProgressControl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = OfflineProgressControl = (function(_super) {
  __extends(OfflineProgressControl, _super);

  function OfflineProgressControl() {
    return OfflineProgressControl.__super__.constructor.apply(this, arguments);
  }

  OfflineProgressControl.prototype.onAdd = function(map) {
    var cancelButton, controls;
    controls = L.DomUtil.create('div', 'offlinemap-controls', this._container);
    controls.setAttribute('id', 'offlinemap-controls');
    this._counter = L.DomUtil.create('div', 'offlinemap-controls-counter', controls);
    this._counter.setAttribute('id', 'offlinemap-controls-counter');
    this._counter.innerHTML = "Ready";
    cancelButton = L.DomUtil.create('input', 'offlinemap-controls-cancel-button', controls);
    cancelButton.setAttribute('type', "button");
    cancelButton.setAttribute('id', "cancelBtn");
    cancelButton.setAttribute('value', "Cancel");
    L.DomEvent.addListener(cancelButton, 'click', this.onCancelClick, this);
    L.DomEvent.disableClickPropagation(cancelButton);
    return controls;
  };

  OfflineProgressControl.prototype.onProgressStart = function() {
    this._evaluating = true;
    return this._counter.innerHTML = "...";
  };

  OfflineProgressControl.prototype.onProgressDone = function() {
    return this._counter.innerHTML = "Ready";
  };

  OfflineProgressControl.prototype.updateTotalNbTilesLeftToSave = function(event) {
    this._evaluating = false;
    this._nbTilesToSave = event.nbTiles;
    return this.updateNbTilesLeftToSave(event);
  };

  OfflineProgressControl.prototype.updateNbTilesLeftToSave = function(event) {
    if (!this._evaluating) {
      if (this._nbTilesToSave === 0) {
        return this._counter.innerHTML = "100%";
      } else {
        return this._counter.innerHTML = Math.floor((this._nbTilesToSave - event.nbTiles) / this._nbTilesToSave * 100) + "%";
      }
    }
  };

  OfflineProgressControl.prototype.onCancelClick = function() {
    if (this._offlineLayer.cancel()) {
      return this._counter.innerHTML = "Canceling...";
    }
  };

  OfflineProgressControl.prototype.setOfflineLayer = function(offlineLayer) {
    this._offlineLayer = offlineLayer;
    this._offlineLayer.on('tilecachingstart', this.onProgressStart, this);
    this._offlineLayer.on('tilecachingprogressstart', this.updateTotalNbTilesLeftToSave, this);
    this._offlineLayer.on('tilecachingprogress', this.updateNbTilesLeftToSave, this);
    return this._offlineLayer.on('tilecachingprogressdone', this.onProgressDone, this);
  };

  return OfflineProgressControl;

})(L.Control);
