import DataStorage from '../src/WebSQLDataStorage'
import data_storage_tests from './data_storage_tests'
import { assert, expect } from "chai"

describe("WebSQLDataStorage", function() {
  before(function(done) {
    return this.dataStorage = new DataStorage("storeName", () => done(), () => assert.fail());
  });

  return describe("passes data_storage_tests", function() {
    return data_storage_tests.call(this);
  });
});
