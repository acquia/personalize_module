QUnit.test( "evaluate contexts test", function( assert ) {
  // Set up.
  Drupal.personalize.agents = Drupal.personalize.agents || {};
  var agentType = 'js_test_agent';
  Drupal.personalize.agents[agentType] = {
    'featureToContext': function(featureName) {
      var contextArray = featureName.split('--');
      return {
        'key': contextArray[0],
        'value': contextArray[1]
      };
    }
  };
  // End of set up.

  var visitorContext = {
    'some_plugin': {
      'some-context-key': 'some-value'
    },
    'some_other_plugin': {
      'ohai': 'stuff',
      'numeric-context': 43
    }
  };
  var featureRules = {
    'some-context-key--sc-some-value': {
      'context': 'some-context-key',
      'match': 'value',
      'operator': 'contains',
      'plugin': 'some_plugin'
    },
    'ohai--stuff': {
      'context': 'ohai',
      'match': 'stuff',
      'operator': 'equals',
      'plugin': 'some_other_plugin'
    },
    'numeric-context--gt-42': {
      'context': 'numeric-context',
      'match': 42,
      'operator': 'numgt',
      'plugin': 'some_other_plugin'
    }
  };
  // Try with a non-existent agent type, we should get an empty object.
  var evaluated = Drupal.personalize.evaluateContexts('non_existent_type', visitorContext, featureRules);
  assert.ok( evaluated !== null);
  assert.ok( $.isEmptyObject(evaluated) );
  // Now try with our dummy agent type.
  var evaluated = Drupal.personalize.evaluateContexts(agentType, visitorContext, featureRules);
  assert.equal( evaluated['some-context-key'].length, 2, "First context key has the correct number of values" );
  assert.equal( evaluated['some-context-key'][0], 'some-value', "First context key has the basic value" );
  assert.equal( evaluated['some-context-key'][1], 'sc-some-value', "First context key has the operator-derived value" );
  assert.equal( evaluated['ohai'].length, 1, "Second context key has the correct number of values" );
  assert.equal( evaluated['ohai'][0], 'stuff', "Second context key has the basic value" );
  assert.equal( evaluated['numeric-context'].length, 2, "Third context key has the correct number of values" );
  assert.equal( evaluated['numeric-context'][0], 43, "Third context key has the basic value" );
  assert.equal( evaluated['numeric-context'][1], 'gt-42', "Third context key has the operator-derived value" );
});

QUnit.asyncTest( "get visitor contexts test", function( assert ) {
  expect(6);
  // Set-up
  function assignDummyValues(contexts) {
    var values = {
      'some-context': 'some-value',
      'some-other-context': 'some-other-value',
      'ohai': 42,
      'kthxbai': 0
    };
    var myValues = {};
    for (var i in contexts) {
      if (contexts.hasOwnProperty(i) && values.hasOwnProperty(i)) {
        myValues[i] = values[i];
      }
    }
    return myValues;
  }
  Drupal.personalize = Drupal.personalize || {};
  Drupal.personalize.visitor_context = Drupal.personalize.visitor_context || {};
  Drupal.personalize.visitor_context.my_first_plugin = {
    'getContext': function(contexts) {
      return assignDummyValues(contexts);
    }
  };
  Drupal.personalize.visitor_context.my_second_plugin = {
    'getContext': function(contexts) {
      return assignDummyValues(contexts);
    }
  };
  // End of set-up.

  var contexts = {
    'my_first_plugin': {
      'some-context': 'some-context',
      'some-other-context': 'some-other-context'
    },
    'my_second_plugin': {
      'ohai': 'ohai',
      'kthxbai': 'kthxbai'
    },
    'my_nonexistent_plugin': {
      'foo': 'foo'
    }
  };
  var callback = function(contextValues) {
    assert.ok(contextValues.hasOwnProperty('my_first_plugin'));
    assert.equal(contextValues.my_first_plugin['some-context'], 'some-value');
    assert.equal(contextValues.my_first_plugin['some-other-context'], 'some-other-value');
    assert.equal(contextValues.my_second_plugin['ohai'], 42);
    assert.equal(contextValues.my_second_plugin['kthxbai'], 0);
    assert.equal(contextValues.my_nonexistent_plugin, null);
    QUnit.start();
  };
  Drupal.personalize.getVisitorContexts(contexts, callback);
});
