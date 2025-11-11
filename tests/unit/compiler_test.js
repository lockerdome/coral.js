"use strict";
/* global it, describe, beforeEach, afterEach */

var assert = require("chai").assert;
var Compiler = require('../../compiler');
var HookManager = require('../../hook_manager');

describe('Compiler', function() {
  var hookManager;
  var source;
  var root_element;
  var argv;

  beforeEach(function() {
    hookManager = new HookManager();
    source = {
      elements: { test: 'element code' },
      models: { test_model: 'model code' },
      views: { test: 'view code' },
      element_templates: {},
      model_templates: {}
    };
    root_element = 'test';
    argv = {};
  });

  describe('constructor', function() {
    it('should create a Compiler instance', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.instanceOf(compiler, Compiler);
    });

    it('should store source reference', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.strictEqual(compiler._source, source);
    });

    it('should store root_element reference', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.equal(compiler._root_element, root_element);
    });

    it('should store hook_manager reference', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.strictEqual(compiler._hook_manager, hookManager);
    });

    it('should initialize cData with sort_refs', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.isObject(compiler.cData);
      assert.isObject(compiler.cData.sort_refs);
      assert.property(compiler.cData.sort_refs, 'helpers');
    });

    it('should handle empty plugin list', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.instanceOf(compiler, Compiler);
    });

    it('should load plugins with path string', function() {
      // Create a simple mock plugin
      var mockPluginPath = './tests/fixtures/mock_plugin';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin.js');

      // Create fixtures directory if it doesn't exist
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      // Create a simple mock plugin
      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  this.loaded = true;\n' +
        '  cData.mock_plugin_loaded = true;\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        var compiler = new Compiler(hookManager, source, root_element, argv, [mockPluginPath]);
        assert.equal(compiler.cData.mock_plugin_loaded, true);
      } finally {
        // Cleanup
        fs.unlinkSync(pluginFile);
      }
    });

    it('should load plugins with path and settings object', function() {
      var mockPluginPath = './tests/fixtures/mock_plugin_with_settings';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin_with_settings.js');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  cData.plugin_settings = settings;\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        var pluginSettings = { option: 'value' };
        var compiler = new Compiler(hookManager, source, root_element, argv, [
          { path: mockPluginPath, settings: pluginSettings }
        ]);
        assert.deepEqual(compiler.cData.plugin_settings, pluginSettings);
      } finally {
        fs.unlinkSync(pluginFile);
      }
    });

    it('should load multiple plugins in order', function() {
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      var plugin1File = path.join(pluginDir, 'mock_plugin_1.js');
      var plugin2File = path.join(pluginDir, 'mock_plugin_2.js');

      fs.writeFileSync(plugin1File,
        '"use strict";\n' +
        'function Plugin1(hook_manager, settings, argv, cData) {\n' +
        '  if (!cData.load_order) cData.load_order = [];\n' +
        '  cData.load_order.push(1);\n' +
        '}\n' +
        'module.exports = Plugin1;\n'
      );

      fs.writeFileSync(plugin2File,
        '"use strict";\n' +
        'function Plugin2(hook_manager, settings, argv, cData) {\n' +
        '  if (!cData.load_order) cData.load_order = [];\n' +
        '  cData.load_order.push(2);\n' +
        '}\n' +
        'module.exports = Plugin2;\n'
      );

      try {
        var compiler = new Compiler(hookManager, source, root_element, argv, [
          './tests/fixtures/mock_plugin_1',
          './tests/fixtures/mock_plugin_2'
        ]);
        assert.deepEqual(compiler.cData.load_order, [1, 2]);
      } finally {
        fs.unlinkSync(plugin1File);
        fs.unlinkSync(plugin2File);
      }
    });

    it('should pass argv to plugins', function() {
      var mockPluginPath = './tests/fixtures/mock_plugin_argv';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin_argv.js');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  cData.received_argv = argv;\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        var testArgv = { option: 'test', flag: true };
        var compiler = new Compiler(hookManager, source, root_element, testArgv, [mockPluginPath]);
        assert.deepEqual(compiler.cData.received_argv, testArgv);
      } finally {
        fs.unlinkSync(pluginFile);
      }
    });
  });

  describe('source structure', function() {
    it('should accept source with all required properties', function() {
      var fullSource = {
        elements: { main: 'code' },
        models: { user: 'code' },
        views: { main: 'html' },
        element_templates: { button: 'code' },
        model_templates: { base: 'code' }
      };
      var compiler = new Compiler(hookManager, fullSource, 'main', argv, []);
      assert.strictEqual(compiler._source, fullSource);
    });

    it('should accept source with empty collections', function() {
      var emptySource = {
        elements: {},
        models: {},
        views: {},
        element_templates: {},
        model_templates: {}
      };
      var compiler = new Compiler(hookManager, emptySource, 'test', argv, []);
      assert.strictEqual(compiler._source, emptySource);
    });
  });

  describe('cData initialization', function() {
    it('should initialize cData with sort_refs', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.isDefined(compiler.cData);
      assert.isDefined(compiler.cData.sort_refs);
      assert.isObject(compiler.cData.sort_refs);
    });

    it('should have sort_refs with helpers property', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.property(compiler.cData.sort_refs, 'helpers');
    });

    it('should allow plugins to extend cData', function() {
      var mockPluginPath = './tests/fixtures/mock_plugin_cdata';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin_cdata.js');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  cData.custom_data = { value: 42 };\n' +
        '  cData.plugin_name = "test_plugin";\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        var compiler = new Compiler(hookManager, source, root_element, argv, [mockPluginPath]);
        assert.equal(compiler.cData.custom_data.value, 42);
        assert.equal(compiler.cData.plugin_name, 'test_plugin');
      } finally {
        fs.unlinkSync(pluginFile);
      }
    });
  });

  describe('plugin system integration', function() {
    it('should allow plugins to register hooks', function(done) {
      var mockPluginPath = './tests/fixtures/mock_plugin_hooks';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin_hooks.js');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  hook_manager.onHook("test_plugin_hook", function(callback, data) {\n' +
        '    data.processed = true;\n' +
        '    callback();\n' +
        '  });\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        new Compiler(hookManager, source, root_element, argv, [mockPluginPath]);

        var testData = { value: 123 };
        hookManager.runHook('test_plugin_hook', [testData], function() {
          assert.equal(testData.processed, true);
          fs.unlinkSync(pluginFile);
          done();
        });
      } catch(e) {
        fs.unlinkSync(pluginFile);
        throw e;
      }
    });

    it('should allow plugins to register pipeline hooks', function(done) {
      var mockPluginPath = './tests/fixtures/mock_plugin_pipeline';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin_pipeline.js');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  hook_manager.onPipelineHook("test_pipeline", function(next, data) {\n' +
        '    data.transformed = true;\n' +
        '    next(data);\n' +
        '  });\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        new Compiler(hookManager, source, root_element, argv, [mockPluginPath]);

        var testData = { value: 456 };
        hookManager.runPipelineHook('test_pipeline', testData, function(result) {
          assert.equal(result.transformed, true);
          assert.equal(result.value, 456);
          fs.unlinkSync(pluginFile);
          done();
        });
      } catch(e) {
        fs.unlinkSync(pluginFile);
        throw e;
      }
    });

    it('should pass settings to plugins correctly', function() {
      var mockPluginPath = './tests/fixtures/mock_plugin_settings';
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');
      var pluginFile = path.join(pluginDir, 'mock_plugin_settings.js');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      fs.writeFileSync(pluginFile,
        '"use strict";\n' +
        'function MockPlugin(hook_manager, settings, argv, cData) {\n' +
        '  if (settings && settings.validate) {\n' +
        '    cData.settings_validated = true;\n' +
        '    cData.settings_value = settings.value;\n' +
        '  }\n' +
        '}\n' +
        'module.exports = MockPlugin;\n'
      );

      try {
        var testSettings = { validate: true, value: 'test_value' };
        var compiler = new Compiler(hookManager, source, root_element, argv, [
          { path: mockPluginPath, settings: testSettings }
        ]);
        assert.equal(compiler.cData.settings_validated, true);
        assert.equal(compiler.cData.settings_value, 'test_value');
      } finally {
        fs.unlinkSync(pluginFile);
      }
    });

    it('should allow plugins to interact with each other through cData', function() {
      var fs = require('fs');
      var path = require('path');
      var pluginDir = path.join(__dirname, '../fixtures');

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      var plugin1File = path.join(pluginDir, 'mock_plugin_producer.js');
      var plugin2File = path.join(pluginDir, 'mock_plugin_consumer.js');

      fs.writeFileSync(plugin1File,
        '"use strict";\n' +
        'function Plugin1(hook_manager, settings, argv, cData) {\n' +
        '  cData.shared_data = { count: 0 };\n' +
        '}\n' +
        'module.exports = Plugin1;\n'
      );

      fs.writeFileSync(plugin2File,
        '"use strict";\n' +
        'function Plugin2(hook_manager, settings, argv, cData) {\n' +
        '  if (cData.shared_data) {\n' +
        '    cData.shared_data.count++;\n' +
        '    cData.interaction_successful = true;\n' +
        '  }\n' +
        '}\n' +
        'module.exports = Plugin2;\n'
      );

      try {
        var compiler = new Compiler(hookManager, source, root_element, argv, [
          './tests/fixtures/mock_plugin_producer',
          './tests/fixtures/mock_plugin_consumer'
        ]);
        assert.equal(compiler.cData.shared_data.count, 1);
        assert.equal(compiler.cData.interaction_successful, true);
      } finally {
        fs.unlinkSync(plugin1File);
        fs.unlinkSync(plugin2File);
      }
    });
  });

  describe('Compiler API', function() {
    it('should expose source through _source', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.strictEqual(compiler._source, source);
    });

    it('should expose root_element through _root_element', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.equal(compiler._root_element, root_element);
    });

    it('should expose hook_manager through _hook_manager', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.strictEqual(compiler._hook_manager, hookManager);
    });

    it('should expose cData', function() {
      var compiler = new Compiler(hookManager, source, root_element, argv, []);
      assert.isDefined(compiler.cData);
      assert.isObject(compiler.cData);
    });
  });
});
