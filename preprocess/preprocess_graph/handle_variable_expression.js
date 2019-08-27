"use strict";

var esprima = require('esprima');
var find_function_refs = require('./find_function_refs');

var model_index = 0;

function handle_variable_expression (element_definition, expression) {
  var ast = esprima_parse(element_definition, expression);

  var ast_body = ast.body;

  // Just a simple 'ref' or 'ref.field' case, no need to do any further analsis, allow the framework to treat it as such.
  var is_simple_identifier_expression = ast_body.length === 1 && (ast_body[0].expression.type === 'Identifier' || ast_body[0].expression.type === 'MemberExpression');
  if (is_simple_identifier_expression) {
    return expression;
  }

  var refs = find_function_refs(ast, element_definition.localRefsHash);

  var model_name = '$$view_template_expression_'+model_index++;
  var model_func = Function.apply(null, refs.concat('return ' + expression));
  var args_object = {};
  var parsed_params = [];
  for (var i = 0; i < refs.length; ++i) {
    args_object[refs[i]] = refs[i];
    parsed_params.push({ name: refs[i] });
  }

  var ref = {
    type: 'models',
    name: model_name,
    value: {
      type: '!inline',
      params: refs,
      output: model_func,
      args: args_object,
      parsed_params: parsed_params
    }
  };

  element_definition.localRefs.push(ref);
  element_definition.localRefsHash[model_name] = ref;
  element_definition.models[model_name] = ref.value;

  return model_name;
}

function esprima_parse (element_definition, expression) {
  try {
    return esprima.parse(expression);
  } catch (e) {
    var error = new Error(element_definition.name + ": contains invalid expression in view: " + expression + "\n  Syntax error: " + e.message);
    throw error;
  }
}

module.exports = handle_variable_expression;
