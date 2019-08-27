"use strict";

var AbstractFunctionBased = require('./abstract_function_based');
var NestedPassthrough = require('./nested_passthrough');
var inherits = require('util').inherits;
var CoralTypeError = require('../coral_type_error');

var ScopeCreator = require('./scope_creator');
var IRCallbackType = require('../types/callback');
var IRCompoundType = require('../types/compound');
var IRAnyType = require('../types/any');

/**
 * @constructor
 * @extends AbstractFunctionBased
 * @param {Scope} scope The scope that will contain this PureFunction Computable.
 * @param {function} func The function to be used for the pure function.
 * @param {Array.<Computable>} input_computables The Computables to use as inputs for the PureFunction.
 */
function PureFunction (scope, func, input_computables) {
  AbstractFunctionBased.call(this, scope, func, input_computables, null, true);

  this._output_type = this._async_wrap_output(this._output_type);
}

inherits(PureFunction, AbstractFunctionBased);

/**
 * @private 
 * @returns {IRType}
 */
PureFunction.prototype._async_wrap_output = function (type) {
  if (this.is_initially_async()) {
    return new IRCompoundType({ result: type, error: new IRAnyType() });
  } else {
    return type;
  }
};

/**
 * @override
 */
PureFunction.prototype.set_output_type = function (type) {
  var updated_type = this._async_wrap_output(type);
  AbstractFunctionBased.prototype.call(this, updated_type);
};

/**
 * @override
 */
PureFunction.prototype.get_property = function (field_name) {
  return new NestedPassthrough(this, field_name);
};

/**
 * @override
 */
PureFunction.prototype.is_initially_async = function () {
  return !!this._function_metadata.output.async;
};

/**
 * @override
 */
PureFunction.prototype._validate_function_metadata = function (function_metadata) {
  var output_option_whitelist = ['async', 'is'];
  for (var option_name in function_metadata.output) {
    if (output_option_whitelist.indexOf(option_name) === -1) {
      throw new Error(option_name + ' is not an allowed output annotation for this function');
    }
  }

  var parameter_option_whitelist = ['from', 'is'];
  var parameter_data = function_metadata.parameters;
  for (var i = 0; i < parameter_data.length; i++) {
    var parameter = parameter_data[i];
    for (var option in parameter.options) {
      var parameter_uses_option = parameter.options[option];
      var not_allowed = parameter_option_whitelist.indexOf(option) === -1;
      if (parameter_uses_option && not_allowed) {
        throw new Error("PureFunction parameter " + parameter.name + " should not use '" + option + "'.");
      }
    }
  }
};

/**
 * @override
 */
PureFunction.prototype._clone = function (scope, input_computables) {
  return new PureFunction(scope, this.get_function(), input_computables);
};

/**
 * @override
 * @returns {boolean} Whether the PureFunction can be calculated once at compile time.
 */
PureFunction.prototype.is_compile_time_constant = function () {
  return false;
};

/**
 * @override
 * @returns {boolean} Whether the PureFunction's output will change when the input at the given index changes.
 */
PureFunction.prototype.is_output_updated_on_input_change = function (index) {
  // TODO: Possible for us to check the AST to see if the input is in anyway factored into the output calculation.  In most cases this will be true.
  var is_input_computable_invariant = this.get_input(index).is_invariant();
  if (is_input_computable_invariant) {
    return false;
  }

  return true;
};

/**
 * @override
 */
PureFunction.prototype._validate_input = function (index, computable) {
  AbstractFunctionBased.prototype._validate_input.call(this, index, computable);

  if (computable.get_output_type() instanceof IRCallbackType) {
    throw new CoralTypeError("Callback cannot be used as an input", computable.get_output_type());
  } else if (computable instanceof ScopeCreator) {
    throw new CoralTypeError("Element and model scopes can not be used as an input");
  }
};

module.exports = PureFunction;
