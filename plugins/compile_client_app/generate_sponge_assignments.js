"use strict";
var format = require('util').format;
/**
 * @param {Object.<string, string>} vars
 * @returns {string} A series of assignments to s (The Sponge) for the vars passed in..
 */
function generate_sponge_assignments (vars) {
  var assignments = '';
  for (var varname in vars) {
    assignments += format('Coral.sponges[%j]=%s;', varname, vars[varname]);
  }
  return assignments;
}

module.exports = generate_sponge_assignments;
