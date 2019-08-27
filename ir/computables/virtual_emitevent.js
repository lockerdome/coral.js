"use strict";

var inherits = require('util').inherits;
var AbstractVirtual = require('./abstract_virtual');

// TODO: This computable makes no sense without an environment input, but that really doesn't make sense with how things are set up.
// TODO: This computable makes no sense except as an input to very specific types of computables, there has to be a better way to structure this.

/**
 * @constructor
 * @extends AbstractVirtual
 * @param {Scope} scope
 */
function VirtualEmitEvent(scope) {
  AbstractVirtual.call(this, scope);
}

inherits(VirtualEmitEvent, AbstractVirtual);

/**
 * @override
 */
 VirtualEmitEvent.prototype.is_immovable = function () {
   return true;
 };

module.exports = VirtualEmitEvent;
