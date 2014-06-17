var CacheBtnControl, ImageStore, OfflineLayer, OfflineProgressControl, aMap, mapquestAttrib, mapquestUrl, offlineLayer, onError, onReady, options, subDomains,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

ImageStore = require('./ImageStore');

OfflineLayer = require('./OfflineLayer');

OfflineProgressControl = require('./OfflineProgressControl');

mapquestUrl = 'http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';

subDomains = ['otile1', 'otile2', 'otile3', 'otile4'];

mapquestAttrib = 'Data, imagery and map information provided by <a href="http://open.mapquest.co.uk" target="_blank">MapQuest</a>, <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> and contributors.';

CacheBtnControl = (function(_super) {
  __extends(CacheBtnControl, _super);

  function CacheBtnControl() {
    return CacheBtnControl.__super__.constructor.apply(this, arguments);
  }

  CacheBtnControl.prototype.onAdd = function(map) {
    var controls;
    controls = L.DomUtil.create('div', 'control-button', this._container);
    this.cacheButton = L.DomUtil.create('input', 'cache-button', controls);
    this.cacheButton.setAttribute('type', "button");
    this.cacheButton.setAttribute('id', "Btn1");
    this.cacheButton.setAttribute('value', "Cache");
    L.DomEvent.addListener(this.cacheButton, 'click', this.onCacheClick, this);
    L.DomEvent.disableClickPropagation(this.cacheButton);
    this.cacheTo17Button = L.DomUtil.create('input', 'cache-up-to-button', controls);
    this.cacheTo17Button.setAttribute('type', "button");
    this.cacheTo17Button.setAttribute('id', "Btn1");
    this.cacheTo17Button.setAttribute('value', "Cache up to 17");
    L.DomEvent.addListener(this.cacheTo17Button, 'click', this.onCacheUpToClick, this);
    L.DomEvent.disableClickPropagation(this.cacheTo17Button);
    this.clearButton = L.DomUtil.create('input', 'offlinemap-controls-clear-button', controls);
    this.clearButton.setAttribute('type', "button");
    this.clearButton.setAttribute('id', "clearBtn");
    this.clearButton.setAttribute('value', "Clear DB");
    L.DomEvent.addListener(this.clearButton, 'click', this.onClearClick, this);
    L.DomEvent.disableClickPropagation(this.clearButton);
    return controls;
  };

  CacheBtnControl.prototype.onClearClick = function() {
    this._setBusyState();
    return offlineLayer.clearTiles((function(_this) {
      return function() {
        return _this._setIdleState();
      };
    })(this), (function(_this) {
      return function(error) {
        return _this._setIdleState();
      };
    })(this));
  };

  CacheBtnControl.prototype.onCacheClick = function() {
    var nbTiles;
    nbTiles = offlineLayer.calculateNbTiles();
    if (nbTiles < 10000) {
      console.log("Will be saving: " + nbTiles + " tiles");
      this._setBusyState();
      return offlineLayer.saveTiles(17, (function(_this) {
        return function() {
          return null;
        };
      })(this), (function(_this) {
        return function() {
          return _this._setIdleState();
        };
      })(this), (function(_this) {
        return function() {
          return _this._setIdleState();
        };
      })(this));
    } else {
      return alert("You are trying to save " + nbTiles + " tiles. There is currently a limit of 10,000 tiles.");
    }
  };

  CacheBtnControl.prototype.onCacheUpToClick = function() {
    var nbTiles;
    nbTiles = offlineLayer.calculateNbTiles(17);
    if (nbTiles < 10000) {
      console.log("Will be saving: " + nbTiles + " tiles");
      this._setBusyState();
      return offlineLayer.saveTiles(17, (function(_this) {
        return function() {
          return null;
        };
      })(this), (function(_this) {
        return function() {
          return _this._setIdleState();
        };
      })(this), (function(_this) {
        return function() {
          return _this._setIdleState();
        };
      })(this));
    } else {
      return alert("You are trying to save " + nbTiles + " tiles. There is currently a limit of 10,000 tiles.");
    }
  };

  CacheBtnControl.prototype._setBusyState = function() {
    this.cacheTo17Button.setAttribute('disabled', true);
    this.cacheButton.setAttribute('disabled', true);
    return this.clearButton.setAttribute('disabled', true);
  };

  CacheBtnControl.prototype._setIdleState = function() {
    this.cacheTo17Button.removeAttribute('disabled');
    this.cacheButton.removeAttribute('disabled');
    return this.clearButton.removeAttribute('disabled');
  };

  return CacheBtnControl;

})(L.Control);

aMap = L.map('map').setView([-2.9, -79], 13);

onReady = function() {
  var cacheBtn, progressControls;
  console.log("The OfflineLayer is ready to be used");
  offlineLayer.addTo(aMap);
  cacheBtn = new CacheBtnControl();
  aMap.addControl(cacheBtn);
  progressControls = new OfflineProgressControl();
  progressControls.setOfflineLayer(offlineLayer);
  return aMap.addControl(progressControls);
};

onError = function(errorType, errorData1, errorData2) {
  console.log(errorType);
  console.log(errorData1);
  return console.log(errorData2);
};

options = {
  maxZoom: 18,
  attribution: mapquestAttrib,
  subdomains: subDomains,
  onReady: onReady,
  onError: onError,
  storeName: "myStoreName",
  dbOption: "WebSQL"
};

offlineLayer = new OfflineLayer(mapquestUrl, options);
