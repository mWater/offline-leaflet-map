"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const leaflet_1 = require("leaflet");
const OfflineLayer_1 = __importDefault(require("./OfflineLayer"));
const OfflineProgressControl_1 = __importDefault(require("./OfflineProgressControl"));
const mapquestUrl = 'http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';
const tileUrl = "https://api.maptiler.com/maps/openstreetmap/256/{z}/{x}/{y}.jpg?key=fpCi57s6GSjpKnuWdkYn";
const subDomains = ['otile1', 'otile2', 'otile3', 'otile4'];
const mapquestAttrib = 'Data, imagery and map information provided by <a href="http://open.mapquest.co.uk" target="_blank">MapQuest</a>, <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> and contributors.';
// An example of control that can be used for saving tiles
class CacheBtnControl extends leaflet_1.Control {
    onAdd(map) {
        const controls = leaflet_1.DomUtil.create('div', 'control-button', this._container);
        this.cacheButton = leaflet_1.DomUtil.create('input', 'cache-button', controls);
        this.cacheButton.setAttribute('type', "button");
        this.cacheButton.setAttribute('id', "Btn1");
        this.cacheButton.setAttribute('value', "Cache");
        leaflet_1.DomEvent.addListener(this.cacheButton, 'click', this.onCacheClick, this);
        leaflet_1.DomEvent.disableClickPropagation(this.cacheButton);
        this.cacheTo17Button = leaflet_1.DomUtil.create('input', 'cache-up-to-button', controls);
        this.cacheTo17Button.setAttribute('type', "button");
        this.cacheTo17Button.setAttribute('id', "Btn1");
        this.cacheTo17Button.setAttribute('value', "Cache up to 17");
        leaflet_1.DomEvent.addListener(this.cacheTo17Button, 'click', this.onCacheUpToClick, this);
        leaflet_1.DomEvent.disableClickPropagation(this.cacheTo17Button);
        this.clearButton = leaflet_1.DomUtil.create('input', 'offlinemap-controls-clear-button', controls);
        this.clearButton.setAttribute('type', "button");
        this.clearButton.setAttribute('id', "clearBtn");
        this.clearButton.setAttribute('value', "Clear DB");
        leaflet_1.DomEvent.addListener(this.clearButton, 'click', this.onClearClick, this);
        leaflet_1.DomEvent.disableClickPropagation(this.clearButton);
        return controls;
    }
    onClearClick() {
        this._setBusyState();
        return offlineLayer.clearTiles(() => {
            return this._setIdleState();
        }, error => {
            return this._setIdleState();
        });
    }
    onCacheClick() {
        // Might be a good idea to put a limit on the number of tiles that can would be saved
        // calculateNbTiles includes potentially already saved tiles.
        const nbTiles = offlineLayer.calculateNbTiles();
        if (nbTiles === -1) {
            return;
        }
        if (nbTiles < 10000) {
            console.log("Will be saving: " + nbTiles + " tiles");
            this._setBusyState();
            return offlineLayer.saveTiles(17, () => {
                return null;
            }, () => {
                return this._setIdleState();
            }, error => {
                console.log(error);
                return this._setIdleState();
            });
        }
        else {
            return alert("You are trying to save " + nbTiles + " tiles. There is currently a limit of 10,000 tiles.");
        }
    }
    onCacheUpToClick() {
        const nbTiles = offlineLayer.calculateNbTiles(17);
        if (nbTiles < 10000) {
            console.log("Will be saving: " + nbTiles + " tiles");
            this._setBusyState();
            return offlineLayer.saveTiles(17, () => {
                return null;
            }, () => {
                return this._setIdleState();
            }, error => {
                console.log(error);
                return this._setIdleState();
            });
        }
        else {
            return alert("You are trying to save " + nbTiles + " tiles. There is currently a limit of 10,000 tiles.");
        }
    }
    _setBusyState() {
        this.cacheTo17Button.setAttribute('disabled', true);
        this.cacheButton.setAttribute('disabled', true);
        return this.clearButton.setAttribute('disabled', true);
    }
    _setIdleState() {
        this.cacheTo17Button.removeAttribute('disabled');
        this.cacheButton.removeAttribute('disabled');
        return this.clearButton.removeAttribute('disabled');
    }
}
const aMap = (0, leaflet_1.map)('main').setView([-2.9, -79], 13);
const onReady = function () {
    console.log(offlineLayer);
    console.log("The OfflineLayer is ready to be used");
    offlineLayer.addTo(aMap);
    const cacheBtn = new CacheBtnControl();
    aMap.addControl(cacheBtn);
    const progressControls = new OfflineProgressControl_1.default();
    progressControls.setOfflineLayer(offlineLayer);
    aMap.addControl(progressControls);
};
const onError = function (errorType, errorData1, errorData2) {
    console.log(errorType);
    console.log(errorData1);
    console.log(errorData2);
};
const options = { maxZoom: 18, attribution: mapquestAttrib, subdomains: subDomains, onReady, onError, storeName: "myStoreName", dbOption: "WebSQL" };
var offlineLayer = new OfflineLayer_1.default(tileUrl, options);
const someStyle = `
<style>
        #main { height: 720px; }
        #offlinemap-controls {background-color:#b0c4de; }
        #offlinemap-controls-counter {margin-left:auto; margin-right:auto; width:70%;}
    </style>
`;
document.head.insertAdjacentHTML('beforeend', someStyle);
document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/leaflet.min.css" integrity="sha512-KJRB1wUfcipHY35z9dEE+Jqd+pGCuQ2JMZmQPAjwPjXuzz9oL1pZm2cd79vyUgHQxvb9sFQ6f05DIz0IqcG1Jw==" crossorigin="anonymous" referrerpolicy="no-referrer" />`);
