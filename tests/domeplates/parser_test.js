"use strict";
/* global it, describe */

var assert = require("chai").assert;
var parse = require('../../domeplates/parser');

describe('Parser', function() {
  describe('Basic Structure', function() {
    it('should export parse function', function() {
      assert.isFunction(parse);
    });

    it('should parse empty string', function() {
      var ast = parse('');
      assert.equal(ast.type, 'Template');
      assert.isArray(ast.children);
      assert.equal(ast.children.length, 0);
    });

    it('should parse plain text', function() {
      var ast = parse('Hello World');
      assert.equal(ast.type, 'Template');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'Text');
      assert.equal(ast.children[0].value, 'Hello World');
    });
  });

  describe('Tag Parsing', function() {
    it('should parse simple tag', function() {
      var ast = parse('<div></div>');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'Tag');
      assert.equal(ast.children[0].name, 'div');
      assert.isArray(ast.children[0].attributes);
      assert.isArray(ast.children[0].children);
    });

    it('should parse void tag', function() {
      var ast = parse('<br>');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'Tag');
      assert.equal(ast.children[0].subtype, 'void');
      assert.equal(ast.children[0].name, 'br');
    });

    it('should parse self-closing tag', function() {
      var ast = parse('<hr />');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'Tag');
      assert.equal(ast.children[0].subtype, 'void');
      assert.equal(ast.children[0].name, 'hr');
    });

    it('should parse nested tags', function() {
      var ast = parse('<div><span></span></div>');
      assert.equal(ast.children.length, 1);
      var div = ast.children[0];
      assert.equal(div.name, 'div');
      assert.equal(div.children.length, 1);
      assert.equal(div.children[0].type, 'Tag');
      assert.equal(div.children[0].name, 'span');
    });

    it('should parse tag with text content', function() {
      var ast = parse('<p>Hello</p>');
      var tag = ast.children[0];
      assert.equal(tag.name, 'p');
      assert.equal(tag.children.length, 1);
      assert.equal(tag.children[0].type, 'InnerTextStatic');
      assert.equal(tag.children[0].value.value, 'Hello');
    });
  });

  describe('Attribute Parsing', function() {
    it('should parse attribute with text value', function() {
      var ast = parse('<div id="test"></div>');
      var tag = ast.children[0];
      assert.equal(tag.attributes.length, 1);
      assert.equal(tag.attributes[0].type, 'Attribute');
      assert.equal(tag.attributes[0].name, 'id');
      assert.equal(tag.attributes[0].value.length, 1);
      assert.equal(tag.attributes[0].value[0].type, 'Text');
      assert.equal(tag.attributes[0].value[0].value, 'test');
    });

    it('should parse boolean attribute', function() {
      var ast = parse('<input checked>');
      var tag = ast.children[0];
      assert.equal(tag.attributes.length, 1);
      assert.equal(tag.attributes[0].type, 'Attribute');
      assert.equal(tag.attributes[0].name, 'checked');
      assert.equal(tag.attributes[0].value.length, 0);
    });

    it('should parse class attribute (remapped to className)', function() {
      var ast = parse('<div class="test"></div>');
      var tag = ast.children[0];
      assert.equal(tag.attributes.length, 1);
      assert.equal(tag.attributes[0].type, 'ClassAttributeStatic');
      assert.equal(tag.attributes[0].value.value, 'test');
    });

    it('should parse class attribute with variable', function() {
      var ast = parse('<div class="{{active}}"></div>');
      var tag = ast.children[0];
      assert.equal(tag.attributes.length, 1);
      assert.equal(tag.attributes[0].type, 'ClassAttribute1');
      assert.equal(tag.attributes[0].value.type, 'Variable');
      assert.equal(tag.attributes[0].value.name, 'active');
    });

    it('should parse class attribute with multiple parts', function() {
      var ast = parse('<div class="btn {{active}}"></div>');
      var tag = ast.children[0];
      assert.equal(tag.attributes[0].type, 'ClassAttribute');
      assert.equal(tag.attributes[0].value.length, 2);
      assert.equal(tag.attributes[0].value[0].type, 'Text');
      assert.equal(tag.attributes[0].value[1].type, 'Variable');
    });

    it('should parse style attribute', function() {
      var ast = parse('<div style="color: red;"></div>');
      var tag = ast.children[0];
      assert.equal(tag.attributes.length, 1);
      assert.equal(tag.attributes[0].type, 'StyleAttribute');
    });

    it('should parse data-* attribute', function() {
      var ast = parse('<div data-id="123"></div>');
      var tag = ast.children[0];
      assert.equal(tag.attributes.length, 1);
      assert.equal(tag.attributes[0].type, 'DataAttribute');
      assert.equal(tag.attributes[0].name, 'id');
    });

    it('should parse contenteditable attribute (remapped to contentEditable)', function() {
      var ast = parse('<div contenteditable="true"></div>');
      var tag = ast.children[0];
      assert.equal(tag.attributes.length, 1);
      assert.equal(tag.attributes[0].type, 'Attribute');
      assert.equal(tag.attributes[0].name, 'contentEditable');
    });

    it('should parse multiple attributes', function() {
      var ast = parse('<input type="text" name="username" required>');
      var tag = ast.children[0];
      assert.equal(tag.attributes.length, 3);
      assert.equal(tag.attributes[0].name, 'type');
      assert.equal(tag.attributes[1].name, 'name');
      assert.equal(tag.attributes[2].name, 'required');
    });
  });

  describe('Variable Parsing', function() {
    it('should parse variable', function() {
      var ast = parse('{{name}}');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'Variable');
      assert.equal(ast.children[0].name, 'name');
    });

    it('should parse triple variable', function() {
      var ast = parse('{{{html}}}');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'TripleVariable');
      assert.equal(ast.children[0].name, 'html');
    });

    it('should parse variable with property access', function() {
      var ast = parse('{{user.name}}');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'Variable');
      assert.equal(ast.children[0].name, 'user.name');
    });

    it('should throw error for empty variable', function() {
      assert.throws(function() {
        parse('{{}}');
      }, /Variable templates must not be empty/);
    });

    it('should throw error for empty triple variable', function() {
      assert.throws(function() {
        parse('{{{}}}');
      }, /Triple variable templates must not be empty/);
    });
  });

  describe('Inner Text Parsing', function() {
    it('should parse static inner text', function() {
      var ast = parse('<div>Hello</div>');
      var tag = ast.children[0];
      assert.equal(tag.children.length, 1);
      assert.equal(tag.children[0].type, 'InnerTextStatic');
      assert.equal(tag.children[0].value.value, 'Hello');
    });

    it('should parse dynamic inner text with variable', function() {
      var ast = parse('<div>Hello {{name}}</div>');
      var tag = ast.children[0];
      assert.equal(tag.children.length, 1);
      assert.equal(tag.children[0].type, 'InnerText');
      assert.equal(tag.children[0].value.length, 2);
      assert.equal(tag.children[0].value[0].type, 'Text');
      assert.equal(tag.children[0].value[1].type, 'Variable');
    });

    it('should parse inner text with multiple variables', function() {
      var ast = parse('<div>{{first}} {{last}}</div>');
      var tag = ast.children[0];
      assert.equal(tag.children[0].type, 'InnerText');
      assert.equal(tag.children[0].value.length, 3);
      assert.equal(tag.children[0].value[0].type, 'Variable');
      assert.equal(tag.children[0].value[1].type, 'Text');
      assert.equal(tag.children[0].value[2].type, 'Variable');
    });

    it('should parse inner text with nested tags', function() {
      var ast = parse('<div>Hello <span>World</span></div>');
      var tag = ast.children[0];
      assert.equal(tag.children.length, 2);
      assert.equal(tag.children[0].type, 'InnerText');
      assert.equal(tag.children[1].type, 'Tag');
    });
  });

  describe('Conditional Parsing', function() {
    it('should parse if statement', function() {
      var ast = parse('{{#if condition}}content{{#endif}}');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'IfStatement');
      assert.equal(ast.children[0].condition.type, 'Variable');
      assert.equal(ast.children[0].condition.name, 'condition');
      assert.isArray(ast.children[0].consequent);
      assert.equal(ast.children[0].consequent.length, 1);
    });

    it('should parse if/else statement', function() {
      var ast = parse('{{#if condition}}yes{{#else}}no{{#endif}}');
      var ifNode = ast.children[0];
      assert.equal(ifNode.type, 'IfStatement');
      assert.equal(ifNode.consequent.length, 1);
      assert.isNotNull(ifNode.alternate);
      assert.equal(ifNode.alternate.type, 'Else');
      assert.equal(ifNode.alternate.children.length, 1);
    });

    it('should parse if/elseif/else statement', function() {
      var ast = parse('{{#if a}}A{{#elseif b}}B{{#else}}C{{#endif}}');
      var ifNode = ast.children[0];
      assert.equal(ifNode.type, 'IfStatement');
      assert.equal(ifNode.alternate.type, 'ElseIfStatement');
      assert.equal(ifNode.alternate.condition.name, 'b');
      assert.equal(ifNode.alternate.alternate.type, 'Else');
    });

    it('should parse nested if statements', function() {
      var ast = parse('{{#if outer}}{{#if inner}}nested{{#endif}}{{#endif}}');
      var outerIf = ast.children[0];
      assert.equal(outerIf.type, 'IfStatement');
      assert.equal(outerIf.consequent.length, 1);
      assert.equal(outerIf.consequent[0].type, 'IfStatement');
    });

    it('should parse if with tag content', function() {
      var ast = parse('{{#if show}}<div>Content</div>{{#endif}}');
      var ifNode = ast.children[0];
      assert.equal(ifNode.consequent.length, 1);
      assert.equal(ifNode.consequent[0].type, 'Tag');
    });

    it('should throw error for unclosed if', function() {
      assert.throws(function() {
        parse('{{#if condition}}content');
      }, /Unexpected end of input. Should have an endIf/);
    });

    it('should throw error for malformed else', function() {
      assert.throws(function() {
        parse('{{#if a}}A{{#else somethingwrong}}B{{#endif}}');
      }, /Invalid operator #else/);
    });
  });

  describe('Comment Handling', function() {
    it('should ignore top-level comments', function() {
      var ast = parse('<!-- comment --><div></div>');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'Tag');
    });
  });

  describe('Complex Templates', function() {
    it('should parse template with mixed content', function() {
      var ast = parse('<div class="{{cls}}">Hello {{name}}, <span>welcome</span>!</div>');
      assert.equal(ast.children.length, 1);
      var tag = ast.children[0];
      assert.equal(tag.type, 'Tag');
      assert.equal(tag.attributes.length, 1);
      assert.isTrue(tag.children.length > 0);
    });

    it('should parse template with multiple root nodes', function() {
      var ast = parse('<div>First</div><span>Second</span>');
      assert.equal(ast.children.length, 2);
      assert.equal(ast.children[0].name, 'div');
      assert.equal(ast.children[1].name, 'span');
    });

    it('should parse template with conditional and tags', function() {
      var ast = parse('{{#if show}}<span>Shown</span>{{#else}}<span>Hidden</span>{{#endif}}');
      assert.equal(ast.children.length, 1);
      assert.equal(ast.children[0].type, 'IfStatement');
    });
  });

  describe('Error Handling', function() {
    it('should throw error for invalid top-level node', function() {
      // This would depend on lexer producing an unexpected token type
      // Testing error handling indirectly through malformed templates
      assert.throws(function() {
        parse('{{#endif}}'); // Extra endIf without matching if
      }, /Invalid Node.*in the top level/);
    });

    it('should include fileName in parse', function() {
      var ast = parse('<div></div>', 'test.html');
      assert.equal(ast.fileName, 'test.html');
    });
  });

  describe('Token Information', function() {
    it('should preserve token information in AST nodes', function() {
      var ast = parse('<div></div>');
      var tag = ast.children[0];
      assert.isDefined(tag.token);
      assert.isDefined(tag.token.type);
    });
  });
});
