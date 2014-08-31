QUnit.test( "evaluate contexts test", function( assert ) {
  var agentType = 'js_test_agent';
  Drupal.personalize.agents = Drupal.personalize.agents || {};

  Drupal.personalize.agents[agentType] = {
    'featureToContext': function(featureName) {
      var contextArray = featureName.split('--');
      return {
        'key': contextArray[0],
        'value': contextArray[1]
      };
    }
  };
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

QUnit.test( "executor test", function( assert ) {
  // Test the executor for a regular option set.
  assert.equal(0, $('.osid-1-first-option').length);
  assert.equal(0, $('.osid-1-second-option').length);
  Drupal.personalize.executors.show.execute($('[data-personalize=osid-1]'), 'first-choice', 1);
  assert.equal(1, $('.osid-1-first-option').length);
  assert.equal(0, $('.osid-1-second-option').length);
  Drupal.personalize.executors.show.execute($('[data-personalize=osid-1]'), 'second-choice', 1);
  assert.equal(0, $('.osid-1-first-option').length);
  assert.equal(1, $('.osid-1-second-option').length);

  // Test an option set that appears multiple times on the page.
  assert.equal(0, $('.osid-2-first-option').length);
  assert.equal(0, $('.osid-2-second-option').length);
  Drupal.personalize.executors.show.execute($('[data-personalize=osid-2]'), 'first-choice', 2);
  assert.equal(2, $('.osid-2-first-option').length);
  assert.equal(0, $('.osid-2-second-option').length);
  Drupal.personalize.executors.show.execute($('[data-personalize=osid-2]'), 'second-choice', 2);
  assert.equal(0, $('.osid-2-first-option').length);
  assert.equal(2, $('.osid-2-second-option').length);
});


QUnit.module("Personalize page tests", {
  'setup': function() {
    Drupal.personalize.resetAll();
    Drupal.settings.personalize = {
      'cacheExpiration': {
        'decisions': 'session'
      },
      'agent_map': {
        'my-agent': {
          'active': 1,
          'cache_decisions': true,
          'enabled_contexts': [],
          'type': 'test_agent'
        }
      },
      'option_sets': {
        'osid-1': {
          'agent': 'my-agent',
          'data': [],
          'decision_name': 'osid-1',
          'decision_point': 'osid-1',
          'executor': 'show',
          'label': 'My Test',
          'mvt': null,
          'option_names': ['first-option', 'second-option'],
          'options': [
            {
              'option_id': 'first-option',
              'option_lablel': 'First Option'
            },
            {
              'option_id': 'second-option',
              'option_label': 'Second Option'
            }
          ],
          'osid': 'osid-1',
          'plugin': 'my_os_plugin',
          'selector': '.some-class',
          'stateful': 0,
          'winner': null
        }
      }
    };
    Drupal.personalize.agents.test_agent = {};
  }
});

QUnit.asyncTest("personalize page simple", function( assert ) {
  QUnit.start();
  Drupal.personalize.agents.test_agent.getDecisionsForPoint = function(name, visitor_context, choices, decision_point, callback) {
    QUnit.start();
    assert.equal(name, 'my-agent');
    assert.ok($.isEmptyObject(visitor_context));
    assert.ok(choices.hasOwnProperty('osid-1'));
    assert.equal(choices['osid-1'][0], 'first-option');
    assert.equal(choices['osid-1'][1], 'second-option');
    assert.equal(decision_point, 'osid-1');
  };

  QUnit.stop();
  Drupal.personalize.personalizePage(Drupal.settings);
});

QUnit.asyncTest("personalize page 2 option sets", function( assert ) {
  // The getDecisionsForPoint method should be called twice, once for each option set.
  expect(6);
  QUnit.start();
  // Add a second option set.
  addOptionSetToDrupalSetings('osid-2', 'osid-2', 'osid-2');
  Drupal.personalize.agents.test_agent.getDecisionsForPoint = function(name, visitor_context, choices, decision_point, callback) {
    QUnit.start();
    switch(decision_point) {
      case 'osid-1':
        assert.equal(name, 'my-agent');
        assert.ok($.isEmptyObject(visitor_context));
        assert.ok(choices.hasOwnProperty('osid-1'), 'Got osid-1');
        QUnit.stop();
        break;
      case 'osid-2':
        assert.equal(name, 'my-agent');
        assert.ok($.isEmptyObject(visitor_context));
        assert.ok(choices.hasOwnProperty('osid-2'), 'Got osid-2');
        break;
    }
  };

  QUnit.stop();
  Drupal.personalize.personalizePage(Drupal.settings);
});

QUnit.asyncTest("personalize page 2 option sets one decision", function( assert ) {
  // The getDecisionsForPoint method should be called only once for the two option sets.
  expect(4)
  QUnit.start();
  // Create 2 option sets with the same decision name.
  addOptionSetToDrupalSetings('osid-2', 'osid-2', 'osid-2');
  Drupal.settings.personalize.option_sets['osid-1'].decision_name = Drupal.settings.personalize.option_sets['osid-2'].decision_name = 'my_decision';
  Drupal.settings.personalize.option_sets['osid-1'].decision_point = Drupal.settings.personalize.option_sets['osid-2'].decision_point = 'my_decision_point';

  Drupal.personalize.agents.test_agent.getDecisionsForPoint = function(name, visitor_context, choices, decision_point, callback) {
    QUnit.start();
    assert.equal(name, 'my-agent');
    assert.ok($.isEmptyObject(visitor_context));
    assert.ok(choices.hasOwnProperty('my_decision'));
    assert.equal(decision_point, 'my_decision_point');
  };

  QUnit.stop();
  Drupal.personalize.personalizePage(Drupal.settings);
});

QUnit.asyncTest("personalize page with visitor context", function( assert ) {
  // The getDecisionsForPoint method should be called only once for the two option sets.
  expect(6)
  QUnit.start();
  // Set up the agent to have a user profile context enabled.
  Drupal.settings.personalize.agent_map['my-agent'].enabled_contexts = {'user_profile_context': {'my_user_profile_field': 'my_user_profile_field'}};
  // Now add a value for that context to the settings.
  Drupal.settings.personalize_user_profile_context = {
    'my_user_profile_field': 'my_user_profile_value'
  };
  Drupal.personalize.agents.test_agent.getDecisionsForPoint = function(name, visitor_context, choices, decision_point, callback) {
    QUnit.start();
    assert.equal(name, 'my-agent');
    assert.ok(choices.hasOwnProperty('osid-1'));
    assert.equal(decision_point, 'osid-1');
    assert.ok(visitor_context.hasOwnProperty('my_user_profile_field'));
    assert.equal(1, visitor_context.my_user_profile_field.length);
    assert.equal("my_user_profile_value", visitor_context.my_user_profile_field[0]);
  };

  QUnit.stop();
  Drupal.personalize.personalizePage(Drupal.settings);
});

function addOptionSetToDrupalSetings(osid, decision_name, decision_point) {
  Drupal.settings.personalize.option_sets[osid] = {
    'agent': 'my-agent',
    'data': [],
    'decision_name': decision_name,
    'decision_point': decision_point,
    'executor': 'show',
    'label': 'My Test',
    'mvt': null,
    'option_names': ['first-option', 'second-option'],
    'options': [
      {
        'option_id': 'first-option',
        'option_lablel': 'First Option'
      },
      {
        'option_id': 'second-option',
        'option_label': 'Second Option'
      }
    ],
    'osid': osid,
    'plugin': 'my_os_plugin',
    'selector': '.some-other-class',
    'stateful': 0,
    'winner': null
  };
}
