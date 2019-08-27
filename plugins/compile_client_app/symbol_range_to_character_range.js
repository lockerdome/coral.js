"use strict";

var CharacterRange = require('./character_range');
var CompositeCharacterRange = require('./composite_character_range');

function symbol_range_to_character_range (symbol_range) {
  if (symbol_range.length > 2) {
    var ranges = [];
    for (var i = 0; i < symbol_range.length; i += 2) {
      ranges.push(new CharacterRange(symbol_range[i], symbol_range[i + 1]));
    }
    return new CompositeCharacterRange(ranges);
  } else {
    return new CharacterRange(symbol_range[0], symbol_range[1]);
  }
}

module.exports = symbol_range_to_character_range;
