offline-leaflet-map
============

**offline-leaflet-map** makes it possible to save portions of leaflet maps and consult them offline.
It uses either **IndexedDB** by default or Web SQL to store the images if you set the option.

##OfflineLayer
The OfflineLayer inherits the leaflet TileLayer.

**Initialization:**

It is initialized the same way, using url and options but it has extra options:

* **onReady:** All IndexedDb operations are asynch, onReady will be called when the DB is ready and tile images can be
     retrieved.
* onError(optional): Will be called if anything goes wrong with (errorType, errorData), more details in Errors section.
* storeName(optional): If you ever need to change the default storeName: "OfflineLeafletTileImages".
* useWebSQL(optional): Will use WebSQL instead of IndexedDB to store the images.

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

##Error callback:

When calling the onError callback, the parameters are (errorType, errorData1, errorData2)

**new OfflineLayer errors:**

* **"COULD\_NOT\_CREATE\_DB":** An error has been thrown when creating the DB (calling new IDBStore internally).
ErrorData1 is the error thrown by the IDBStore.
* **"NO\_DB":** Calling clearTiles() or saveTiles() will doing nothing but call the error callback if there is no DB.
This could happen if these functions are called before the onReady callback or if the DB could not be initialized
(previous error).


**saveTiles() errors:**

* **"COULD\_NOT\_CREATE\_DB":** Could not create DB.
* **"COULD\_NOT\_CLEAR\_DB":** Could not clear DB.
* **"SYSTEM\_BUSY":** System is busy.
* **"SAVING\_TILES":** An error occurred when calling saveTiles.
* **"DB\_GET":** An error occurred when calling get on ImageStore. ErrorData1 is the DB key of the tile.
* **"GET\_STATUS\_ERROR":** The XMLHttpRequest Get status is not equal to 200. ErrorData1 is the error from XMLHttpRequest.
ErrorData2 is the URL of the image.
* **"NETWORK\_ERROR":** The XMLHttpRequest used to get an image threw an error. ErrorData1 is the error from XMLHttpRequest.
ErrorData2 is the URL of the image.




##Example

Look at **demo/index.html** for a complete example of how to use OfflineLayer and a basic progression control example.