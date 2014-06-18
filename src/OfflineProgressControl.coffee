# That control is part of the demo and is there to show how to handle the various callbacks and events of
# the OfflineLayer

module.exports = class OfflineProgressControl extends L.Control

  onAdd: (map) ->
    controls = L.DomUtil.create('div', 'offlinemap-controls', @_container)
    controls.setAttribute('id', 'offlinemap-controls')

    @_counter = L.DomUtil.create('div', 'offlinemap-controls-counter', controls)
    @_counter.setAttribute('id', 'offlinemap-controls-counter')
    @_counter.innerHTML = "Ready"

    @_cancelButton = L.DomUtil.create('input', 'offlinemap-controls-cancel-button', controls)
    @_cancelButton.setAttribute('type', "button")
    @_cancelButton.setAttribute('id', "cancelBtn")
    @_cancelButton.setAttribute('value', "Cancel")
    @_cancelButton.setAttribute('disabled', true)

    L.DomEvent.addListener(@_cancelButton, 'click', @onCancelClick, this)
    L.DomEvent.disableClickPropagation(@_cancelButton)

    return controls

  onProgressStart: () ->
    # Tiles will get downloaded and probably cached while we are still looking at the result from the DB
    # To avoid any weird display, we set _evaluating to false and display nothing until the total nb tiles
    # is known.
    @_evaluating = true
    @_counter.innerHTML = "..."
    @_cancelButton.removeAttribute('disabled')

  onProgressDone: () ->
    @_counter.innerHTML = "Ready"
    @_cancelButton.removeAttribute('disabled')

  updateTotalNbTilesLeftToSave: (event) ->
    @_evaluating = false
    @_nbTilesToSave = event.nbTiles
    @updateNbTilesLeftToSave(event)

  updateNbTilesLeftToSave: (event) ->
    if !@_evaluating
      if @_nbTilesToSave == 0
        @_counter.innerHTML = "100%"
      else
        @_counter.innerHTML = Math.floor((@_nbTilesToSave - event.nbTiles) / @_nbTilesToSave * 100) + "%"

  onCancelClick: () ->
    if @_offlineLayer.cancel()
      @_counter.innerHTML = "Canceling..."
      @_cancelButton.setAttribute('disabled', true)

  setOfflineLayer: (offlineLayer) ->
    @_offlineLayer = offlineLayer
    @_offlineLayer.on('tilecachingstart', @onProgressStart, this)
    @_offlineLayer.on('tilecachingprogressstart', @updateTotalNbTilesLeftToSave, this)
    @_offlineLayer.on('tilecachingprogress', @updateNbTilesLeftToSave, this)
    @_offlineLayer.on('tilecachingprogressdone', @onProgressDone, this)
