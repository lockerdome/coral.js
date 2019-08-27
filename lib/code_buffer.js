"use strict";

module.exports = CodeBuffer;

function CodeBuffer() {
  this.buffer = [];
  this.params = [];
  this.prelude = [];
  this.indent = 1;
}

CodeBuffer.prototype.push = function push() {
  var line = Array.prototype.slice.call(arguments).join('');
  this.buffer.push(new Array(this.indent + 1).join('  ') + line);
};

CodeBuffer.prototype.unshift = function unshift(line) {
  this.buffer.unshift('  ' + line);
};

CodeBuffer.prototype.toFunction = function toFunction() {
  try{
    return new Function(this.params, this.prelude.join('\n') + '\n' + this.buffer.join('\n'));
  }catch(e) {
    console.error('Ohhh dear, your code buffer exploded :(');
    console.error(this.buffer.join('\n'));
    throw new Error(e);
  }
};

CodeBuffer.prototype.indent = function indent(fn) {
  this.indent++;
  fn();
  this.indent--;
};
