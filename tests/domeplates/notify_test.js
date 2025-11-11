"use strict";
/* global it, describe, beforeEach, afterEach */

var assert = require("chai").assert;
var notify = require('../../domeplates/notify');

describe('Notify', function() {
  var originalLog;

  beforeEach(function() {
    // Capture console.log to test warn
    originalLog = console.log;
  });

  afterEach(function() {
    console.log = originalLog;
  });

  describe('Module Structure', function() {
    it('should export warn function', function() {
      assert.isFunction(notify.warn);
    });

    it('should export error function', function() {
      assert.isFunction(notify.error);
    });
  });

  describe('warn function', function() {
    it('should log warning message', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('Test warning', 'test.html');

      assert.equal(logged.length, 1);
      assert.include(logged[0], 'Test warning');
      assert.include(logged[0], 'test.html');
    });

    it('should include fileName in warning', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('Warning', 'myfile.html');

      assert.include(logged[0], 'myfile.html');
    });

    it('should include line and column when token provided', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      var token = {
        startLoc: {
          line: 5,
          col: 10
        }
      };

      notify.warn('Warning', 'test.html', token);

      assert.include(logged[0], 'line 5');
      assert.include(logged[0], 'column 10');
    });

    it('should work without token', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('Warning', 'test.html', null);

      assert.equal(logged.length, 1);
      assert.include(logged[0], 'Warning');
    });

    it('should use yellow color code for warnings', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('Test', 'test.html');

      // Check for ANSI yellow color code \x1b[33m
      assert.include(logged[0], '\x1b[33m');
      // Check for ANSI reset code \x1b[39m
      assert.include(logged[0], '\x1b[39m');
    });
  });

  describe('error function', function() {
    it('should throw error with message', function() {
      assert.throws(function() {
        notify.error('Test error', 'test.html');
      }, Error, 'Test error');
    });

    it('should include fileName in error', function() {
      assert.throws(function() {
        notify.error('Error message', 'myfile.html');
      }, /myfile\.html/);
    });

    it('should include line and column when token provided', function() {
      var token = {
        startLoc: {
          line: 10,
          col: 5
        }
      };

      assert.throws(function() {
        notify.error('Error', 'test.html', token);
      }, /line 10/);

      assert.throws(function() {
        notify.error('Error', 'test.html', token);
      }, /column 5/);
    });

    it('should work without token', function() {
      assert.throws(function() {
        notify.error('Error', 'test.html', null);
      }, /Error/);
    });

    it('should work with undefined token', function() {
      assert.throws(function() {
        notify.error('Error', 'test.html');
      }, /Error/);
    });

    it('should throw Error instance', function() {
      try {
        notify.error('Test', 'test.html');
        assert.fail('Should have thrown');
      } catch (e) {
        assert.instanceOf(e, Error);
      }
    });
  });

  describe('Location Message Formatting', function() {
    it('should format location with fileName only', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('Test', 'test.html');

      assert.match(logged[0], /in test\.html/);
    });

    it('should format location with fileName and position', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('Test', 'test.html', {
        startLoc: { line: 1, col: 1 }
      });

      assert.match(logged[0], /in test\.html on line 1 column 1/);
    });
  });

  describe('Edge Cases', function() {
    it('should handle token without startLoc', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('Test', 'test.html', {});

      assert.include(logged[0], 'Test');
      assert.include(logged[0], 'test.html');
    });

    it('should handle empty message', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('', 'test.html');

      assert.equal(logged.length, 1);
    });

    it('should handle empty fileName', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('Test', '');

      assert.equal(logged.length, 1);
    });

    it('should handle line 0 and column 0', function() {
      var logged = [];
      console.log = function(msg) {
        logged.push(msg);
      };

      notify.warn('Test', 'test.html', {
        startLoc: { line: 0, col: 0 }
      });

      assert.include(logged[0], 'line 0');
      assert.include(logged[0], 'column 0');
    });
  });
});
