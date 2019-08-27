"use strict";

var topological_sort = require('../lib/topological_sort');

/**
 * @param {Array.<Computables>} computables
 * @returns {Array.<Computable>}
 */
function topologically_sort_computables (computables) {
 var computable_identities = [];
  var i;

  for (i = 0; i !== computables.length; ++i) {
    var computable = computables[i];
    computable_identities.push(computable.get_identity());
  }

  var sorted_identities = topological_sort(computable_identities, function (identity) {
    var identity_index = computable_identities.indexOf(identity);
    var computable = computables[identity_index];

    var input_identities = [];
    var input_count = computable.get_input_count();
    for (i = 0; i !== input_count; ++i) {
      var input_computable = computable.get_input(i);
      if (computable_identities.indexOf(input_computable.get_identity()) === -1) {
        continue;
      }
      input_identities.push(input_computable.get_identity());
    }

    return input_identities;
  });

  var sorted_computables = [];
  for (i = 0; i !== sorted_identities.length; ++i) {
    var computable_identity = sorted_identities[i];
    var identity_index = computable_identities.indexOf(computable_identity);
    sorted_computables.push(computables[identity_index]);
  }

  return sorted_computables;
}


module.exports = topologically_sort_computables;
