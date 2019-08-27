"use strict";

var inherits = require('util').inherits;
var AbstractVirtual = require('./abstract_virtual');

/**
 * @constructor
 * @extends VirtualEvents
 * @param {Scope} scope
 */
function VirtualElements (scope) {
  AbstractVirtual.call(this, scope);
}

inherits(VirtualElements, AbstractVirtual);

module.exports = VirtualElements;
