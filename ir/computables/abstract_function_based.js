"use strict";

var Computable = require('../computable');
var inherits = require('util').inherits;
var get_function_ast = require('../../lib/get_function_ast');
var functionParser = require('../../lib/function_parser');
var IRAnyType = require('../types/any');
var IRVoidType = require('../types/void');
var IRStringType = require('../types/string');
var IRNullType = require('../types/null');
var IRBooleanType = require('../types/boolean');
var IRNumberType = require('../types/number');
var IRArrayType = require('../types/array');
var IRUnionType = require('../types/union');
var IRExactValueType = require('../types/exact_value');
var IRCompoundType = require('../types/compound');

var is_type_contained = require('../is_type_contained');
var CoralTypeError = require('../coral_type_error');

var type_parser = require('../type_parser');

// TODO: Some way to evaluate compile time constant functions on demand.  This functionality will likely live outside of here and know how to work with PureFunctions.

var esprima_type_to_type_deducer = {
  "ArrayExpression":  function (expression) { return new IRArrayType(new IRAnyType()); },
  "UnaryExpression": function (expression) { return new IRBooleanType(); },
  "BinaryExpression": parse_binary_expression,
  "ConditionalExpression": parse_conditional_expression,
  "LogicalExpression": parse_logical_expression,
  "Literal": parse_literal
};

/**
 * @param {IRType} new_type type to concat
 * @param {IRType} old_type type to concat
 * @returns {IRType} The union type between the two types or an IRAnyType
 */
function coalesce_types (new_type, old_type) {
  if (new_type && new_type instanceof IRAnyType) return new_type;
  else if (old_type && old_type instanceof IRAnyType) return old_type;
  else return new IRUnionType([new_type, old_type]);
}

/**
 * @param {object} expression An esprima expression
 * @returns {IRType} The IRType that is deduced from the expression or an IRAnyType
 */
function convert_esprima_type (expression) {
  var esprima_type = expression.type;
  var esprima_type_parser_or_type = esprima_type_to_type_deducer[esprima_type];
  if (esprima_type_parser_or_type) return esprima_type_parser_or_type(expression);
  else return new IRAnyType();
}

/**
 * @param {object} expression An esprima Literal type
 * @returns {IRType} The IRType that can be deduced from the Literal esprima expression
 */
function parse_literal (expression) {
  var value = expression.value;
  if (Array.isArray(value)) return new IRArrayType(new IRAnyType());
  else if (value === null) return new IRNullType();
  else return new IRExactValueType(value);
}

/**
 * @param {object} expression An esprima ConditionalExpression type
 * @returns {IRType}
 */
function parse_conditional_expression (expression) {
  var consequent_types = convert_esprima_type(expression.consequent);
  var alternate_types = convert_esprima_type(expression.alternate);
  return coalesce_types(consequent_types, alternate_types);
}

/**
 * @param {object} expression An esprima LogicalExpression type
 * @returns {IRType}
 */
function parse_logical_expression (expression) {
  var operator = expression.operator;
  var right_type = convert_esprima_type(expression.right);
  if ((right_type instanceof IRBooleanType) && (operator === "&&")) return right_type;
  return new IRAnyType();
}

var IRString = new IRStringType();
var boolean_binary_operators = ["<", ">", "<=", ">=", "==", "===", "!=="];
/**
 * @param {object} expression An esprima BinaryExpression type
 * @returns {IRType}
 */
function parse_binary_expression (expression) {
  var operator = expression.operator;
  if (boolean_binary_operators.indexOf(operator) !== -1) {
    return new IRBooleanType();
  } else {
    var left = convert_esprima_type(expression.left);
    var right = convert_esprima_type(expression.right);
    if (operator === '+' && (IRString.allows(left) || IRString.allows(right))) return new IRStringType();
    else return new IRAnyType();
  }
}

var esprima_statement_to_traversal_function = {
  "IfStatement": traverse_consequent_alternate_type_statement,
  "BlockStatement": traverse_block_statement,
  "ForInStatement": traverse_loop_statement,
  "ForStatement": traverse_loop_statement,
  "WhileStatement": traverse_loop_statement,
  "SwitchStatement": traverse_switch_statement,
  "ReturnStatement": traverse_return_statement,
  "ArrowFunctionExpression": traverse_arrow_expression
};

/**
 * @param {object} statement An esprima statement
 * @param {object} statement Contextual data that is parsed from the ast
 * Function that traverses through the espirma ast of switch case statements
 */
function traverse_switch_statement (statement, context) {
  var cases = statement.cases;
  for (var i = 0; i !== cases.length; ++i) {
    var switch_case = cases[i];
    for (var j = 0; j !== switch_case.consequent.length; ++j) {
      var case_statement = switch_case.consequent[j];
      traverse_ast_statements(case_statement, context);
    }
  }
}

/**
 * @param {object} statement An esprima statement
 * @param {object} statement Contextual data that is parsed from the ast
 * Function that traverses through the espirma ast of conditional like statements
 */
function traverse_consequent_alternate_type_statement (statement, context) {
  traverse_ast_statements(statement.consequent, context);
  if (statement.alternate) traverse_ast_statements(statement.alternate, context);
}

/**
 * @param {object} statement An esprima statement
 * @param {object} statement Contextual data that is parsed from the ast
 * Function that traverses through the espirma ast of a loop
 */
function traverse_loop_statement (statement, context) {
  var body = statement.body;
  traverse_ast_statements(body, context);
}

/**
 * @param {object} statement An esprima statement
 * @param {object} statement Contextual data that is parsed from the ast
 * Function that traverses through the espirma ast of a body
 */
function traverse_block_statement (statement, context) {
  var body = statement.body;
  for (var i = 0; i < body.length; ++i) {
    traverse_ast_statements(body[i], context);
  }
}

/**
 * @param {object} statement An esprima statement
 * @param {object} statement Contextual data that is parsed from the ast
 * Function that traverses through the espirma ast of a return statement
 */
function traverse_return_statement (statement, context) {
  process_return_expression(statement.argument, context);
}

function traverse_arrow_expression (statement, context) {
  process_return_expression(statement.body, context);
}

function process_return_expression (expression, context) {
  var type;
  if (!expression) type = new IRNullType();
  else type = convert_esprima_type(expression);

  if (!context.possible_return_type) context.possible_return_type = type;
  else context.possible_return_type = coalesce_types(type, context.possible_return_type);
}

/**
 * @param {object} statement An esprima statement
 * @param {object} statement Contextual data that is parsed from the ast
 * Function that finds the correct esprima traversal function or does not travser the statement
 */
function traverse_ast_statements (statement, context) {
  var statement_type = statement.type;
  var esprima_traversal = esprima_statement_to_traversal_function[statement_type];
  if (!esprima_traversal) return;
  return esprima_traversal(statement, context);
}

/**
 * @param {Array.<{ type: ('parameter'|'comment'|'comma'), text: ?string }>} parameter_tokens
 * @returns { output_type: ?IRType, parameters: Array.<{ name: string, type: ?IRType, options: {option_name: true|false} }> }
 */
function build_function_metadata(func) {
  var parsed = functionParser(func);
  var metadata = { parameters: [], output: parsed.output };

  if (parsed.output.is) {
    metadata.output_type = type_parser(parsed.output.is);
  }
  for (var i = 0; i < parsed.params.length; i++) {
    var parsed_param = parsed.params[i];
    var parameter = {
      name: parsed_param.name,
      options: {
        from: !!parsed_param.from,
        unpacked: !!parsed_param.unpacked,
        is: !!parsed_param.is
      }
    };
    if (parsed_param.is) parameter.type = type_parser(parsed_param.is);
    metadata.parameters.push(parameter);
  }
  return metadata;
}

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope The scope that will contain this.
 * @param {function} func The function to be based on.
 * @param {Array.<Computable>} input_computables The Computables used for the function.
 * @param {number} input_computable_start_index
 * @param {boolean} deduce_output
 */
function AbstractFunctionBased (scope, func, input_computables, function_input_computable_start_index, deduce_output) {
  this._function_input_computable_start_index = function_input_computable_start_index;

  this._func = func;

  if (typeof func !== 'function') {
    throw new Error("Must pass in a function, got "+func);
  }

  var function_ast = get_function_ast(func);
  this._function_ast = function_ast;

  // NOTE: esprima's comment attachment is broken in cases where a parameter has leading and trailing commas, that and we don't need to worry about attaching comments for the body of the function, so it just makes sense to roll it our own.

  var function_metadata = build_function_metadata(func);

  // TODO: refine this to not return any as a fallback if it doesn't return
  var output_type = function_metadata.output_type || (deduce_output ? this.deduce_output_type() : new IRAnyType());
  var parameters = function_metadata.parameters;

  this._validate_function_metadata(function_metadata);
  this._function_metadata = function_metadata;
  this._parameters = parameters;

  Computable.call(this, scope, input_computables, output_type);
}

inherits(AbstractFunctionBased, Computable);

/**
 * @override
 * @param {number} index The index of the parameter to validate the Computable for usage as.
 * @param {Computable} computable The Computable to validate for usage as the function parameter at the given index.
 */
AbstractFunctionBased.prototype._validate_input = function (index, computable) {
  Computable.prototype._validate_input.call(this, index, computable);

  var parameters = this.get_parameters();
  index -= this._function_input_computable_start_index || 0;
  if (index >= parameters.length) {
    throw new Error(index + " is an invalid index for this function");
  }
  var parameter = parameters[index];
  var output_type = computable.get_output_type();
  if (parameter && parameter.type && output_type && !is_type_contained(parameter.type, output_type)) {
    throw new CoralTypeError("Incompatible input passed", output_type, parameter.type);
  }
  if (output_type instanceof IRCompoundType) {
    var keys = output_type.get_keys();
    throw new CoralTypeError("Incompatible input passed, please accept one of its fields: " + keys);
  }
};

/**
 * @virtual
 * @param {object} function_metadata Function and parameter info obtained from output of 'build_function_metadata'
 */
AbstractFunctionBased.prototype._validate_function_metadata = function (function_metadata) {
  throw new Error("This subclass of AbstractFunctionBased has not implemented _validate_function_metadata");
};

/**
  * @param {number} index The index of the parameter to check.
  * @param {String} parameter_option The parameter setting to check for.
  * @returns {boolean} Whether or not the parameter is affected by a parameter_option
 */
 AbstractFunctionBased.prototype.is_input_using_parameter_option = function (index, parameter_option) {
   var parameters = this.get_parameters();
   index -= this._function_input_computable_start_index || 0;
   if (index >= parameters.length) {
     throw new Error(index + " is an invalid index for this function");
   }
   var parameter = parameters[index];
   return !!parameter.options[parameter_option];
 };

/**
 * @returns {object} The function ast for the function this is based on.
 */
AbstractFunctionBased.prototype.get_function_ast = function () {
  return this._function_ast;
};

/**
 * @returns {Array.<object>} The parameters with annotation metadata.
 */
AbstractFunctionBased.prototype.get_parameters = function () {
  return this._parameters;
};

/**
 * @returns {function} The function that represents this.
 */
AbstractFunctionBased.prototype.get_function = function () {
  return this._func;
};

/**
 * @returns {IRType}  Deduced output IRType of the function
 */
AbstractFunctionBased.prototype.deduce_output_type = function () {
  var function_ast_body = this._function_ast.type === 'ArrowFunctionExpression' ? this._function_ast : this._function_ast.body;
  var context = { possible_return_type: null };
  traverse_ast_statements(function_ast_body, context);
  if (!context.possible_return_type) throw new Error('Function must return something');
  else return context.possible_return_type;
};

module.exports = AbstractFunctionBased;
