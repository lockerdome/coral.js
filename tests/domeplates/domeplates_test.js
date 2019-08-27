"use strict";
/* global it, describe */

var assert = require("chai").assert;
var lexer = require('../../domeplates/lexer');

function checkTokens(data) {
  it(data.description, function (done) {
    var x = lexer(data.text);
    var tokens = x.allTokens();
    if (data.types) {
      var types = tokens.map(function (token) {
        return token.type;
      });
      assert.deepEqual(types, data.types, "Token types");
    }
    if (data.values) {
      var values = tokens.map(function (token) {
        return data.text.slice(token.start, token.end);
      });
      assert.deepEqual(values, data.values, "Token types");
    }
    if (data.debug) {
      console.log(tokens);
    }
    done();
  });
}

describe('parse tags', function() {
  checkTokens({
    description: 'can parse tags',
    text: '<div></div>',
    types: ['openTag', 'closeTag'],
    values: ['div', 'div']
  });

  checkTokens({
    description: 'can have whitespace',
    text: '<div>\n\n\t\t</div>',
    types: ['openTag', 'text', 'closeTag']
  });

  checkTokens({
    description: 'can have self closing tags',
    text: '<hr />',
    types: ['voidTag', 'selfClose']
  });

  checkTokens({
    description: 'can have nested self closing tags',
    text: '<div><hr /></div>',
    types: ['openTag', 'voidTag', 'selfClose', 'closeTag'],
    values: ['div', 'hr', '', 'div']
  });

  checkTokens({
    description: 'understands void tags',
    text: '<div><hr>test<br></div>',
    types: ['openTag', 'voidTag', 'text', 'voidTag', 'closeTag'],
    values: ['div', 'hr', 'test', 'br', 'div']
  });
});

describe('parse comments', function() {

  checkTokens({
    description: 'can have comments',
    text: '<div>\n<!-- Hello how -- are you? -->\n</div>',
    types: ['openTag', 'text', 'comment', 'text', 'closeTag']
  });

});

describe('staches', function () {

  checkTokens({
    description: 'can parse a  stache',
    text: '{{blah}}',
    types: ['variable'],
    values: ['blah']
  });

  it('wont parse a stache in a comment', function (done) {
    var x = lexer('<div>\n<!-- Hello how {{not a stache}} -- are you? -->\n{{stache}}</div>');
    assert.strictEqual(x.nextToken().type, 'openTag');
    assert.strictEqual(x.nextToken().type, 'text');
    assert.strictEqual(x.nextToken().type, 'comment');
    assert.strictEqual(x.nextToken().type, 'text');
    var stache = x.nextToken();
    assert.strictEqual(stache.type, 'variable');
    assert.strictEqual(x.nextToken().type, 'closeTag');
    done();
  });

  it('it can parse triple staches', function (done) {
    var x = lexer('<div>\n<!-- Hello how {{not a stache}} -- are you? -->\n{{{stache }} fake close}}}</div>');
    assert.strictEqual(x.nextToken().type, 'openTag');
    assert.strictEqual(x.nextToken().type, 'text');
    assert.strictEqual(x.nextToken().type, 'comment');
    assert.strictEqual(x.nextToken().type, 'text');
    var stache = x.nextToken();
    assert.strictEqual(stache.type, 'tripleVariable');
    assert.strictEqual(x.nextToken().type, 'closeTag');
    done();
  });
});

describe('text nodes', function () {

  it('parse text nodes', function (done) {
    var x = lexer('asdfasdf');
    assert.strictEqual(x.nextToken().type, 'text');
    done();
  });

  it('parse text in an html element', function (done) {
    var x = lexer('<div>\nHello how are you?</div>');
    assert.strictEqual(x.nextToken().type, 'openTag');
    assert.strictEqual(x.nextToken().type, 'text');
    assert.strictEqual(x.nextToken().type, 'closeTag');
    done();
  });

  it('parse text in an html element', function (done) {
    var x = lexer('<div>\nHello how are you, {{name}}?</div>');
    assert.strictEqual(x.nextToken().type, 'openTag');
    assert.strictEqual(x.nextToken().type, 'text');
    assert.strictEqual(x.nextToken().type, 'variable');
    assert.strictEqual(x.nextToken().type, 'text');
    assert.strictEqual(x.nextToken().type, 'closeTag');
    done();
  });

  checkTokens({
    description: 'Can have whitespace at beginning of a text node',
    text: '<div> Hello abc </div>',
    types: ['openTag', 'text', 'closeTag'],
    values: ['div', ' Hello abc ', 'div']
  });

});


describe('parse attributes', function () {

  checkTokens({
    description: 'can parse single attributes',
    text: '<input selected>',
    types: ['voidTag', 'attributeName', 'attributeEnd'],
    values: ['input', 'selected', '']
  });

  checkTokens({
    description: 'can parse multiple attr names',
    text: '<input selected blah />',
    types: ['voidTag', 'attributeName', 'attributeEnd', 'attributeName', 'attributeEnd', 'selfClose'],
    values: ['input', 'selected', '', 'blah', '', '']
  });

  checkTokens({
    description: 'can parse attribute with a value',
    text: '<div id="asdf"></div>',
    types: ['openTag', 'attributeName', 'text', 'attributeEnd', 'closeTag'],
    values: ['div', 'id', 'asdf', '', 'div']
  });

  checkTokens({
    description: 'can have variables as an attribute',
    text: '<div class="{{active}}"></div>',
    types: ['openTag', 'attributeName', 'variable', 'attributeEnd', 'closeTag'],
    values: ['div', 'class', 'active', '', 'div']
  });

  checkTokens({
    description: 'can have variables as an attribute',
    // TODO: Why do we need triple variable support in attribute values?
    text: '<div class="{{{active}}}"></div>',
    types: ['openTag', 'attributeName', 'tripleVariable', 'attributeEnd', 'closeTag'],
    values: ['div', 'class', 'active', '', 'div']
  });

  checkTokens({
    description: 'can have variables and text in an attribute',
    text: '<div class="state-{{active}} blah"></div>',
    types: ['openTag', 'attributeName', 'text', 'variable', 'text', 'attributeEnd', 'closeTag'],
    values: ['div', 'class', 'state-', 'active', ' blah', '', 'div']
  });

  checkTokens({
    description: 'can have variables and text in an attribute',
    text: '<div class="{{active}}{{name}}"></div>',
    types: ['openTag', 'attributeName', 'variable',  'variable', 'attributeEnd', 'closeTag'],
    values: ['div', 'class', 'active', 'name', '', 'div']
  });

  checkTokens({
    description: 'parse attributes names with -',
    text: '<div data-fun="fun"></div>',
    types: ['openTag', 'attributeName', 'text', 'attributeEnd', 'closeTag'],
    values: ['div', 'data-fun', 'fun', '', 'div']
  });

  checkTokens({
    description: 'parse attributes names with _',
    text: '<div super_man="to the rescue"></div>',
    types: ['openTag', 'attributeName', 'text', 'attributeEnd', 'closeTag'],
    values: ['div', 'super_man', 'to the rescue', '', 'div']
  });

});
