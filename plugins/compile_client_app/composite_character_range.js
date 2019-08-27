"use strict";

var CharacterRange = require('./character_range');
var inherits = require('util').inherits;

/**
 * @constructor
 * @param {Array.<CharacterRange>} character_ranges
 */
function CompositeCharacterRange(character_ranges) {
  this._character_ranges = character_ranges;

  var count = 0;
  for (var i = 0; i !== character_ranges.length; ++i) {
    var character_range = character_ranges[i];
    count += character_range.get_character_count();
  }
  this._count = count;
}

inherits(CompositeCharacterRange, CharacterRange);

/**
 * @returns {string}
 */
CompositeCharacterRange.prototype._get_character = function (index) {
  var running_count = 0;
  for (var i = 0; i !== this._character_ranges.length; ++i) {
    var character_range = this._character_ranges[i];
    var character_count = character_range.get_character_count();

    if (index < (running_count + character_count)) {
      return character_range.get_character(index - running_count);
    }

    running_count += character_count; 
  }
};

CompositeCharacterRange.prototype.toString = function () {
  var output = '';
  for (var i = 0; i !== this._character_ranges.length; ++i) {
    var character_range = this._character_ranges[i];
    if (i > 0) {
      output += ', ';
    }

    output += character_range.toString();
  }

  return output;
};

module.exports = CompositeCharacterRange;
