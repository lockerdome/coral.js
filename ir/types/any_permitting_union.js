"use strict";

var inherits = require('util').inherits;
var IRUnionType = require('./union');

/**
 * A subclass of union where you want to permit IRAnyType, but apply strict checking to all other types.  In the framework we often must deal with developer defined functions where we are unable to determine the output type, but still allow those functions to be used.
 */
function IRAnyPermittingUnionType(types) {
  IRUnionType.call(this, types);
}

inherits(IRAnyPermittingUnionType, IRUnionType);

module.exports = IRAnyPermittingUnionType;
