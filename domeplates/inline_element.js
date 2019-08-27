"use strict";

var htmlEntities = new (require('html-entities').XmlEntities)();
var CodeBuffer = require('../lib/code_buffer');
var inherits = require('util').inherits;
module.exports = compile;

function compile(ast) {
  return new Compiler(ast).compile();
}

function Compiler(ast, opts) {
  CodeBuffer.call(this);
  this.ast = ast;
  opts = opts || {};
  this.num = 0;
  this.indent = 0;
  this.params = ['$i'];
}
inherits(Compiler, CodeBuffer);

Compiler.prototype.compile = function compile() {
  this['generate' + this.ast.type](this.ast);
  return this.buffer.join('');
};

Compiler.prototype.generateTag = function tagNode(tag) {
  var tagname = tag.name;
  this.push('<' + tagname);
  this.tagBodySection(tag);
  if (tag.subtype !== 'void') {
    this.push('</' + tagname + '>');
  }
};

Compiler.prototype.generateInlineTag = function inputTagNode(tag) {
  this.push(tag.value);
};

Compiler.prototype.tagBodySection = function tagbody(tag) {
  var attributes = tag.attributes;
  var children = tag.children;
  for (var a = 0; a !== attributes.length; ++a) {
    this['generate' + attributes[a].type](attributes[a]);
  }
  this.push('>');
  for (var i = 0; i !== children.length; ++i) {
    var child = children[i];
    var child_sym = this['generate' + child.type](child);
  }
};

Compiler.prototype.generateClassAttributeStatic = function classAttributeStaticNode(attr) {
  this.push(' class="' + this.returnText(attr.value) + '"');
};

Compiler.prototype.generateClassAttribute = function classAttributeNode(attr) {
  this.push(' class="' + this.partsToArray(attr.value) + '"');
};

Compiler.prototype.generateStyleAttribute = function styleAttributeNode(attr) {
  this.push(' style="' + this.partsToArray(attr.value) + '"');
};

Compiler.prototype.generateDataAttribute = function dataAttributeNode(attr) {
  this.push(' data-' + attr.name + '="' + this.partsToArray(attr.value) + '"');
};

// TODO: double check that this works with flag attributes
Compiler.prototype.generateAttribute = function attributeNode(attr) {
  this.push(' ' + attr.name + '="' + this.partsToArray(attr.value) + '"');
};

Compiler.prototype.generateInnerTextStatic = function innerTextStatic(txt) {
  this.push(this.returnText(txt.value));
};

Compiler.prototype.generateInnerText = function innerText(txt) {
  this.push(this.partsToArray(txt.value));
};

Compiler.prototype.partsToArray = function partsToArray(parts) {
  var self = this;
  return parts.map(function (node) {
    return self['return' + node.type](node);
  }).join('');
};

Compiler.prototype.returnText = function textNode(txt) {
  return txt.value;
};

Compiler.prototype.generateText = function () {};
