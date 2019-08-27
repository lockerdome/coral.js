"use strict";

var inherits = require('util').inherits;
var AbstractVirtual = require('./abstract_virtual');

/**
 * @constructor
 * @extends AbstractVirtual
 * @param {Scope} scope
 */
function VirtualArgs (scope) {
  AbstractVirtual.call(this, scope);
}

inherits(VirtualArgs, AbstractVirtual);

module.exports = VirtualArgs;
