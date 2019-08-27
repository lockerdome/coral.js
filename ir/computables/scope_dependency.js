"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');
var IRAnyType = require('../types/any');

// TODO: Should probably exist as its own plugin alongside sharding.  For the simplest of apps neither is necessary.

/**
 * ScopeDependencies are Computables that represent a script or stylesheet required by their Scope.
 */
function ScopeDependency (scope, url, type) {
  this._url = url;
  this._type = type;
  Computable.call(this, scope, [], new IRAnyType());
}

inherits(ScopeDependency, Computable);

/**
 * @override
 */
ScopeDependency.prototype._clone = function (scope, input_computables) {
  return new ScopeDependency(scope, this._url, this._type);
};

/**
 * @returns {string} dependency url
 */
ScopeDependency.prototype.get_url = function () {
  return this._url;
};

/**
 * @override
 */
ScopeDependency.prototype.is_initially_async = function () {
  return true;
};

/**
 * @override
 */
ScopeDependency.prototype.is_side_effect_causing = function () {
  return true;
};

module.exports = ScopeDependency;
