"use strict";

var esprima = require('esprima');

function get_function_ast (func) {
  var ast = esprima.parse('(' + func.toString() + ')');
  return ast.body[0].expression;
}
module.exports = get_function_ast;
