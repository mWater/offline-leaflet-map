offline-leaflet-map
============

**offline-leaflet-map** makes it possible to save portions of leaflet maps and consult them offline.
It uses either **IndexedDB** or **Web SQL** to store the images.

##OfflineLayer
The OfflineLayer inherits the leaflet TileLayer. If no dbOption is specified, it will behave like a basic TileLayer.

**Initialization:**

It is initialized the same way, using url and options but it has extra options:

* **onReady:** All db operations are asynch, onReady will be called when the DB is ready and tile images can be
     retrieved.
* **dbOption:** Can choose storage by setting to "WebSQL" or "IndexedDB". "None" or null will not use any DB.
* onError(optional): Will be called if anything goes wrong with (errorType, errorData), more details in Errors section.
* storeName(optional): If you ever need to change the default storeName: "OfflineLeafletTileImages".

**Methods:**

* **saveTiles(zoomLevelLimit, onStarted, onSuccess, onError):** saves all the tiles currently present in the screen
                + all tiles under these (bigger zoom)
                + all tiles containing the tiles (smaller zoom)
                The idea is to make it possible to zoom in but also to locate your saved data from a lower zoom level
                when working offline. **zoomLevelLimit** will limit the zoom depth.

* **calculateNbTiles(zoomLevelLimit):** An important function that will tell you how many tiles would be saved by a call to saveTiles.
                    Make sure to call this function and limit any call to saveTiles() if you want to avoid saving
                    millions of tiles. **zoomLevelLimit** will limit the zoom depth.

* **isBusy():**   It is currently not possible to call saveTiles or clearTiles if OfflineLayer is busy saving tiles.

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

##Error callback:

When calling the onError callback, the parameters are (errorType, errorData)

**new OfflineLayer errors:**

* **"COULD\_NOT\_CREATE\_DB":** An error has been thrown when creating the DB (calling new IDBStore internally).
errorData is the error thrown by the IDBStore.
* **"NO\_DB":** Calling clearTiles() or saveTiles() will doing nothing but call the error callback if there is no DB.
This could happen if these functions are called before the onReady callback or if the DB could not be initialized
(previous error).
* **"COULD\_NOT\_CREATE\_DB":** Could not create DB.


**saveTiles() errors:**
* **"SYSTEM\_BUSY":** System is busy.
* **"SAVING\_TILES":** An error occurred when calling saveTiles.
* **"DB\_GET":** An error occurred when calling get on ImageStore. errorData is the DB key of the tile.
* **"GET\_STATUS\_ERROR":** The XMLHttpRequest Get status is not equal to 200. errorData contains the error from XMLHttpRequest and the URL of the image.
* **"NETWORK\_ERROR":** The XMLHttpRequest used to get an image threw an error. errorData contains the error from XMLHttpRequest and the URL of the image.

**clearTiles() errors:**
* **"SYSTEM\_BUSY":** System is busy.
* **"COULD\_NOT\_CLEAR\_DB":** Could not clear DB.



##Example

Look at **src/demo.coffee** for a complete example of how to use OfflineLayer and a basic progression control example.