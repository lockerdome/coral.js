"use strict";

var AbstractFunctionBasedComputable = require('./abstract_function_based');
var inherits = require('util').inherits;

/**
 * @constructor
 * @extends AbstractFunctionBased
 * @param {Scope} scope The scope that will contain this handler.
 * @param {function} func The function to be used for the handler.
 * @param {Array.<Computable>} inputs The Computables that this handler will use.
 * @param {number} start_index The input computable start index
 */
function AbstractHandlerFunction (scope, func, inputs, start_index) {
  // TODO: mutability (opt-in)
  //       * Initially we won't be doing this, we won't be able to until the many spots would need to be updated to have a mutable flag.  Everything that can be passed in as mutable, will need to be passed in as mutable.
  //       * This is based on there being a mutable reference hint on the input.  Look at the saved AST output.
  //       * We might also determine that a mutable input refrence isn't ever actually mutated, thus making it false.  We might make that some sort of warning.

  // TODO: reference retention (opt-in)
  //       * Initially we won't be doing this, we won't be able to until the many spots are updated to pass this flag, would break too many things.
  //       * What does it mean to have a mutable non-reference retained input?
  //       * Based on when there is a retained reference hint on the input, the type of the input could also affect this.
  //       * Possible to guess at this by looking at the saved AST for callbacks that use an input reference.
  AbstractFunctionBasedComputable.call(this, scope, func, inputs, start_index);
}

inherits(AbstractHandlerFunction, AbstractFunctionBasedComputable);

/**
 * @override
 */
AbstractHandlerFunction.prototype._validate_function_metadata = function (function_metadata) {
  if (function_metadata.output && Object.keys(function_metadata.output).length) {
    throw new Error("Output annotations are not allowed for handlers");
  }
  var parameter_option_whitelist = ['from', 'is', 'unpacked'];
  var parameter_data = function_metadata.parameters;
  for (var i = 0; i < parameter_data.length; i++) {
    var parameter = parameter_data[i];
    for (var option in parameter.options) {
      var parameter_uses_option = parameter.options[option];
      var not_allowed = parameter_option_whitelist.indexOf(option) === -1;
      if (parameter_uses_option && not_allowed) {
        throw new Error("AbstractHandlerFunction parameter " + parameter.name + " should not use '" + option + "'.");
      }
    }
  }
};

module.exports = AbstractHandlerFunction;
