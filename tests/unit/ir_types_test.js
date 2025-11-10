"use strict";
/* global it, describe */

var assert = require("chai").assert;
var IRType = require('../../ir/type');
var IRStringType = require('../../ir/types/string');
var IRNumberType = require('../../ir/types/number');
var IRBooleanType = require('../../ir/types/boolean');
var IRVoidType = require('../../ir/types/void');
var IRNullType = require('../../ir/types/null');
var IRExactValueType = require('../../ir/types/exact_value');

describe('IR Type System', function() {
  describe('IRType', function() {
    it('should throw error for unimplemented allows', function() {
      var type = new IRType();
      assert.throws(function() {
        type.allows(new IRType());
      }, /has not overrided allows/);
    });

    it('should throw error for unimplemented equals', function() {
      var type = new IRType();
      assert.throws(function() {
        type.equals(new IRType());
      }, /has not overrided equals/);
    });

    it('should throw error for unimplemented toString', function() {
      var type = new IRType();
      assert.throws(function() {
        type.toString();
      }, /has not implemented toString/);
    });
  });

  describe('IRStringType', function() {
    var stringType;

    beforeEach(function() {
      stringType = new IRStringType();
    });

    it('should be instance of IRType', function() {
      assert.instanceOf(stringType, IRType);
    });

    it('should equal another IRStringType', function() {
      var other = new IRStringType();
      assert.isTrue(stringType.equals(other));
    });

    it('should not equal different types', function() {
      assert.isFalse(stringType.equals(new IRNumberType()));
      assert.isFalse(stringType.equals(new IRBooleanType()));
    });

    it('should allow IRStringType', function() {
      var other = new IRStringType();
      assert.isTrue(stringType.allows(other));
    });

    it('should allow IRExactValueType with string value', function() {
      var exactType = new IRExactValueType('test');
      assert.isTrue(stringType.allows(exactType));
    });

    it('should not allow IRExactValueType with non-string value', function() {
      var exactType = new IRExactValueType(42);
      assert.isFalse(stringType.allows(exactType));
    });

    it('should have string representation', function() {
      assert.equal(stringType.toString(), 'string');
    });
  });

  describe('IRNumberType', function() {
    var numberType;

    beforeEach(function() {
      numberType = new IRNumberType();
    });

    it('should be instance of IRType', function() {
      assert.instanceOf(numberType, IRType);
    });

    it('should equal another IRNumberType', function() {
      var other = new IRNumberType();
      assert.isTrue(numberType.equals(other));
    });

    it('should not equal different types', function() {
      assert.isFalse(numberType.equals(new IRStringType()));
      assert.isFalse(numberType.equals(new IRBooleanType()));
    });

    it('should allow IRNumberType', function() {
      var other = new IRNumberType();
      assert.isTrue(numberType.allows(other));
    });

    it('should allow IRExactValueType with number value', function() {
      var exactType = new IRExactValueType(42);
      assert.isTrue(numberType.allows(exactType));
    });

    it('should allow IRExactValueType with float value', function() {
      var exactType = new IRExactValueType(3.14);
      assert.isTrue(numberType.allows(exactType));
    });

    it('should not allow IRExactValueType with NaN', function() {
      var exactType = new IRExactValueType(NaN);
      assert.isFalse(numberType.allows(exactType));
    });

    it('should not allow IRExactValueType with non-number value', function() {
      var exactType = new IRExactValueType('test');
      assert.isFalse(numberType.allows(exactType));
    });

    it('should have string representation', function() {
      assert.equal(numberType.toString(), 'number');
    });
  });

  describe('IRBooleanType', function() {
    var booleanType;

    beforeEach(function() {
      booleanType = new IRBooleanType();
    });

    it('should be instance of IRType', function() {
      assert.instanceOf(booleanType, IRType);
    });

    it('should equal another IRBooleanType', function() {
      var other = new IRBooleanType();
      assert.isTrue(booleanType.equals(other));
    });

    it('should not equal different types', function() {
      assert.isFalse(booleanType.equals(new IRStringType()));
      assert.isFalse(booleanType.equals(new IRNumberType()));
    });

    it('should allow IRBooleanType', function() {
      var other = new IRBooleanType();
      assert.isTrue(booleanType.allows(other));
    });

    it('should allow IRExactValueType with true', function() {
      var exactType = new IRExactValueType(true);
      assert.isTrue(booleanType.allows(exactType));
    });

    it('should allow IRExactValueType with false', function() {
      var exactType = new IRExactValueType(false);
      assert.isTrue(booleanType.allows(exactType));
    });

    it('should not allow IRExactValueType with truthy non-boolean', function() {
      var exactType = new IRExactValueType(1);
      assert.isFalse(booleanType.allows(exactType));
    });

    it('should have string representation', function() {
      assert.equal(booleanType.toString(), 'boolean');
    });
  });

  describe('IRVoidType', function() {
    var voidType;

    beforeEach(function() {
      voidType = new IRVoidType();
    });

    it('should be instance of IRType', function() {
      assert.instanceOf(voidType, IRType);
    });

    it('should equal another IRVoidType', function() {
      var other = new IRVoidType();
      assert.isTrue(voidType.equals(other));
    });

    it('should not equal different types', function() {
      assert.isFalse(voidType.equals(new IRStringType()));
    });

    it('should not allow any type (including itself)', function() {
      var other = new IRVoidType();
      assert.isFalse(voidType.allows(other));
      assert.isFalse(voidType.allows(new IRStringType()));
      assert.isFalse(voidType.allows(new IRNumberType()));
    });

    it('should have string representation', function() {
      assert.equal(voidType.toString(), 'void');
    });
  });

  describe('IRNullType', function() {
    var nullType;

    beforeEach(function() {
      nullType = new IRNullType();
    });

    it('should be instance of IRType', function() {
      assert.instanceOf(nullType, IRType);
    });

    it('should equal another IRNullType', function() {
      var other = new IRNullType();
      assert.isTrue(nullType.equals(other));
    });

    it('should not equal different types', function() {
      assert.isFalse(nullType.equals(new IRStringType()));
    });

    it('should allow IRNullType', function() {
      var other = new IRNullType();
      assert.isTrue(nullType.allows(other));
    });

    it('should allow IRExactValueType with null', function() {
      var exactType = new IRExactValueType(null);
      assert.isTrue(nullType.allows(exactType));
    });

    it('should have string representation', function() {
      assert.equal(nullType.toString(), 'null');
    });
  });

  describe('IRExactValueType', function() {
    it('should store the exact value', function() {
      var exactType = new IRExactValueType(42);
      assert.equal(exactType.get_value(), 42);
    });

    it('should equal same exact value', function() {
      var type1 = new IRExactValueType(42);
      var type2 = new IRExactValueType(42);
      assert.isTrue(type1.equals(type2));
    });

    it('should not equal different exact values', function() {
      var type1 = new IRExactValueType(42);
      var type2 = new IRExactValueType(43);
      assert.isFalse(type1.equals(type2));
    });

    it('should allow same exact value', function() {
      var type1 = new IRExactValueType(42);
      var type2 = new IRExactValueType(42);
      assert.isTrue(type1.allows(type2));
    });

    it('should handle string values', function() {
      var exactType = new IRExactValueType('test');
      assert.equal(exactType.get_value(), 'test');
    });

    it('should handle boolean values', function() {
      var exactType = new IRExactValueType(true);
      assert.equal(exactType.get_value(), true);
    });

    it('should handle null value', function() {
      var exactType = new IRExactValueType(null);
      assert.equal(exactType.get_value(), null);
    });

    it('should have string representation', function() {
      var exactType = new IRExactValueType(42);
      var str = exactType.toString();
      assert.isString(str);
      assert.include(str, '42');
    });
  });

  describe('Type Compatibility', function() {
    it('should handle cross-type comparisons correctly', function() {
      var stringType = new IRStringType();
      var numberType = new IRNumberType();
      var booleanType = new IRBooleanType();

      assert.isFalse(stringType.allows(numberType));
      assert.isFalse(numberType.allows(stringType));
      assert.isFalse(booleanType.allows(stringType));
      assert.isFalse(booleanType.allows(numberType));
    });

    it('should handle exact values correctly across types', function() {
      var stringType = new IRStringType();
      var numberType = new IRNumberType();
      var booleanType = new IRBooleanType();

      var stringExact = new IRExactValueType('test');
      var numberExact = new IRExactValueType(42);
      var boolExact = new IRExactValueType(true);

      assert.isTrue(stringType.allows(stringExact));
      assert.isFalse(stringType.allows(numberExact));
      assert.isFalse(stringType.allows(boolExact));

      assert.isTrue(numberType.allows(numberExact));
      assert.isFalse(numberType.allows(stringExact));
      assert.isFalse(numberType.allows(boolExact));

      assert.isTrue(booleanType.allows(boolExact));
      assert.isFalse(booleanType.allows(stringExact));
      assert.isFalse(booleanType.allows(numberExact));
    });
  });
});
