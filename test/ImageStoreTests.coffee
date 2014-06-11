assert = require("chai").assert
expect = require("chai").expect

ImageStore = require '../src/ImageStore'
FakeEventEmitter = require './FakeEventEmitter'
FakeImageRetriever = require './FakeImageRetriever'
BrokenImageRetriever = require './BrokenImageRetriever'

imageStore = null

checkKey = (key, done) ->
  imageStore.get(key,
  (image) ->
    assert.isDefined(image);
    assert.property(image, 'image')
    assert.equal(image.image, key)
    done()
  ,
  (error) ->
    assert.fail()
  )

doNothing = () ->
  null

describe "ImageStore", ->

  beforeEach((done) ->
    fakeEventEmitter = new FakeEventEmitter()
    fakeImageRetriever = new FakeImageRetriever()
    imageStore = new ImageStore(fakeEventEmitter, fakeImageRetriever)
    clear = () ->
      imageStore.clear(
        () ->
          done()
        ,
        () ->
          assert(false, "Not possible to clean the DB.")
          done()
      )
    imageStore.createDB("test", clear)
  )

  it "is constructed with an EventEmitter and an ImageRetriever", ->
    return null

  it "it can save an entry and retrieve it", (done) ->
    key = "1:2:3"
    imagesToSave = {}
    imagesToSave[key] = key

    onSaveSuccess = () =>
      checkKey(key, done)

    imageStore.saveImages(imagesToSave, doNothing, onSaveSuccess, () =>
      assert.fail()
    )


  it "can clear the entries", (done) ->
    key = "1:2:3"
    imagesToSave = {}
    imagesToSave[key] = key

    onClearSuccess = () =>
      imageStore.get(key,
      (image) ->
        assert.isUndefined(image);
        done()
      ,
      (error) ->
        assert.fail()
      )

    onSaveSuccess = () =>
      imageStore.clear(onClearSuccess, () =>
        assert.fail()
      )


    imageStore.saveImages(imagesToSave, doNothing, onSaveSuccess, () =>
      assert.fail()
    )

  it.skip "can be canceled", (done) ->
    # use the BrokenImageRetriever (so nothing is ever retrieved)
    imageStore._imageRetriever = new BrokenImageRetriever()

    key = "1:2:3"
    imagesToSave = {}
    imagesToSave[key] = key

    nbDone = 0
    doneStep = () =>
      nbDone++
      if nbDone == 2
        done()

    onStarted = () =>
      console.log imageStore._myQueue.idle()
      imageStore.cancel()
      console.log imageStore._myQueue.idle()

    onSaveSuccess = () =>
      doneStep()

    imageStore.saveImages(imagesToSave, onStarted, onSaveSuccess, () =>
      assert.fail()
    )

    imageStore.get(key,
      (image) ->
        assert.isUndefined(image);
        doneStep()
      ,
      (error) ->
        assert.fail()
    )

  it "can save multiple entries and retrieve them", (done) ->
    imagesToSave = {}

    keyA = "1:2:3"
    imagesToSave[keyA] = keyA

    keyB = "4:5:6"
    imagesToSave[keyB] = keyB

    keyC = "7:8:9"
    imagesToSave[keyC] = keyC

    nbDone = 0
    doneStep = () =>
      nbDone++
      if nbDone == 3
        done()

    onSaveSuccess = () =>
      checkKey(keyA, doneStep)
      checkKey(keyB, doneStep)
      checkKey(keyC, doneStep)

    imageStore.saveImages(imagesToSave, doNothing, onSaveSuccess, () =>
      assert.fail()
    )

