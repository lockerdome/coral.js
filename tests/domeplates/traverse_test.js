"use strict";
/* global it, describe, beforeEach */

var assert = require("chai").assert;
var parse = require('../../domeplates/parser');
var traverse_module = require('../../domeplates/traverse');

describe('Traverse', function() {
  var traverse = traverse_module.traverse;
  var collapse_template = traverse_module.collapse_template;

  describe('traverse function', function() {
    it('should export traverse function', function() {
      assert.isFunction(traverse);
    });

    it('should call enter for each node', function() {
      var ast = parse('<div><span>text</span></div>');
      var enterCount = 0;
      traverse(ast, function() {
        enterCount++;
      });
      assert.isTrue(enterCount > 0, 'Should call enter for nodes');
    });

    it('should call leave for each node when provided', function() {
      var ast = parse('<div><span>text</span></div>');
      var leaveCount = 0;
      traverse(ast, function() {}, function() {
        leaveCount++;
      });
      assert.isTrue(leaveCount > 0, 'Should call leave for nodes');
    });

    it('should traverse Template nodes', function() {
      var ast = parse('<div></div>');
      var types = [];
      traverse(ast, function(node) {
        types.push(node.type);
      });
      assert.include(types, 'Template');
      assert.include(types, 'Tag');
    });

    it('should traverse Tag children', function() {
      var ast = parse('<div><span></span></div>');
      var tagCount = 0;
      traverse(ast, function(node) {
        if (node.type === 'Tag') tagCount++;
      });
      assert.equal(tagCount, 2, 'Should traverse both div and span');
    });

    it('should traverse Tag attributes', function() {
      var ast = parse('<div id="test"></div>');
      var foundAttribute = false;
      traverse(ast, function(node) {
        if (node.type === 'Attribute') foundAttribute = true;
      });
      assert.isTrue(foundAttribute, 'Should traverse attribute nodes');
    });

    it('should traverse ClassAttribute1', function() {
      var ast = parse('<div class="{{cls}}"></div>');
      var foundVariable = false;
      traverse(ast, function(node) {
        if (node.type === 'Variable') foundVariable = true;
      });
      assert.isTrue(foundVariable, 'Should traverse into ClassAttribute1 value');
    });

    it('should traverse ClassAttribute', function() {
      var ast = parse('<div class="btn {{active}}"></div>');
      var types = [];
      traverse(ast, function(node) {
        types.push(node.type);
      });
      assert.include(types, 'ClassAttribute');
      assert.include(types, 'Variable');
    });

    it('should traverse InnerTextStatic', function() {
      var ast = parse('<div>text</div>');
      var foundText = false;
      traverse(ast, function(node) {
        if (node.type === 'Text') foundText = true;
      });
      assert.isTrue(foundText, 'Should traverse InnerTextStatic value');
    });

    it('should traverse InnerText', function() {
      var ast = parse('<div>Hello {{name}}</div>');
      var foundVariable = false;
      traverse(ast, function(node) {
        if (node.type === 'Variable') foundVariable = true;
      });
      assert.isTrue(foundVariable, 'Should traverse InnerText value list');
    });

    it('should traverse StyleAttribute', function() {
      var ast = parse('<div style="color: {{color}};"></div>');
      var foundVariable = false;
      traverse(ast, function(node) {
        if (node.type === 'Variable') foundVariable = true;
      });
      assert.isTrue(foundVariable, 'Should traverse StyleAttribute values');
    });

    it('should traverse DataAttribute', function() {
      var ast = parse('<div data-id="{{id}}"></div>');
      var foundVariable = false;
      traverse(ast, function(node) {
        if (node.type === 'Variable') foundVariable = true;
      });
      assert.isTrue(foundVariable, 'Should traverse DataAttribute values');
    });

    it('should traverse IfStatement', function() {
      var ast = parse('{{#if condition}}content{{#endif}}');
      var types = [];
      traverse(ast, function(node) {
        types.push(node.type);
      });
      assert.include(types, 'IfStatement');
      assert.include(types, 'Variable'); // condition
      assert.include(types, 'Text'); // consequent
    });

    it('should traverse IfStatement alternate', function() {
      var ast = parse('{{#if a}}yes{{#else}}no{{#endif}}');
      var types = [];
      traverse(ast, function(node) {
        types.push(node.type);
      });
      assert.include(types, 'IfStatement');
      assert.include(types, 'Else');
    });

    it('should traverse ElseIfStatement', function() {
      var ast = parse('{{#if a}}A{{#elseif b}}B{{#endif}}');
      var types = [];
      traverse(ast, function(node) {
        types.push(node.type);
      });
      assert.include(types, 'ElseIfStatement');
    });

    it('should traverse Else', function() {
      var ast = parse('{{#if a}}A{{#else}}B{{#endif}}');
      var types = [];
      traverse(ast, function(node) {
        types.push(node.type);
      });
      assert.include(types, 'Else');
    });

    it('should call leave after children are processed', function() {
      var ast = parse('<div><span></span></div>');
      var enterOrder = [];
      var leaveOrder = [];

      traverse(ast,
        function(node) {
          if (node.type === 'Tag') enterOrder.push(node.name);
        },
        function(node) {
          if (node.type === 'Tag') leaveOrder.push(node.name);
        }
      );

      // Enter should be div, span (parent first, then child)
      // Leave should be span, div (child first, then parent)
      assert.deepEqual(enterOrder, ['div', 'span']);
      assert.deepEqual(leaveOrder, ['span', 'div']);
    });
  });

  describe('collapse_template function', function() {
    it('should export collapse_template function', function() {
      assert.isFunction(collapse_template);
    });

    it('should not collapse tags with variables', function() {
      var ast = parse('<div>{{name}}</div>');
      collapse_template(ast);
      var tag = ast.children[0];
      assert.equal(tag.type, 'Tag', 'Should remain as Tag, not InlineTag');
      assert.isUndefined(tag.value, 'Should not have inline value');
    });

    it('should collapse static tags without variables', function() {
      var ast = parse('<div>static text</div>');
      collapse_template(ast);
      var tag = ast.children[0];
      assert.equal(tag.type, 'InlineTag', 'Should be converted to InlineTag');
      assert.isDefined(tag.value, 'Should have inline HTML value');
      assert.isString(tag.value);
    });

    it('should collapse nested static tags', function() {
      var ast = parse('<div><span>nested</span></div>');
      collapse_template(ast);
      var tag = ast.children[0];
      assert.equal(tag.type, 'InlineTag', 'Parent should be InlineTag');
    });

    it('should not collapse tags containing conditionals', function() {
      var ast = parse('<div>{{#if show}}text{{#endif}}</div>');
      collapse_template(ast);
      var tag = ast.children[0];
      assert.equal(tag.type, 'Tag', 'Should remain as Tag due to conditional');
    });

    it('should not collapse parent when child has variable', function() {
      var ast = parse('<div><span>{{name}}</span></div>');
      collapse_template(ast);
      var div = ast.children[0];
      assert.equal(div.type, 'Tag', 'Parent div should remain Tag');
      var span = div.children[0];
      assert.equal(span.type, 'Tag', 'Child span should remain Tag');
    });

    it('should collapse sibling static tags independently', function() {
      var ast = parse('<div>static</div><span>{{dynamic}}</span><p>also static</p>');
      collapse_template(ast);
      assert.equal(ast.children[0].type, 'InlineTag', 'First tag should be inlined');
      assert.equal(ast.children[1].type, 'Tag', 'Second tag with variable should not be inlined');
      assert.equal(ast.children[2].type, 'InlineTag', 'Third static tag should be inlined');
    });

    it('should not collapse tags with dynamic attributes', function() {
      var ast = parse('<div class="{{className}}">static</div>');
      collapse_template(ast);
      var tag = ast.children[0];
      assert.equal(tag.type, 'Tag', 'Should remain Tag due to dynamic attribute');
    });

    it('should collapse tags with only static attributes', function() {
      var ast = parse('<div id="test" class="static">content</div>');
      collapse_template(ast);
      var tag = ast.children[0];
      assert.equal(tag.type, 'InlineTag', 'Should be InlineTag with static attributes');
    });

    it('should handle empty tags', function() {
      var ast = parse('<div></div>');
      collapse_template(ast);
      var tag = ast.children[0];
      assert.equal(tag.type, 'InlineTag', 'Empty static tag should be inlined');
    });

    it('should handle void tags', function() {
      var ast = parse('<br>');
      collapse_template(ast);
      var tag = ast.children[0];
      assert.equal(tag.type, 'InlineTag', 'Void tag should be inlined');
    });

    it('should handle triple variables (marks as dirty)', function() {
      var ast = parse('<div>{{{html}}}</div>');
      collapse_template(ast);
      var tag = ast.children[0];
      assert.equal(tag.type, 'Tag', 'Should remain Tag due to triple variable');
    });

    it('should handle complex nested structure', function() {
      var ast = parse('<div><p>static 1</p><span>{{dynamic}}</span><p>static 2</p></div>');
      collapse_template(ast);
      var div = ast.children[0];
      // The div contains a dynamic child, so it can't be collapsed
      assert.equal(div.type, 'Tag', 'Parent with mixed children should remain Tag');

      // But the static p tags might be collapsed
      assert.equal(div.children[0].type, 'InlineTag', 'First p should be inlined');
      assert.equal(div.children[1].type, 'Tag', 'Span with variable should remain Tag');
      assert.equal(div.children[2].type, 'InlineTag', 'Second p should be inlined');
    });
  });

  describe('Integration', function() {
    it('should work with parser output', function() {
      var html = '<div class="container"><h1>Title</h1><p>{{content}}</p></div>';
      var ast = parse(html);

      // Should not throw
      assert.doesNotThrow(function() {
        collapse_template(ast);
      });

      // h1 should be inlined, p should not
      var div = ast.children[0];
      assert.equal(div.children[0].type, 'InlineTag', 'Static h1 should be inlined');
      assert.equal(div.children[1].type, 'Tag', 'Dynamic p should remain Tag');
    });
  });
});
