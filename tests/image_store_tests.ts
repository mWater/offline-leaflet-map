/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */

import {assert, expect} from 'chai'

import ImageStore from '../src/ImageStore'
import FakeEventEmitter from './FakeEventEmitter'
import FakeImageRetriever from './FakeImageRetriever'
import BrokenImageRetriever from './BrokenImageRetriever'

const doNothing = () => null

interface TestContext extends Mocha.Suite {
  imageStore: ImageStore
}

const doTest = (useWebSQL: boolean) =>
  describe('passes image_store_tests', function (this: TestContext) {
    const checkKey = (key: string, done: Mocha.Done) => {
      this.imageStore.get(
        key,
        (image: any) => {
          assert.isDefined(image)
          assert.property(image, 'image')
          assert.equal(image.image, key)
          done()
        },
        (error: Error) => {
          assert.fail()
        },
      )
    }

    beforeEach((done) => {
      const fakeEventEmitter = new FakeEventEmitter()
      const fakeImageRetriever = new FakeImageRetriever()
      this.imageStore = new ImageStore(fakeEventEmitter, fakeImageRetriever)
      const clear = () => {
        this.imageStore.clear(
          () => {
            done()
          },
          () => {
            assert(false, 'Not possible to clean the DB.')
            done()
          },
        )
      }
      this.imageStore.createDB(
        'test',
        clear,
        function () {
          console.log('ERROR')
          assert.fail()
        },
        useWebSQL,
      )
    })

    it('is constructed with an EventEmitter and an ImageRetriever', () => null)

    it('it can save an entry and retrieve it', (done) => {
      const key = '1:2:3'
      const imagesToSave = {}
      imagesToSave[key] = key

      const onSaveSuccess = () => {
        return checkKey(key, done)
      }

      this.imageStore.saveImages(imagesToSave, doNothing, onSaveSuccess, () => {
        assert.fail()
      })
    })

    it('can clear the entries', (done) => {
      const key = '1:2:3'
      const imagesToSave = {}
      imagesToSave[key] = key

      const onClearSuccess = () => {
        this.imageStore.get(
          key,
          (image: any) => {
            assert.isUndefined(image)
            done()
          },
          (error: Error) => {
            assert.fail()
          },
        )
      }

      const onSaveSuccess = () => {
        this.imageStore.clear(onClearSuccess, () => {
          assert.fail()
        })
      }

      this.imageStore.saveImages(imagesToSave, doNothing, onSaveSuccess, () => {
        assert.fail()
      })
    })

    it('can be canceled before image retrieving has started', (done) => {
      // use the BrokenImageRetriever (so nothing is ever retrieved)
      this.imageStore._imageRetriever = new FakeImageRetriever()

      const key = '1:2:3'
      const imagesToSave = {}
      imagesToSave[key] = key

      const onStarted = () => {
        return null
      }

      const onSaveSuccess = () => {
        this.imageStore.get(
          key,
          function (image) {
            assert.isUndefined(image)
            done()
          },
          (error) => assert.fail(),
        )
      }

      this.imageStore.saveImages(imagesToSave, onStarted, onSaveSuccess, () => {
        assert.fail()
      })

      this.imageStore.cancel()
    })

    it('can be canceled after image retrieving has started', (done) => {
      // use the BrokenImageRetriever (so nothing is ever retrieved)
      this.imageStore._imageRetriever = new FakeImageRetriever()

      const key = '1:2:3'
      const imagesToSave = {}
      imagesToSave[key] = key

      const onStarted = () => {
        setTimeout(this.imageStore.cancel, 10)
      }

      const onSaveSuccess = () => {
        return checkKey(key, done)
      }

      this.imageStore.saveImages(imagesToSave, onStarted, onSaveSuccess, () => {
        assert.fail()
      })
    })

    it('can save multiple entries and retrieve them', (done) => {
      const imagesToSave = {}

      const keyA = '1:2:3'
      imagesToSave[keyA] = keyA

      const keyB = '4:5:6'
      imagesToSave[keyB] = keyB

      const keyC = '7:8:9'
      imagesToSave[keyC] = keyC

      let nbDone = 0
      const doneStep = () => {
        nbDone++
        if (nbDone === 3) {
          done()
        }
      }

      const onSaveSuccess = () => {
        checkKey(keyA, doneStep)
        checkKey(keyB, doneStep)
        return checkKey(keyC, doneStep)
      }

      this.imageStore.saveImages(imagesToSave, doNothing, onSaveSuccess, () => {
        assert.fail()
      })
    })
  })

export default doTest
