assert = require("chai").assert
expect = require("chai").expect

DataStorage = require '../src/WebSQLDataStorage'
data_storage_tests = require './data_storage_tests'

describe "WebSQLDataStorage", ->
  before (done) ->
    @dataStorage = new DataStorage("storeName", () ->
      done()
    )

  describe "passes data_storage_tests", ->
    data_storage_tests.call(this)
