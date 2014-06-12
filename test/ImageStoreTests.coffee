image_store_tests = require './image_store_tests'

describe "ImageStore", ->
  describe 'with IndexedDB', ->
    image_store_tests.call(this, false)

  describe 'with Web SQL', ->
    image_store_tests.call(this, true)

