"use strict";

var Computable = require('../../../ir/computable');
var ScopeParameter = require('../../../ir/computables/scope_parameter');

/**
 * @override
 */
ScopeParameter.prototype.is_needed_for_update_cycle = function () {
  if (this._is_zone_entry_parameter) {
    return false;
  }

  return Computable.prototype.is_needed_for_update_cycle.call(this);
};

/**
 * @override
 */
ScopeParameter.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_input_symbol();
};

/**
 * @returns {boolean} Returns false since ScopeParameters do no initialize.
 */
ScopeParameter.prototype.has_client_side_code_initialize_hook = function () {
  return false;
};
