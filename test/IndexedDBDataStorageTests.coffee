assert = require("chai").assert
expect = require("chai").expect

DataStorage = require '../src/IndexedDBDataStorage'
data_storage_tests = require './data_storage_tests'

describe "IndexedDBDataStorage", ->
  before (done) ->
    @dataStorage = new DataStorage("storeName", () ->
      done()
    )

  describe "passes data_storage_tests", ->
    data_storage_tests.call(this)
