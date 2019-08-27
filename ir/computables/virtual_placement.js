"use strict";

var inherits = require('util').inherits;
var AbstractVirtual = require('./abstract_virtual');
var IRDomPlacementType = require('../types/dom_placement');

/**
 * @constructor
 * @extends AbstractVirtual
 * @param {Scope} scope
 */
function VirtualPlacement (scope) {
  AbstractVirtual.call(this, scope, new IRDomPlacementType());
}

inherits(VirtualPlacement, AbstractVirtual);

module.exports = VirtualPlacement;
