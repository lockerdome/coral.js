"use strict";

function CharacterRange(start_character_code, end_character_code) {
  this._start_character_code = start_character_code;
  this._end_character_code = end_character_code;

  this._count = this._end_character_code - this._start_character_code;
}

/**
 * @returns {string|bool}
 */
CharacterRange.prototype.get_character = function (index) {
  if (index > this.get_character_count()) {
    return false;
  }

  return this._get_character(index);
};


CharacterRange.prototype._get_character = function (index) {
  return String.fromCharCode(this._start_character_code + index);
};

/**
 * @returns {number}
 */
CharacterRange.prototype.get_character_count = function () {
  return this._count;
};

/**
 * @returns {string}
 */
CharacterRange.prototype.toString = function () {
  return this._start_character_code + '-' + this._end_character_code;
};

module.exports = CharacterRange;
