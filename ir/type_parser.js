"use strict";

var IRType = require('./type');
var IRAnyType = require('./types/any');
var IRCompoundType = require('./types/compound');
var IRVoidType = require('./types/void');
var IRUnionType = require('./types/union');
var IRBooleanType = require('./types/boolean');
var IRNullType = require('./types/null');
var IRStringType = require('./types/string');
var IRIntegerType = require('./types/int');
var IRTruthyType = require('./types/truthy');
var IRFalsyType = require('./types/falsy');
var IRUnsignedIntegerType = require('./types/uint');
var IRExactValueType = require('./types/exact_value');
var IRNumberType = require('./types/number');
var IRArrayType = require('./types/array');
var IRDOMPlacementType = require('./types/dom_placement');

var esprima = require('esprima');

/**
 * @param {string} type_expression
 * @throws {Error} When given an invalid type expression.
 * @returns {IRType} The IRType determined by reading the type expression.
 */
function type_parser(type_expression) {
  type_expression = type_expression && type_expression.trim() || '';
  if (!type_expression) throw new Error("Provided an empty type expression");

  // TODO: array, any of the types here ending in []
  // TODO: tuple syntax
  // TODO: intelligent creation of IRExactValueType

  var wrapped_expression_match = type_expression.match(/^\((.*)\)$/);
  if (wrapped_expression_match) {
    return type_parser(wrapped_expression_match[1]);
  }

  // Split top level union `truthy|(uint|string)` -> 'truthy', '(uint|string)'
  var union_items = [];
  var paren = 0;
  var start = 0;
  for (var i = 0; i <= type_expression.length; i++) {
    var letter = type_expression[i];
    if (letter === '(') paren++;
    else if (letter === ')') paren--;
    else if (letter === '|' && !paren || !letter) {
      union_items.push(type_expression.slice(start, i));
      start = i + 1;
    }
  }
  if (union_items.length > 1) {
    var types = union_items.map(type_parser);
    return new IRUnionType(types);
  }

  // TODO: For min and max array count, I'm thinking [1-5], for minimum of 1, and maximum of 6.
  var array_expression_match = type_expression.match(/^(.*)\[\]$/);
  if (array_expression_match) {
    var type = type_parser(array_expression_match[1]);
    return new IRArrayType(type, 0);
  }

  switch (type_expression) {
  // TODO: What expression yields IRNullType?
  case 'boolean':
    return new IRBooleanType();
  case 'void':
    return new IRVoidType();
  case 'any':
    return new IRAnyType();
  case 'int':
    return new IRIntegerType();
  case 'uint':
    return new IRUnsignedIntegerType();
  case 'falsy':
    return new IRFalsyType();
  case 'truthy':
    return new IRTruthyType();
  case 'string':
    return new IRStringType();
  case 'number':
    return new IRNumberType();
  case 'element':
    // TODO: This type has no real significance since element as arg params need to be able to accept elements and non-elements.
    return new IRAnyType();
  case 'placement':
    return new IRDOMPlacementType();
  default:
    if (/\s/g.test(type_expression)) {
      throw new Error("Whitespace not allowed in type expression: " + type_expression);
    }
    var parse_result = esprima.parse(type_expression);
    var expression = parse_result.body[0].expression;
    if (expression.type !== 'Literal') {
      throw new Error("Invalid type expression " + type_expression);
    }
    return new IRExactValueType(expression.value);
  }
}

module.exports = type_parser;
