assert = require("chai").assert
expect = require("chai").expect

ImageStore = require '../src/ImageStore'

describe "ImageStore", ->
  it "can be constructed with no parameters", ->
    imageStore = new ImageStore
