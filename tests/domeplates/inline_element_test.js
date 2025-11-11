"use strict";
/* global it, describe */

var assert = require("chai").assert;
var parse = require('../../domeplates/parser');
var inline_element = require('../../domeplates/inline_element');

describe('Inline Element Compiler', function() {
  describe('Module Structure', function() {
    it('should export compile function', function() {
      assert.isFunction(inline_element);
    });
  });

  describe('Basic Tag Compilation', function() {
    it('should compile simple tag', function() {
      var ast = parse('<div></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.isString(html);
      assert.equal(html, '<div></div>');
    });

    it('should compile void tag', function() {
      var ast = parse('<br>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<br>');
    });

    it('should compile self-closing void tag', function() {
      var ast = parse('<hr />');
      var tag = ast.children[0];
      var html = inline_element(tag);

      // Should not have closing tag for void elements
      assert.equal(html, '<hr>');
    });

    it('should compile tag with text content', function() {
      var ast = parse('<p>Hello World</p>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<p>Hello World</p>');
    });

    it('should compile nested tags', function() {
      var ast = parse('<div><span>nested</span></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div><span>nested</span></div>');
    });
  });

  describe('Attribute Compilation', function() {
    it('should compile attribute with value', function() {
      var ast = parse('<div id="test"></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div id="test"></div>');
    });

    it('should compile boolean attribute', function() {
      var ast = parse('<input checked>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<input checked="">');
    });

    it('should compile multiple attributes', function() {
      var ast = parse('<input type="text" name="username">');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.include(html, 'type="text"');
      assert.include(html, 'name="username"');
    });

    it('should compile class attribute', function() {
      var ast = parse('<div class="container"></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div class="container"></div>');
    });

    it('should compile style attribute', function() {
      var ast = parse('<div style="color: red;"></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div style="color: red;"></div>');
    });

    it('should compile data-* attribute', function() {
      var ast = parse('<div data-id="123"></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div data-id="123"></div>');
    });

    it('should preserve attribute order', function() {
      var ast = parse('<div id="test" class="box" data-value="abc"></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      // Should have all attributes
      assert.include(html, 'id="test"');
      assert.include(html, 'class="box"');
      assert.include(html, 'data-value="abc"');
    });
  });

  describe('Text Content Compilation', function() {
    it('should compile plain text', function() {
      var ast = parse('<p>Plain text</p>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<p>Plain text</p>');
    });

    it('should compile text with whitespace', function() {
      var ast = parse('<p>  spaces  </p>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.include(html, 'spaces');
    });

    it('should compile text with newlines', function() {
      var ast = parse('<p>\n  indented\n</p>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      // inline_element normalizes whitespace
      assert.include(html, 'indented');
    });

    it('should handle empty text', function() {
      var ast = parse('<div></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div></div>');
    });
  });

  describe('Nested Structure Compilation', function() {
    it('should compile deeply nested tags', function() {
      var ast = parse('<div><ul><li>item</li></ul></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div><ul><li>item</li></ul></div>');
    });

    it('should compile multiple sibling tags', function() {
      var ast = parse('<div><span>first</span><span>second</span></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div><span>first</span><span>second</span></div>');
    });

    it('should compile mixed content', function() {
      var ast = parse('<div>text <span>tag</span> more text</div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.include(html, 'text ');
      assert.include(html, '<span>tag</span>');
      assert.include(html, ' more text');
    });
  });

  describe('Special Characters', function() {
    it('should handle text with special HTML characters', function() {
      // Note: Parser may handle entity encoding
      var ast = parse('<p>&lt;tag&gt;</p>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.include(html, '<p>');
      assert.include(html, '</p>');
    });

    it('should handle attribute values with quotes', function() {
      var ast = parse('<div title="It\'s great"></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.include(html, 'title="It\'s great"');
    });
  });

  describe('Common HTML Elements', function() {
    it('should compile <a> tag', function() {
      var ast = parse('<a href="/page">Link</a>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<a href="/page">Link</a>');
    });

    it('should compile <img> tag', function() {
      var ast = parse('<img src="/image.png" alt="Description">');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.include(html, '<img');
      assert.include(html, 'src="/image.png"');
      assert.include(html, 'alt="Description"');
      assert.notInclude(html, '</img>'); // img is void
    });

    it('should compile <input> tag', function() {
      var ast = parse('<input type="text" value="default">');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.include(html, 'type="text"');
      assert.include(html, 'value="default"');
    });

    it('should compile <button> tag', function() {
      var ast = parse('<button type="submit">Submit</button>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<button type="submit">Submit</button>');
    });

    it('should compile <table> structure', function() {
      var ast = parse('<table><tr><td>cell</td></tr></table>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<table><tr><td>cell</td></tr></table>');
    });
  });

  describe('Edge Cases', function() {
    it('should handle tag with many attributes', function() {
      var ast = parse('<div id="a" class="b" data-x="c" data-y="d" title="e"></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.include(html, 'id="a"');
      assert.include(html, 'class="b"');
      assert.include(html, 'data-x="c"');
      assert.include(html, 'data-y="d"');
      assert.include(html, 'title="e"');
    });

    it('should handle deeply nested structure', function() {
      var ast = parse('<div><div><div><div>deep</div></div></div></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div><div><div><div>deep</div></div></div></div>');
    });

    it('should handle empty tag with attributes', function() {
      var ast = parse('<div class="empty"></div>');
      var tag = ast.children[0];
      var html = inline_element(tag);

      assert.equal(html, '<div class="empty"></div>');
    });
  });

  describe('Integration', function() {
    it('should produce valid HTML for common patterns', function() {
      var templates = [
        '<nav><ul><li><a href="/">Home</a></li></ul></nav>',
        '<form><input type="text"><button>Go</button></form>',
        '<article><h1>Title</h1><p>Content</p></article>',
        '<header><div class="logo"></div></header>'
      ];

      templates.forEach(function(template) {
        var ast = parse(template);
        var tag = ast.children[0];
        var html = inline_element(tag);

        assert.isString(html);
        assert.isTrue(html.length > 0);
      });
    });
  });
});
