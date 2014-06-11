assert = require("chai").assert
expect = require("chai").expect

WebSQLDataStorage = require '../src/WebSQLDataStorage'

nothing = ->
  null

checkKey = (webSQLDataStorage, key, done) ->
  webSQLDataStorage.get(key,
  (image) ->
    assert.isDefined(image);
    assert.property(image, 'image')
    assert.equal(image.image, key)
    done()
  ,
  (error) ->
    assert.fail()
  )

describe "WebSQLDataStorage", ->
  it "is constructed with a storeName and a onReady callback", (done) ->
    new WebSQLDataStorage("test", () ->
      done()
    )

  it "can save an entry and retrieve it", (done) ->
    onReady = () =>
      webSQLDataStorage.clear(() ->
        key = "1:2:3"
        data = {image: key}
        onSaveSuccess = () =>
          checkKey(webSQLDataStorage, key, done)

        webSQLDataStorage.put(key, data, onSaveSuccess, () =>
          assert.fail()
        )
      )

    webSQLDataStorage = new WebSQLDataStorage("test", onReady)

  it "can save 2 entries and retrieve one", (done) ->
    onReady = () =>
      webSQLDataStorage.clear(() ->
        keyA = "a"
        dataA = {image: keyA}

        keyB = "b"
        dataB = {image: keyB}

        nbSaved = 0
        onSaveSuccess = () =>
          nbSaved++
          if nbSaved == 2
            checkKey(webSQLDataStorage, keyA, done)

        webSQLDataStorage.put(keyA, dataA, onSaveSuccess, () =>
          assert.fail()
        )

        webSQLDataStorage.put(keyB, dataB, onSaveSuccess, () =>
          assert.fail()
        )
      )

    webSQLDataStorage = new WebSQLDataStorage("test", onReady)

  it "can clear all entries", (done) ->
    onReady = () =>
      webSQLDataStorage.clear(() =>
        key = "1:2:3"
        data = {image: key}
        onSaveSuccess = () =>
          webSQLDataStorage.clear(() =>
            webSQLDataStorage.get(key,
              (image) =>
                assert.isNull(image)
                done()
              ,
              (error) =>
                assert.fail()
            )
          )

        webSQLDataStorage.put(key, data, onSaveSuccess, () =>
          assert.fail()
        )
      )

    webSQLDataStorage = new WebSQLDataStorage("test", onReady)

  # The dense meaning that the response array will have the same length and same ordering as the
  # array of key queried with a null value if the key wasn't matched
  it "can get a dense batch", (done) ->
    onReady = () =>
      webSQLDataStorage.clear(() =>
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
            webSQLDataStorage.getDenseBatch(keys,
              (images) =>
                console.log(images)
                assert.equal(images.length, keys.length)
                assert.equal(images[0], null)
                assert.equal(images[1], keyA)
                assert.equal(images[2], null)
                assert.equal(images[3], keyB)
                assert.equal(images[4], keyC)
                assert.equal(images[5], null)
                done()
              ,
              (error) =>
                assert.fail()
            )

        webSQLDataStorage.put(keyA, dataA, onSaveSuccess, () =>
          assert.fail()
        )
        webSQLDataStorage.put(keyB, dataB, onSaveSuccess, () =>
          assert.fail()
        )
        webSQLDataStorage.put(keyC, dataC, onSaveSuccess, () =>
          assert.fail()
        )
      )

    webSQLDataStorage = new WebSQLDataStorage("test", onReady)
