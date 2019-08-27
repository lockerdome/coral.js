"use strict";

// TODO Migrate all the IRType.allow code to use the new register_handler paradigm
var IRType = require('./type');
var IRUnionType = require('./types/union');
var IRAnyPermittingUnionType = require('./types/any_permitting_union');
var IRVoidType = require('./types/void');
var IRAnyType = require('./types/any');
var IRBooleanType = require('./types/boolean');
var IRTruthyType = require('./types/truthy');
var IRFalsyType = require('./types/falsy');
var IRStringType = require('./types/string');
var dispatch_array = [];

function DispatchElement (slot_evaluator, input_evaluator, dispatch_function) {
  this.evaluator = function (slot_type, input_type) {
    return slot_evaluator(slot_type) && input_evaluator(input_type);
  };
  this.dispatch_function = dispatch_function;
}

/**
 * @param {function} slot_evaluator Slot IRType checker
 * @param {function} input_evaluator Input IRType checker
 * @param {function} dispatch_function function to be called when slot_evaluator and input_evaluator resolve to be true
 */
function register_handler (slot_evaluator, input_evaluator, dispatch_function) {
  dispatch_array.push(new DispatchElement(slot_evaluator, input_evaluator, dispatch_function));
}

function is_ir_any_type (type) {
  return type instanceof IRAnyType;
}

function is_ir_any_permitting_union_type (type) {
  return type instanceof IRAnyPermittingUnionType;
}

function is_ir_union_type (type) {
  return type instanceof IRUnionType;
}

function is_not_ir_union_type (type) {
  return !is_ir_union_type(type);
}

function check_truthy_falsy_match (union_slot_type, input_type) {
  if (!(new IRBooleanType().equals(input_type)) &&
      !(new IRStringType().equals(input_type))) {
    return false;
  }

  var has_truthy = false, has_falsy = false;
  var truthy_type = new IRTruthyType();
  var falsy_type = new IRFalsyType();

  var union_slot_type_count = union_slot_type.get_type_count();

  for (var i = 0; i < union_slot_type_count; i++) {
    var slot_indexed_type = union_slot_type.get_type(i);
    if (truthy_type.equals(slot_indexed_type)) {
      has_truthy = true;
    } else if (falsy_type.equals(slot_indexed_type)) {
      has_falsy = true;
    }
  }

  return has_truthy && has_falsy;
}

register_handler(is_ir_any_permitting_union_type, is_ir_union_type, function (slot_type, input_type) {
  var type_count = input_type.get_type_count();

  for (var i = 0; i !== type_count; ++i) {
    var input_type_entry = input_type.get_type(i);
    if (input_type_entry instanceof IRAnyType) {
      continue;
    }
    if (!is_type_contained(slot_type, input_type_entry)) {
      return false;
    }
  }

  return true;
});


register_handler(is_ir_any_permitting_union_type, is_ir_any_type, function (slot_type, input_type) {
  return true;
});

// When slot is not an IRUnionType but the input is one
register_handler(is_not_ir_union_type, is_ir_union_type, function (slot_type, input_type) {
  var type_count = input_type.get_type_count();

  for (var i = 0; i !== type_count; ++i) {
    if (!is_type_contained(slot_type, input_type.get_type(i))) {
      return false;
    }
  }

  return true;
});

// When both the slot and input are IRUnionType
register_handler(is_ir_union_type, is_ir_union_type, function (slot_type, input_type) {
  var input_type_count = input_type.get_type_count();

  // When given a union, if all of the possibilities that the given union allows are allowed by at least one of our types, then we can consider it allowed to be used.
  for (var i = 0; i < input_type_count; i++) {
    var input_indexed_type = input_type.get_type(i);
    if (!is_type_contained(slot_type, input_indexed_type)) return false;
  }
  return true;
});

// When the slot is an IRUnionType but this input is not
register_handler(is_ir_union_type, is_not_ir_union_type, function (slot_type, input_type) {
  if (input_type instanceof IRVoidType || input_type instanceof IRAnyType) {
    return false;
  }

  var slot_type_count = slot_type.get_type_count();

  for (var i = 0; i < slot_type_count; i++) {
    var slot_indexed_type = slot_type.get_type(i);
    if (is_type_contained(slot_indexed_type, input_type)) {
      return true;
    }
  }

  return check_truthy_falsy_match(slot_type, input_type);
});

/**
 * @param {IRType} slot_type
 * @param {IRType} input_type
 * @returns {boolean} Whether the given input type is contained in the given slot type.
 */
function is_type_contained (slot_type, input_type) {
  var dispatch_array_length = dispatch_array.length;
  var dispatch_element;
  for (var i = 0; i !== dispatch_array_length; ++i) {
    dispatch_element = dispatch_array[i];
    if (dispatch_element.evaluator(slot_type, input_type)) {
      return dispatch_element.dispatch_function(slot_type, input_type);
    }
  }
  return slot_type.allows(input_type);
}

module.exports = is_type_contained;
