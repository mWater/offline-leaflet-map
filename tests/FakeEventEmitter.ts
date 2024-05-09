class FakeEventEmitter {
  fire(...args) {
    console.log(args)
    return null
  }
}

export default FakeEventEmitter
