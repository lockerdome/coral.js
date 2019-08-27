"use strict";

var lexer = require('./lexer');
var notify = require('./notify');
module.exports = parse;

// TODO: suggest variable name in templates

var EXPRESSION = ['text', 'variable', 'tripleVariable', 'openTag', 'voidTag', 'ifStatement'];
var CONDITIONCONTINUATION = ['elseIfStatement', 'elseStatement'];
var VAR_TEXT = ['text', 'variable'];

function isType(typeClass, token) {
  return typeClass.indexOf(token.type) !== -1;
}

function parse(str, fileName) {
  return new Parser(str, fileName).parse();
}

function Parser(str, fileName) {
  this.str = str;
  this.fileName = fileName;
  this.lexer = lexer(this.str);
  this.cur = null;
}

Parser.prototype.getAttrName = function (name) {
  return {
    "class": "className",
    contenteditable: 'contentEditable'
  }[name] || name;
};

Parser.prototype.next = function () {
  var node = this.cur || this.lexer.nextToken();
  if (node && node.error) this.Error(node.error, node);
  this.cur = null;
  return node;
};

Parser.prototype.peek = function () {
  var node = this.cur;
  if (node) return node;
  this.cur = this.lexer.nextToken();
  return this.cur;
};

Parser.prototype.reset = function reset() {
  this.lexer = lexer(this.str);
};

Parser.prototype.parse = function parse() {
  var node = { type: 'Template', children: [], fileName: this.fileName, token: this.str };
  for (var token = this.next(); token; token = this.next()) {
    if (isType(['comment'], token)) continue;
    if (isType(EXPRESSION, token)) node.children.push(this[token.type](token));
    else this.Error('Invalid Node "' + token.type + '" in the top level.', token);
  }
  return node;
};

Parser.prototype.text = function text(token) {
  return { type: 'Text', value: token.value, token: token };
};

Parser.prototype.voidTag = function voidTag(token) {
  var node = { type: 'Tag', subtype: 'void', name: token.value, attributes: [], children: [], token: token };
  for (token = this.peek(); token; token = this.peek()) {
    if (isType(EXPRESSION, token) || isType(['closeTag'], token)) {
      break;
    }

    this.next();
    if (isType(['selfClose'], token)) {
      return node;
    } else if (isType(['attributeName'], token)) {
      node.attributes.push(this[token.type](token));
    } else {
      this.Error('Invalid Node "' + token.type + '" inside void tag.', token);
    }
  }
  return node;
};

Parser.prototype.openTag = function tag(token) {
  var node = { type: 'Tag', name: token.value, attributes: [], children: [], token: token };
  for (token = this.next(); token; token = this.next()) {
    if (isType(['selfClose', 'closeTag'], token)) return node;
    if (isType(EXPRESSION, token)) break;
    if (isType(['attributeName'], token)) node.attributes.push(this[token.type](token));
    else this.Error('Invalid Node "' + token.type + '" inside open tag.', token);
  }
  var hasDynamic = false;
  for (; token; token = this.next()) {
    if (isType(['closeTag'], token)) break;
    if (isType(['comment'], token)) continue;
    if (isType(VAR_TEXT, token)) node.children.push(this.innerText(token, hasDynamic));
    else if (isType(EXPRESSION, token)) {
      hasDynamic = true;
      node.children.push(this[token.type](token));
    }
    else this.Error('Invalid Node "' + token.type + '" inside tag.', token);
  }
  return node;
};

Parser.prototype.innerText = function (token, hasDynamic) {
  var value = [];
  for (; token; token = this.peek()) {
    if (isType(['closeTag'], token)) break;
    if (isType(['comment'], token)) {
      this.next();
      continue;
    }
    if (!isType(VAR_TEXT, token)) {
      hasDynamic = true;
      break;
    }
    if (this.cur === token) this.next();
    if (isType(['variable'], token)) hasDynamic = true;
    value.push(this[token.type](token));
  }
  if (!hasDynamic && value.length === 1) return { type: 'InnerTextStatic', value: value[0] };
  return { type: 'InnerText', value: value };
};

Parser.prototype.ifStatement = function (token) {
  var trimmed_value = token.value.trim();
  var first_space_index = trimmed_value.indexOf(' ');
  var condition_string = trimmed_value.slice(first_space_index).trim();
  var cond = this.variable({ value: condition_string });
  var type = token.type[0].toUpperCase() + token.type.slice(1);
  var node = { type: type, condition: cond, consequent: [], alternate: null, token: token };
  var hasDynamic = false;
  for (token = this.next(); token; token = this.next()) {
    if (isType(['endIfStatement'], token)) {
      return node;
    } else if (isType(CONDITIONCONTINUATION, token)) {
      node.alternate = this[token.type](token);
      return node;
    } else if (isType(EXPRESSION, token)) {
      if (isType(VAR_TEXT, token)) {
        node.consequent.push(this.innerText(token, hasDynamic));
      } else {
        hasDynamic = true;
        node.consequent.push(this[token.type](token));
      }
    } else {
      this.Error('Unexpected ' + token.type, token);
    }
  }
  throw new Error('Unexpected end of input. Should have an endIf!');
};
Parser.prototype.elseIfStatement = Parser.prototype.ifStatement;

Parser.prototype.elseStatement = function elseStatement(token) {
  var parts = token.value.trim().split(/\s+/);
  if (parts.length > 1) this.Error('Malformed else condition. No localNames allowed. You gave ' + token.value, token);
  var node = { type: 'Else', children: [], token: token };
  var hasDynamic = false;
  for (token = this.next(); token; token = this.next()) {
    if (isType(['endIfStatement'], token)) {
      return node;
    } else if (isType(VAR_TEXT, token)) {
      node.children.push(this.innerText(token, hasDynamic));
    } else if (isType(EXPRESSION, token)) {
      hasDynamic = true;
      node.children.push(this[token.type](token));
    } else {
      this.Error('Unexpected ' + token.type, token);
    }
  }
  throw new Error('Unexpected end of input. Should have an endIf!');
};

Parser.prototype.tripleVariable = function stashe(token) {
  if (token.value.trim().length === 0) {
    this.Error('Triple variable templates must not be empty', token);
  } else {
    return { type: 'TripleVariable', name: token.value, token: token };
  }
};

// TODO: MemberExpressions
Parser.prototype.variable = function (token) {
  if (token.value.trim().length === 0) {
    this.Error('Variable templates must not be empty', token);
  } else {
    return { type: 'Variable', name: token.value, token: token };
  }
};

Parser.prototype.endIfStatement = throwError("Extra endIfStatement");

function throwError(msg) {
  return function (token) {
    notify.Error(msg, token);
  };
}

Parser.prototype.attributeName = function attributeName(token) {
  var attrName = this.getAttrName(token.value);
  var value = [];
  var foundEnd = false;
  for (token = this.next(); token; token = this.next()) {
    if (isType(['attributeEnd'], token)) {
      foundEnd = true;
      break;
    } else if (isType(VAR_TEXT, token)) {
      value.push(this[token.type](token));
    } else {
      this.Error('Invalid Node "' + token.type + '" inside of attribute. ', token);
    }
  }
  if (!foundEnd) throw new Error('Unexpected end of input. Attribute never closed');
  if (attrName === 'className') {
    if (value.length === 1) {
      if (value[0].type === 'Text') {
        return { type: 'ClassAttributeStatic', value: value[0], token: token };
      } else {
        return { type: 'ClassAttribute1', value: value[0], token: token };
      }
    } else {
      return { type: 'ClassAttribute', value: value, token: token };
    }
  } else if (attrName === 'style') {
    return { type: 'StyleAttribute', value: value, token: token };
  } else if (/^data-/.test(attrName)) {
    var data_name = attrName.replace(/^data-/, '');
    return { type: 'DataAttribute', name: data_name, value: value, token: token };
  } else {
    return { type: 'Attribute', name: attrName, value: value, token: token };
  }
};

Parser.prototype.Error = function (msg, token) {
  notify.error(msg, this.fileName, token);
};
