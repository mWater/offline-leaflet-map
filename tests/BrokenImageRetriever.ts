class BrokenImageRetriever {
  
  retrieveImage(tileInfo: any, callback: any, error: any) {
    setTimeout(error, 100);
  }
};

export default BrokenImageRetriever
