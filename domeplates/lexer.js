"use strict";

module.exports = lexer;

// https://html.spec.whatwg.org/multipage/syntax.html#void-elements
// Void elements can't have any child nodes.
var VOID_ELEMENTS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

function lexer(str) {
  return new Context(str);
}

function Context(str) {
  this.offset = 0;
  this.cur = str.charAt(0);
  this.col = 0;
  this.line = 1;
  this.str = str;
  this.state = 'Top';
}

function Token(context, type, startLoc, endLoc, start, end) {
  this.context = context;
  this.type = type;
  this.startLoc = startLoc;
  this.endLoc = endLoc;
  this.start = start;
  this.end = end;
}

Token.prototype.__defineGetter__('value', function () {
  return this.context.str.slice(this.start, this.end).replace(/\s+/g, ' ');
});

Context.prototype.nextToken = function nextToken() { // optionally here we can pass the tokenif we want to do a 0 allocation lexer
  if (!this.cur) return;
  return this['parse' + this.state]();
};

Context.prototype.allTokens = function allTokens() {
  var ret = [];
  var token;
  while (this.cur) {
    token = this['parse' + this.state]();
    if (!token) break;
    ret.push(token);
    if (token.error) break;
  }
  return ret;
};

Context.prototype.parseTop = function parseTop() {
  var next;
  next = this.peek();
  if (next === null) return null;
  return this.parseComment(next) || this.parseTag(next) || this.parseVar(next) || this.parseText(next) || this.parseError(next);
};

Context.prototype.peek = function peek() {
  return this.str.charAt(this.offset + 1);
};

Context.prototype.next = function next() {
  if (this.cur === '\n') {
    this.line++;
    this.col = -1;
  }
  this.offset++;
  this.col++;
  this.cur = this.str.charAt(this.offset);
  return this.cur;
};

Context.prototype.consumeWhitespace = function consumeWhitespace() {
  var next = this.cur;
  while (next && (next === ' ' || next === '\n' || next === '\t' || next === '\r')) {
    next = this.next();
  }
  return next;
};

Context.prototype.parseComment = function parseComment(next) {
  if (this.cur === '<' && next === '!') {
    var startLoc = { line: this.line, col: this.col };
    var start = this.offset;
    var end, endLoc, cur;
    this.next();
    if (this.next() !== '-' || this.next() !== '-') return { error: 'Invalid Comment. Comments should start with <!--', code: 100 };
    cur = this.next();
    do {
      while (cur && (cur !== '-' || this.peek() !== '-')) { cur = this.next(); }
      cur = this.next();
    } while (cur && this.peek() !== '>');
    this.next();
    if (this.cur !== '>') return { error: 'Comment not closed', code: 101 };
    this.next();
    this.state = 'Top';
    endLoc = { line: this.line, col: this.col };
    end = this.offset;
    return new Token(this, 'comment', startLoc, endLoc, start, end);
  }
};

Context.prototype.parseTag = function (next) {
  var startLoc, start, code, end, endLoc, tokenType, tagType;
  if (this.cur === '<') {
    if (next === '/') {
      next = this.next() && this.next();
      startLoc = { line: this.line, col: this.col };
      start = this.offset;
      code = next.charCodeAt(0);
      while(next && ((code >= 97 && code <= 122) || (code >= 65 && code <= 90) || (code >= 48 && code <= 57) || next === ':')) {
        next = this.next();
        code = next.charCodeAt(0);
      }
      if (this.cur !== '>') return { error: 'Expected closing tag > got ' + this.cur, code: 200 };
      endLoc = { line: this.line, col: this.col };
      end = this.offset;
      this.next();
      tagType = this.str.slice(start, end);
      var isCloseTagVoidElement = VOID_ELEMENTS.indexOf(tagType) !== -1;
      tokenType = isCloseTagVoidElement ? 'voidTag' : 'closeTag';
      return new Token(this, tokenType, startLoc, endLoc, start, end);
    } else {
      next = this.next();
      startLoc = { line: this.line, col: this.col };
      start = this.offset;
      code = next.charCodeAt(0);
      while(next && ((code >= 97 && code <= 122) || (code >= 65 && code <= 90) || (code >= 48 && code <= 57) || next === ':')) {
        next = this.next();
        code = next.charCodeAt(0);
      }
      endLoc = { line: this.line, col: this.col };
      end = this.offset;
      this.consumeWhitespace();
      if (this.cur === '>') {
        this.next();
        this.state = 'Top';
      } else {
        this.state = 'AttributeName';
      }
      tagType = this.str.slice(start, end);
      var isOpenTagVoidElement = VOID_ELEMENTS.indexOf(tagType) !== -1;
      tokenType = isOpenTagVoidElement ? 'voidTag' : 'openTag';
      return new Token(this, tokenType, startLoc, endLoc, start, end);
    }
  }
};

Context.prototype.parseVar = function parseVar() {
  if (!(this.cur === '{' && this.peek() === '{')) return;
  this.next();
  var type, cur;
  var next = this.peek();
  var code = next.charCodeAt(0);
  var triple = false;
  cur = this.next();
  var startLoc = { line: this.line, col: this.col };
  var start = this.offset;
  if (next === '{') {
    this.next();
    start++;
    startLoc.col++;
    triple = true;
    type = 'tripleVariable';
  } else if (cur === '#') {
    var start_offset = this.offset;
    do {
      cur = this.next();
    } while (cur && cur !== ' ' && cur !== '}');

    var operator_string = this.str.slice(start_offset, this.offset);
    if (cur === ' ' && operator_string === '#if') {
      type = 'ifStatement';
    } else if (cur === '}' && operator_string === '#else') {
      type = 'elseStatement';
    } else if (cur === ' ' && operator_string === '#elseif') {
      type = 'elseIfStatement';
    } else if (cur === '}' && operator_string === '#endif') {
      type = 'endIfStatement';
    } else {
      return this.errorToken("Invalid operator "+operator_string);
    }
  } else {
    type = 'variable';
  }
  cur = this.cur;
  do {
    while(cur && (cur !== '}' || this.peek() !== '}')) { cur = this.next(); }
    if (triple) this.next();
    cur = this.next();
  } while(cur && cur !== '}');
  this.state = 'Top';
  var offsetOffset = triple ? -2 : -1;
  var endLoc = { line: this.line, col: this.col + offsetOffset };
  var end = this.offset + offsetOffset;
  this.next();
  return new Token(this, type, startLoc, endLoc, start, end);
};

Context.prototype.parseText = function () {
  var startLoc = { line: this.line, col: this.col };
  var start = this.offset;
  var cur = this.cur;
  for (;;) {
    if (!cur || (cur === '{' && this.peek() === '{') || cur === '<') break;
    cur = this.next();
  }
  this.state = 'Top';
  var endLoc = { line: this.line, col: this.col };
  var end = this.offset;
  return new Token(this, 'text', startLoc, endLoc, start, end);
};

Context.prototype.parseAttributeName = function () {
  var startLoc = { line: this.line, col: this.col };
  var start = this.offset;
  var cur = this.cur;
  if (cur === '/' && this.peek() === '>') {
    this.next();
    this.next();
    this.state = 'Top';
    return new Token(this, 'selfClose', startLoc, startLoc, start, start);
  }
  if (cur === '{' && this.peek() === '{') {
    return this.errorToken("Cannot insert {{tag}} as attribute name.");
  }
  var code = cur.charCodeAt(0);
  // while is alphanumeric
  while ((code >= 97 && code <= 122) || (code >= 65 && code <= 90) || (code >= 48 && code <= 57) || cur === '-' || cur === '_'){
    cur = this.next();
    code = cur.charCodeAt(0);
  }
  var endLoc = { line: this.line, col: this.col };
  var end = this.offset;
  if (start === end) {
    return this.errorToken("No valid attribute name found.");
  }
  this.consumeWhitespace();
  if (this.cur === '=') {
    this.next();
    this.consumeWhitespace();
    this.state = 'AttributeValueBegin';
  } else {
    this.state = 'AttributeEnd';
  }
  return new Token(this, 'attributeName', startLoc, endLoc, start, end);
};

Context.prototype.parseAttributeValueBegin = function attributeValueBegin() {
  if (this.cur !== "'" && this.cur !== '"') {
    return this.errorToken("Attribute value must be enclosed by quotes.");
  }
  this.stopAt = this.cur;
  this.next();
  return this.parseAttributeValue();
};

Context.prototype.parseAttributeValue = function attibuteValue() {
  return this.parseAttributeValueVariable() || this.parseAttributeValueText();
};

Context.prototype.parseAttributeValueText = function attributeValueText() {
  var cur = this.cur;
  var stopAt = this.stopAt;
  var startLoc = { line: this.line, col: this.col };
  var start = this.offset;
  cur = this.cur;
  while (cur && (cur !== stopAt && (cur !== '{' || this.peek() !== '{'))) {
    cur = this.next();
  }
  var endLoc = { line: this.line, col: this.col };
  var end = this.offset;
  if (cur === '{') {
    this.state = 'AttributeValueVariable';
  } else {
    this.next();
    this.consumeWhitespace();
    this.state = 'AttributeEnd';
  }
  return new Token(this, 'text', startLoc, endLoc, start, end);
};

Context.prototype.parseAttributeEnd = function attributeEnd() {
  var startLoc = { line: this.line, col: this.col };
  var endLoc = { line: this.line, col: this.col };
  if (this.cur === '>') {
    this.next();
    this.state = 'Top';
  } else {
    this.state = 'AttributeName';
  }
  return new Token(this, 'attributeEnd', startLoc, endLoc, this.offset, this.offset);
};

Context.prototype.parseAttributeValueVariable = function () {
  var token = this.parseVar();
  if (!token) return;
  if (this.cur === this.stopAt) {
    this.next();
    this.consumeWhitespace();
    this.state = 'AttributeEnd';
  } else {
    this.state = 'AttributeValue';
  }
  return token;
};

Context.prototype.parseError = function () {
  return { error: 'Unable to parse input at ' + this.offset };
};

Context.prototype.errorToken = function (msg) {
  var at = this.offset;
  var substr = this.str.slice(Math.max(0, at - 10), Math.min(at + 30, this.str.length - 1));
  return { error: msg + ' Context: "...' + substr.replace(/\n\s*/g, "\\n") + '..."' };
};
