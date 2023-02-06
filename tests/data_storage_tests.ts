import { assert, expect } from "chai"
const nothing = () => null;

const checkKey = (dataStorage: any, key: string, done: Mocha.Done) => dataStorage.get(key, (image: any) => {
    assert.isDefined(image);
    assert.property(image, 'image');
    assert.equal(image.image, key);
    return done();
  },
  (error: any) => assert.fail()
);

export default () => describe("DataStorage", function() {
  it("can save an entry and retrieve it", function(done) {
    this.dataStorage.clear(() => {
      const key = "1:2:3";
      const data = {image: key};
      const onSaveSuccess = () => {
        checkKey(this.dataStorage, key, done);
      };

      this.dataStorage.put(key, data, onSaveSuccess, () => {
        assert.fail();
      });
    });
  });

  it("can save 2 entries and retrieve one", function(done) {
    this.dataStorage.clear(() => {
      const keyA = "a";
      const dataA = {image: keyA};

      const keyB = "b";
      const dataB = {image: keyB};

      let nbSaved = 0;
      const onSaveSuccess = () => {
        nbSaved++;
        if (nbSaved === 2) {
          return checkKey(this.dataStorage, keyA, done);
        }
      };

      this.dataStorage.put(keyA, dataA, onSaveSuccess, () => {
        assert.fail();
      });

      this.dataStorage.put(keyB, dataB, onSaveSuccess, () => {
        assert.fail();
      });
    });
  });

  it("can clear all entries", function(done) {
    return this.dataStorage.clear(() => {
      const key = "1:2:3";
      const data = {image: key};
      const onSaveSuccess = () => {
        this.dataStorage.clear(() => {
          this.dataStorage.get(key,
            (image: any) => {
            assert.isUndefined(image);
            done();
          },
          (error: Error) => {
            assert.fail();
          });
        });
      };

      this.dataStorage.put(key, data, onSaveSuccess, () => {
        assert.fail();
      });
    });
  });

  // The dense meaning that the response array will have the same length and same ordering as the
  // array of key queried with a null value if the key wasn't matched
  it("can get a dense batch", function(done) {
    this.dataStorage.clear(() => {
      const keyA = "1:2:3";
      const keyB = "4:5:6";
      const keyC = "7:8:9";
      const dataA = {image: keyA};
      const dataB = {image: keyB};
      const dataC = {image: keyC};
      const keys = ["been", keyA, "wrong", keyB, keyC, "twice"];
      let nbSaved = 0;
      const onSaveSuccess = () => {
        nbSaved++;

        if (nbSaved === 3) {
          this.dataStorage.getDenseBatch(keys,
          (images: any[]) => {
            assert.equal(images.length, keys.length);
            assert.equal(images[0], undefined);
            assert.equal(images[1].image, keyA);
            assert.equal(images[2], undefined);
            assert.equal(images[3].image, keyB);
            assert.equal(images[4].image, keyC);
            assert.equal(images[5], undefined);
            return done();
          },
          (error: Error) => {
            return assert.fail();
          });
        }
      };

      this.dataStorage.put(keyA, dataA, onSaveSuccess, () => {
        return assert.fail();
      });
      this.dataStorage.put(keyB, dataB, onSaveSuccess, () => {
        return assert.fail();
      });
      return this.dataStorage.put(keyC, dataC, onSaveSuccess, () => {
        return assert.fail();
      });
    });
  });
});