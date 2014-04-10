offline-leaflet-map
============

**offline-leaflet-map** makes it possible to save portions of leaflet maps and consult them offline.
It uses **IndexedDB** to store the images using a shim to make it work on the browsers not supporting IndexedDb.

##OfflineLayer
The OfflineLayer inherits the leaflet TileLayer.

**Initialization:**

It is initialized the same way, using url and options but it has 3 extra options:

* **onReady:** All IndexedDb operations are asynch, onReady will be called when the DB is ready and tile images can be
     retrieved.
* onError(optional): Will be called if anything goes wrong.
* storeName(optional): If you ever need to change the default storeName: "OfflineLeafletTileImages".

**Methods:**

* **saveTiles():**    saves all the tiles currently present in the screen
                + all tiles under these (bigger zoom)
                + all tiles containing the tiles (smaller zoom)
                The idea is to make it possible to zoom in but also to locate your saved data from a lower zoom level
                when working offline.

* **calculateNbTiles():** An important function that will tell you how many tiles would be saved by a call to saveTiles.
                    Make sure to call this function and limit any call to saveTiles() if you want to avoid saving
                    millions of tiles.

* **isBusy():**   It is currently not possible to call saveTiles if OfflineLayer is busy saving tiles. Look at the events to
            know when saveTiles is done.

* **cancel():**   This will skip the saving for all the files currently in the queue. You still have to wait for it to be
            done before calling saveTiles again.

* **clearTiles():** Clear the DB store used for storing images.

**Events:**

OfflineLayer fires the following events while saving tiles:

* **'tilecachingstart':**   fired when just starting to save tiles. Until the 'tilecachingprogressstart' is fired, it
                            is not safe to display information about the progression since it's both saving images and
                            going through the DB looking for already present images.
* **'tilecachingprogressstart':** at this point, the total number of images that still need to be saved is known.
* **'tilecachingprogress':** fired after each image is saved.
* **'tilecachingprogressdone':** fired when all images have been saved and the OfflineLayer is ready to save more.

##Example

Look at **demo/index.html** for a complete example of how to use OfflineLayer and a basic progression control example.