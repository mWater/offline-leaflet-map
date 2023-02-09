
import image_store_tests from './image_store_tests'

describe("ImageStore", function() {
  describe('with IndexedDB', function() {
    image_store_tests.call(this, false);
  });

  return describe('with Web SQL', function() {
    image_store_tests.call(this, true);
  });
});

