"use strict";

function Placement () {
  this._chunks = [];
}

Placement.prototype.add = function (placeable) {
  this._chunks.push(placeable);
  return this;
};

Placement.prototype.toString = function () {
  var chunks = this._chunks;
  var output = '';
  for (var i = 0; i !== chunks.length; ++i) {
    var chunk = chunks[i];
    output += (chunk == null ? '' : chunk + '');
  }
  return output;
};

module.exports = Placement;
