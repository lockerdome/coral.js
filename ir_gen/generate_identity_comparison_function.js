"use strict";

var IRVoidType = require('../ir/types/void');
var type_at_path = require('../ir/type_at_path');
var func_params = require('../lib/function_helpers').parameters;


function compare_as_strings (a, b) {
  return (a + '') === (b + '');
}

function generate_path_access_snippet (path) {
  return path.split('.').map(function (part, index, parts) {
    return parts.slice(0,index+1).join('.');
  }).join('&&');
}

/**
 * @param {IRType} items_type
 * @param {string?} identity_specification
 * @return {function} Returns a comparison function that can be used for determining if two values can be considered equivalent according to the given specification.
 * - a, b -> boolean
 */
function generate_identity_comparison_function (items_type, identity_specification) {
  // TODO: Use the type information
  // * Decide the format of the identity function using type information, if it says it is safe to do a direct lookup then do it, otherwise use &&.
  // * If the identity says to look up a certain property that the type information says reliably isn't going to be there, then blow up

  if (typeof identity_specification === 'function') {
    // TODO: We could also support references in the file like the map function does at a later point in time
    var params = func_params(identity_specification);
    if (params.length !== 2 || params[0] !== 'item_a' || params[1] !== 'item_b') {
      throw new Error("Identity function must have exactly two parameters, item_a and item_b");
    }
    return identity_specification;
  } else if (typeof identity_specification === 'string') {
    // Identities in the legacy version will always convert the field to a string for the comparison, so we need to preserve that behavior.
    if (identity_specification === '') {
      return compare_as_strings;
    } else {
      // Identity is a path.
      // TODO: Ideally we'd use the type information here and use that to determine if the property access is 'safe' or not.
      var a_property_access_snippet = generate_path_access_snippet('a.'+identity_specification);
      var b_property_access_snippet = generate_path_access_snippet('b.'+identity_specification);

      return new Function('a', 'b', 'return (('+a_property_access_snippet+')+"")===(('+b_property_access_snippet+')+"")');
    }
  }
}

module.exports = generate_identity_comparison_function;
