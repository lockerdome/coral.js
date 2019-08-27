"use strict";

var IRAnyPermittingUnionType = require('./any_permitting_union');
var IRStringType = require('./string');
var IRNumberType = require('./number');
var IRBooleanType = require('./boolean');
var IRNullType = require('./null');
var IRAnyType = require('./any');
var is_type_contained = require ('../is_type_contained');

var IRStringUnionType = new IRAnyPermittingUnionType([new IRStringType(), new IRNumberType(), new IRBooleanType(), new IRNullType()]);

module.exports = function is_string_castable (type) {
  return is_type_contained(IRStringUnionType, type);
};
