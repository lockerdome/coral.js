"use strict";

var inherits = require('util').inherits;
var AbstractVirtual = require('./abstract_virtual');

/**
 * @constructor
 * @extends AbstractVirtual
 * @param {Scope} scope
 */
function VirtualEvent (scope) {
  AbstractVirtual.call(this, scope);
}

inherits(VirtualEvent, AbstractVirtual);

module.exports = VirtualEvent;
