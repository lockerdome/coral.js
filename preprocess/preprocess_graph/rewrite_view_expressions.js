"use strict";

var handle_variable_expression = require('./handle_variable_expression');
var traverse = require('../../domeplates/traverse').traverse;

function rewrite_view_expressions (element_definition) {
  traverse(element_definition.template_ast, function (node) {
    if (node.type === 'Variable' || node.type === 'TripleVariable') {
      node.name = handle_variable_expression(element_definition, node.name);
    } else if (node.type === 'IfStatement' || node.type === 'ElseIfStatement') {
      node.condition.name = handle_variable_expression(element_definition, node.condition.name);
      node.condition.token.value = node.condition.name;
    }
  });
}

module.exports = rewrite_view_expressions;
