// BigInt JSON serialization.
BigInt.prototype.toJSON = function() {
  return this.toString() + 'n';
}
