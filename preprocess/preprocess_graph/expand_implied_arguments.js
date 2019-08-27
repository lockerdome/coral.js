"use strict";

var replace = require('./type_system/convert_type');
var ref_name = require('../../lib/error_helper').ref_name;

function process_field_implied_arguments(field_instructions, scope_definition, all_scopes) {
  var localRefsHash = scope_definition.localRefsHash;

  return replace(field_instructions.fieldName + '?.*', field_instructions.type || 'all', function (val, type, seen) {
    var target = val[field_instructions.target || 'type'];
    var args = val.args;
    if (field_instructions.skip && field_instructions.skip(val)) return val;
    var params;

    if (field_instructions.handler) {
      params = field_instructions.handler(scope_definition, val, type, seen);
    } else {
      var source = all_scopes[field_instructions.sourcePath][target];
      params = source.params.map(function (param) { return param.name; });
    }

    params.forEach(function (param) {
      if (!args.hasOwnProperty(param)) {
        if (field_instructions.skip_param && field_instructions.skip_param[param]) return;
        if (!localRefsHash.hasOwnProperty(param)) {
          throw new Error('Unable to find reference named "' + param + '" which is used as a param for "' + ref_name(seen) + '".');
        }

        var updated_ref_value;
        if (param === '__placement') {
          throw new Error('Element "' + ref_name(seen) + '" is currently unplaced (not used in view), which is not currently allowed.');
        } else {
          updated_ref_value = param;
        }

        val.args[param] = updated_ref_value;
        if (val.parentParams) {
          val.parentParams[param] = updated_ref_value;
        }
      }
    });

    return val;
  })(scope_definition);
}

function expand_implied_arguments (scope_definition, all_scopes, fields) {
  var updated_scope_definition = scope_definition;
  for (var i = 0; i !== fields.length; ++i) {
    var field_instructions = fields[i];
    updated_scope_definition = process_field_implied_arguments(field_instructions, updated_scope_definition, all_scopes);
  }
  return updated_scope_definition;
}

module.exports = expand_implied_arguments;
