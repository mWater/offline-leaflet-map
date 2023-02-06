class FakeImageRetriever {
  constructor() {
    null;
  }

  retrieveImage(tileInfo: any, callback: any, error: any) {
    return callback(tileInfo);
  }
}


export default FakeImageRetriever