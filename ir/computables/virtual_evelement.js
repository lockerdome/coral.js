"use strict";

var inherits = require('util').inherits;
var AbstractVirtual = require('./abstract_virtual');

/**
 * @constructor
 * @extends VirtualEvent
 * @param {Scope} scope
 */
function VirtualEvElement (scope) {
  AbstractVirtual.call(this, scope);
}

inherits(VirtualEvElement, AbstractVirtual);

module.exports = VirtualEvElement;
