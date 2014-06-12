assert = require("chai").assert
expect = require("chai").expect

IndexedDBDataStorage = require '../src/IndexedDBDataStorage'

nothing = ->
  null

checkKey = (indexedDBDataStorage, key, done) ->
  indexedDBDataStorage.get(key,
  (image) ->
    assert.isDefined(image);
    assert.property(image, 'image')
    assert.equal(image.image, key)
    done()
  ,
  (error) ->
    assert.fail()
  )

describe "IndexedDBDataStorage", ->
  it "is constructed with a storeName and a onReady callback", (done) ->
    new IndexedDBDataStorage("test", () ->
      done()
    )

  it "can save an entry and retrieve it", (done) ->
    onReady = () =>
      indexedDBDataStorage.clear(() ->
        key = "1:2:3"
        data = {image: key}
        onSaveSuccess = () =>
          checkKey(indexedDBDataStorage, key, done)

        indexedDBDataStorage.put(key, data, onSaveSuccess, () =>
          assert.fail()
        )
      )

    indexedDBDataStorage = new IndexedDBDataStorage("test", onReady)

  it "can save 2 entries and retrieve one", (done) ->
    onReady = () =>
      indexedDBDataStorage.clear(() ->
        keyA = "a"
        dataA = {image: keyA}

        keyB = "b"
        dataB = {image: keyB}

        nbSaved = 0
        onSaveSuccess = () =>
          nbSaved++
          if nbSaved == 2
            checkKey(indexedDBDataStorage, keyA, done)

        indexedDBDataStorage.put(keyA, dataA, onSaveSuccess, () =>
          assert.fail()
        )

        indexedDBDataStorage.put(keyB, dataB, onSaveSuccess, () =>
          assert.fail()
        )
      )

    indexedDBDataStorage = new IndexedDBDataStorage("test", onReady)

  it "can clear all entries", (done) ->
    onReady = () =>
      indexedDBDataStorage.clear(() =>
        key = "1:2:3"
        data = {image: key}
        onSaveSuccess = () =>
          indexedDBDataStorage.clear(() =>
            indexedDBDataStorage.get(key,
              (image) =>
                assert.isUndefined(image)
                done()
              ,
              (error) =>
                assert.fail()
            )
          )

        indexedDBDataStorage.put(key, data, onSaveSuccess, () =>
          assert.fail()
        )
      )

    indexedDBDataStorage = new IndexedDBDataStorage("test", onReady)

  # The dense meaning that the response array will have the same length and same ordering as the
  # array of key queried with a null value if the key wasn't matched
  it "can get a dense batch", (done) ->
    onReady = () =>
      indexedDBDataStorage.clear(() =>
        keyA = "1:2:3"
        keyB = "4:5:6"
        keyC = "7:8:9"
        dataA = {image: keyA}
        dataB = {image: keyB}
        dataC = {image: keyC}
        keys = ["been", keyA, "wrong", keyB, keyC, "twice"]
        nbSaved = 0
        onSaveSuccess = () =>
          nbSaved++

          if nbSaved == 3
            indexedDBDataStorage.getDenseBatch(keys,
              (images) =>
                console.log(images)
                assert.equal(images.length, keys.length)
                assert.equal(images[0], undefined )
                assert.equal(images[1].image, keyA)
                assert.equal(images[2], undefined )
                assert.equal(images[3].image, keyB)
                assert.equal(images[4].image, keyC)
                assert.equal(images[5], undefined )
                done()
              ,
              (error) =>
                assert.fail()
            )

        indexedDBDataStorage.put(keyA, dataA, onSaveSuccess, () =>
          assert.fail()
        )
        indexedDBDataStorage.put(keyB, dataB, onSaveSuccess, () =>
          assert.fail()
        )
        indexedDBDataStorage.put(keyC, dataC, onSaveSuccess, () =>
          assert.fail()
        )
      )

    indexedDBDataStorage = new IndexedDBDataStorage("test", onReady)
