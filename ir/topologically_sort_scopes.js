"use strict";

var topological_sort = require('../lib/topological_sort');

/**
 * @param {Array.<Scope>} scopes
 * @returns {Array.<Scope>}
 */
function topologically_sort_scopes(scopes) {
  var scope_identities = [];
  var i;

  for (i = 0; i < scopes.length; i++) {
    scope_identities.push(scopes[i].get_identity());
  }

  var sorted_identities = topological_sort(scope_identities, function(identity) {
    var index = scope_identities.indexOf(identity);
    var scope = scopes[index];

    var input_identities = [];
    var input_count = scope.get_dependee_scope_count();
    for (i = 0; i < input_count; i++) {
      var input = scope.get_dependee_scope(i);
      if (scope_identities.indexOf(input.get_identity()) === -1) continue;
      input_identities.push(input.get_identity());
    }
    return input_identities;
  });

  var sorted_scopes = [];
  for (i = 0; i < sorted_identities.length; i++) {
    var identity_index = scope_identities.indexOf(sorted_identities[i]);
    sorted_scopes.push(scopes[identity_index]);
  }

  return sorted_scopes;
}

module.exports = topologically_sort_scopes;
