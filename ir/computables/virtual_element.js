"use strict";

var inherits = require('util').inherits;
var AbstractVirtual = require('./abstract_virtual');

/**
 * @constructor
 * @extends AbstractVirtual
 * @param {Scope} scope
 * @param {Computable} root_node_computable The computable that represents the root DOM node of the scope, this should be a DOMElement for usage with AdInitializeHandler.  In order to use VirtualElement, there can only be one root DOM node in the scope.
 */
function VirtualElement (scope, root_node_computable) {
  this._root_node_computable = root_node_computable;
  var input_computables = [root_node_computable];
  AbstractVirtual.call(this, scope, null, input_computables);
}

inherits(VirtualElement, AbstractVirtual);

/**
* @returns {Computable}
 */
VirtualElement.prototype.get_root_node_computable = function () {
  return this._root_node_computable;
};

/**
 * @override
 */
VirtualElement.prototype._clone = function (scope, input_computables) {
  return new this.constructor(scope, input_computables[0]);
};

module.exports = VirtualElement;
