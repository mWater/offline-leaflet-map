assert = require("chai").assert
expect = require("chai").expect

nothing = ->
  null

checkKey = (dataStorage, key, done) ->
  dataStorage.get(key,
  (image) ->
    assert.isDefined(image);
    assert.property(image, 'image')
    assert.equal(image.image, key)
    done()
  ,
  (error) ->
    assert.fail()
  )

module.exports = ->
  describe "DataStorage", ->
    it "can save an entry and retrieve it", (done) ->
      @dataStorage.clear(() =>
        key = "1:2:3"
        data = {image: key}
        onSaveSuccess = () =>
          checkKey(@dataStorage, key, done)

        @dataStorage.put(key, data, onSaveSuccess, () =>
          assert.fail()
        )
      )

    it "can save 2 entries and retrieve one", (done) ->
      @dataStorage.clear(() =>
        keyA = "a"
        dataA = {image: keyA}

        keyB = "b"
        dataB = {image: keyB}

        nbSaved = 0
        onSaveSuccess = () =>
          nbSaved++
          if nbSaved == 2
            checkKey(@dataStorage, keyA, done)

        @dataStorage.put(keyA, dataA, onSaveSuccess, () =>
          assert.fail()
        )

        @dataStorage.put(keyB, dataB, onSaveSuccess, () =>
          assert.fail()
        )
      )

    it "can clear all entries", (done) ->
      @dataStorage.clear(() =>
        key = "1:2:3"
        data = {image: key}
        onSaveSuccess = () =>
          @dataStorage.clear(() =>
            @dataStorage.get(key,
            (image) =>
              assert.isUndefined(image)
              done()
            ,
            (error) =>
              assert.fail()
            )
          )

        @dataStorage.put(key, data, onSaveSuccess, () =>
          assert.fail()
        )
      )

    # The dense meaning that the response array will have the same length and same ordering as the
    # array of key queried with a null value if the key wasn't matched
    it "can get a dense batch", (done) ->
      @dataStorage.clear(() =>
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
            @dataStorage.getDenseBatch(keys,
            (images) =>
              assert.equal(images.length, keys.length)
              assert.equal(images[0], undefined)
              assert.equal(images[1].image, keyA)
              assert.equal(images[2], undefined)
              assert.equal(images[3].image, keyB)
              assert.equal(images[4].image, keyC)
              assert.equal(images[5], undefined)
              done()
            ,
            (error) =>
              assert.fail()
            )

        @dataStorage.put(keyA, dataA, onSaveSuccess, () =>
          assert.fail()
        )
        @dataStorage.put(keyB, dataB, onSaveSuccess, () =>
          assert.fail()
        )
        @dataStorage.put(keyC, dataC, onSaveSuccess, () =>
          assert.fail()
        )
      )
