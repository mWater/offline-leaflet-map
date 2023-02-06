import DataStorage from '../src/IndexedDBDataStorage'
import data_storage_tests from './data_storage_tests'
import { assert, expect } from "chai"

describe("IndexedDBDataStorage", function() {
  before(function(done) {
    this.dataStorage = new DataStorage("storeName", () => done() , () => assert.fail());
  });

  return describe("passes data_storage_tests", function() {
    data_storage_tests.call(this);
  });
});
