"use strict";

/**
 * Zone Entry Scope
 *
 * A special type of Scope that represents the entry point for a Zone.
 */

var inherits = require('util').inherits;
var Scope = require('./scope');

function ZoneEntryScope (name, preload) {
  Scope.call(this, name);

  this._preload = preload;
}

inherits(ZoneEntryScope, Scope);

/**
 * @returns {string} The HTML string to use for the preload display.
 */
ZoneEntryScope.prototype.get_preload = function () {
  return this._preload;
};

/**
 * @override
 */
ZoneEntryScope.prototype.is_entry_point = function () {
  return true;
};

module.exports = ZoneEntryScope;
