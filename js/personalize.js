(function ($) {
  var cookieName = 'drupal-personalize';

  /**
   * Provides client side page personalization based on a user's context.
   */
  Drupal.personalize = Drupal.personalize || {};

  var sessionID = false;

  /**
   * Initializes the session ID to be used for decision and goal requests.
   *
   * The session ID can be used by decision agents to keep track of visitors
   * across requests. It may be generated by the decision agent itself and
   * stored in a cookie, or, for logged in users, it is a hash of the user
   * ID.
   */
  Drupal.personalize.initializeSessionID = function() {
    if (sessionID) {
      return sessionID;
    }
    // Populate the session id from the cookie, if present.
    var storedId = $.cookie(cookieName);
    if (storedId) {
      sessionID = storedId;
    }
    else if (Drupal.settings.personalize.sessionID) {
      sessionID = Drupal.settings.personalize.sessionID;
    }
    return sessionID;
  };

  /**
   * Saves the passed in ID as the SessionID variable to be used for all
   * future decision and goal requests.
   */
  Drupal.personalize.saveSessionID = function(session_id) {
    sessionID = session_id;
    $.cookie(cookieName, session_id);
  };


  var agents = {}, adminMode = false, processedDecisions = {}, processedOptionSets = [];


  /**
   * Looks for personalized elements and calls the corresponding decision agent
   * for each one.
   */
  Drupal.behaviors.personalize = {
    attach: function (context, settings) {

      // Assure that at least the personalize key is available on settings.
      settings.personalize = settings.personalize || {};

      adminMode = settings.personalize.hasOwnProperty('adminMode');

      if (!sessionID) {
        Drupal.personalize.initializeSessionID();
      }

      // Clear out any expired local storage.
      Drupal.personalize.storage.utilities.maintain();

      // First process MVTs if there are any.
      processMVTs(settings);

      // Only Option Sets that weren't part of an MVT will now be processed.
      processOptionSets(settings);

      // Once MVTs and other Option Sets have been processed, we're ready to fire
      // off requests for decisions.
      triggerDecisions(settings);

      if (!adminMode) {
        // Dispatch any goals that were triggered server-side.
        Drupal.personalize.sendGoals(settings);
      }

      // Add an action listener for client-side goals.
      addActionListener(settings);
    }
  };

  /**
   * Sends any goals that have been set server-side.
   */
  Drupal.personalize.sendGoals = function(settings) {
    if (settings.personalize.goals_attained) {
      for (var agent_name in settings.personalize.goals_attained) {
        if (settings.personalize.goals_attained.hasOwnProperty(agent_name)) {
          var agent = settings.personalize.agent_map[agent_name];
          if (!Drupal.personalize.agents.hasOwnProperty(agent.type)) {
            // @todo How best to handle errors like this?
            continue;
          }
          for (var i in settings.personalize.goals_attained[agent_name]) {
            if (settings.personalize.goals_attained[agent_name].hasOwnProperty(i) && !settings.personalize.goals_attained[agent_name][i].processed) {
              Drupal.personalize.agents[agent.type].sendGoalToAgent(agent_name, settings.personalize.goals_attained[agent_name][i].name, settings.personalize.goals_attained[agent_name][i].value);
              settings.personalize.goals_attained[agent_name][i].processed = 1;
            }
          }
        }
      }
    }
  };

  Drupal.personalize.executors = Drupal.personalize.executors || {};
  /**
   * Executor that Looks for options inside a script tag and pulls out the
   * chosen one.
   */
  Drupal.personalize.executors.show = {
    'execute': function ($option_set, choice_name, osid) {
      var $option_source = $('script[type="text/template"]', $option_set);
      var element = $option_source.get(0);
      var json = element.innerText;
      if (json === undefined || json.length == 0) {
        json = element.text;
      }
      var choices = jQuery.parseJSON(json);
      var winner = '';

      if (choices == null || choices === false || !choices.hasOwnProperty(choice_name)) {
        // Invalid JSON in the template.  Just show the noscript option.
        winner = $(element).prev('noscript').html();
      }
      else {
        winner = choices[choice_name]['html'];
      }

      // Remove any previously existing options.
      $option_set
        // empty() is necessary to remove text nodes as well as elements.
        .empty()
        .append($option_source);
      // Append the selected option.
      $option_set.append(winner);

      Drupal.personalize.executorCompleted($option_set, choice_name, osid);
      // Lots of Drupal modules expect context to be document on the first pass.
      var bread = document; // context.
      var circus = Drupal.settings; // settings.
      Drupal.attachBehaviors(bread, circus);
    }
  };

  Drupal.personalize.executorCompleted = function($option_set, option_name, osid) {
    // Trigger an event to let others respond to the option change.
    $(document).trigger('personalizeOptionChange', [$option_set, option_name, osid]);
  };

  /**
   * Executor that executes a callback function to retrieve the chosen
   * option set to display.
   */
  Drupal.personalize.executors.callback = {
  'execute': function($option_set, choice_name, osid) {
    // Set up such that Drupal ajax handling can be utilized without a trigger.
    var custom_settings = {};
    custom_settings.url = '/personalize/option_set/' + osid + '/' + choice_name + '/ajax';
    custom_settings.event = 'onload';
    custom_settings.keypress = false;
    custom_settings.prevent = false;
    var callback_action = new Drupal.ajax(null, $option_set, custom_settings);

    try {
        $.ajax(callback_action.options);
      }
      catch (err) {
        // If we can't process the result dynamically, then show the
        // default option selected within the noscript block.
        // NOTE: jQuery returns escaped HTML when calling the html property
        // on a noscript tag.
        var defaultHtml = $option_set.next('noscript').text();
        $option_set.html(defaultHtml);
        $option_set.next('noscript').remove();
        return false;
      }
    }
  }

  Drupal.personalize.agents = Drupal.personalize.agents || {};
  /**
   * Provides a default agent.
   */
  Drupal.personalize.agents.default_agent = {
    'getDecisionsForPoint': function(name, visitor_context, choices, decision_point, callback) {
      var j, decisions = {};
      for (j in choices) {
        if (choices.hasOwnProperty(j)) {
          decisions[j] = choices[j][0];
        }
        callback(decisions);
      }
    },
    'sendGoalToAgent': function(agent_name, goal_name, value) {

    },
    'featureToContext': function(featureString) {
      var contextArray = featureString.split('::');
      return {
        'key': contextArray[0],
        'value': contextArray[1]
      }
    }
  };

  /**
   * Returns an object with key/value pairs for the enabled visitor contexts.
   */
  function getVisitorContext(agent_name, agent_type, enabled_context) {
    var i, j, new_values, visitor_context = Drupal.personalize.visitor_context, context_values = {};
    for (i in enabled_context) {
      if (enabled_context.hasOwnProperty(i) && visitor_context.hasOwnProperty(i) && typeof visitor_context[i].getContext === 'function') {
        new_values = visitor_context[i].getContext(enabled_context[i]);
        for (j in new_values) {
          context_values[j] = new_values[j];
        }
      }
    }
    return Drupal.personalize.evaluateContexts(agent_name, agent_type, context_values);
  }


  var fixed_targeting_rules = null;
  Drupal.personalize.evaluateContexts = function (agentName, agentType, visitorContext) {
    if (!Drupal.personalize.agents.hasOwnProperty(agentType) || typeof Drupal.personalize.agents[agentType].featureToContext !== 'function') {
      return;
    }
    // If we haven't already gone through all the explicit targeting rules, we need to
    // do that first to find the rule for each feature string.
    if (fixed_targeting_rules === null) {
      fixed_targeting_rules = {};
      var settings = Drupal.settings.personalize.option_sets;
      for (var i in settings) {
        if (settings.hasOwnProperty(i)) {
          var option_set = settings[i];
          var agent = option_set.agent;
          for (var j in option_set.options) {
            if (option_set.options.hasOwnProperty(j) && option_set.options[j].hasOwnProperty('fixed_targeting')) {
              fixed_targeting_rules[agent] = fixed_targeting_rules[agent] || {};
              // Loop through all features specified for an option and grab the rule
              // associated with it.
              for (var k in option_set.options[j].fixed_targeting) {
                if (option_set.options[j].fixed_targeting.hasOwnProperty(k)) {
                  var feature_name = option_set.options[j].fixed_targeting[k];
                  if (option_set.options[j].hasOwnProperty('fixed_targeting_rules') && option_set.options[j].fixed_targeting_rules.hasOwnProperty(feature_name)) {
                    fixed_targeting_rules[agent][feature_name] = option_set.options[j].fixed_targeting_rules[feature_name];
                  }
                }
              }
            }
          }
        }
      }
    }
    // The new visitor context object will hold an array of values for each
    // key, rather than just a single value. This is because in addition to
    // having a string representing key and actual value, for each rule that
    // is satisfied we'll also need a string indicating that that rule is
    // satisfied. For example, if we have a targeting rule that says show this
    // option if the visitor's "interests" field contains "submarines", and the
    // value of this field for the current visitor is "ships and submarines",
    // then our visitor context for key "interests" should be ["ships and submarines",
    // "sc-submarines"], where sc- is just the prefix added to codify "string
    // contains".
    var newVisitorContext = {};
    for (var contextKey in visitorContext) {
      if (visitorContext.hasOwnProperty(contextKey)) {
        newVisitorContext[contextKey] = [visitorContext[contextKey]];
      }
    }
    // Use the rules to set values on the visitor context which can then be used
    // for explicit targeting. It is up to the agent how exactly the explicit
    // targeting is done.
    if (fixed_targeting_rules.hasOwnProperty(agentName)) {
      var featureRules = fixed_targeting_rules[agentName];
      for (var featureName in featureRules) {
        if (featureRules.hasOwnProperty(featureName)) {
          var key = featureRules[featureName].context;
          if (visitorContext.hasOwnProperty(key)) {
            // Evaluate the rule and if it returns true, we set the feature string
            // on the visitor context.
            var operator = featureRules[featureName].operator;
            var match = featureRules[featureName].match;
            if (Drupal.personalize.targetingOperators.hasOwnProperty(operator)) {
              if (Drupal.personalize.targetingOperators[operator](visitorContext[key], match)) {
                // The feature string was created by the agent responsible for consuming
                // it, so only that agent knows how to split it up into its key and
                // value components.
                var context = Drupal.personalize.agents[agentType].featureToContext(featureName);
                // Now add the value that reflects this matched rule.
                newVisitorContext[key].push(context.value);
              }
            }
          }
        }
      }
    }
    return newVisitorContext;
  };

  /**
   * Defines the various operations that can be performed to evaluate
   * explicit targeting rules.
   */
  Drupal.personalize.targetingOperators = {
    'contains': function(actualValue, matchValue) {
      return actualValue.indexOf(matchValue) !== -1;
    },
    'starts': function(actualValue, matchValue) {
      return actualValue.indexOf(matchValue) === 0;
    },
    'ends': function(actualValue, matchValue) {
      return actualValue.indexOf(matchValue, actualValue.length - matchValue.length) !== -1;
    },
    'numgt': function(actualValue, matchValue) {
      if (isNaN(actualValue) || isNaN(matchValue)) return false;
      return actualValue > matchValue;
    },
    'numlt': function(actualValue, matchValue) {
      if (isNaN(actualValue) || isNaN(matchValue)) return false;
      return actualValue < matchValue;
    }
  };

  /**
   * User Context object.
   *
   * This object holds the context for the active user which will be used
   * as the basis of personalization. Agents may add additional information
   * to this object as they work with it, or other code may place context
   * within this object which can be used later by agents or used
   * on subsequent page loads.
   */
  Drupal.personalize.visitor_context = Drupal.personalize.visitor_context || {};
  Drupal.personalize.visitor_context.user_profile_context = {
    'getContext': function(enabled) {
      if (!Drupal.settings.hasOwnProperty('personalize_user_profile_context')) {
        return [];
      }
      var i, context_values = {};
      for (i in enabled) {
        if (enabled.hasOwnProperty(i) && Drupal.settings.personalize_user_profile_context.hasOwnProperty(i)) {
          context_values[i] = Drupal.settings.personalize_user_profile_context[i];
        }
      }
      return context_values;
    }
  };

  /**
   * Reads a visitor context item from localStorage.
   *
   * @param key
   *   The name of the context item to retrieve.
   * @returns {*}
   *   The value of the specified context item or null if not found or
   *   if not configured to store visitor context in localStorage.
   */
  Drupal.personalize.visitor_context_read = function(key) {
    var bucketName = Drupal.personalize.storage.utilities.generateVisitorContextBucketName(key);
    var bucket = Drupal.personalize.storage.utilities.getBucket(bucketName);
    return bucket.read(key);
  };

  /**
   * Writes a visitor context item to localStorage.
   *
   * Checks if the site is configured to allow storing of visitor
   * context items in localStorage and does nothing if not.
   *
   * @param key
   *   The name of the context item to store.
   * @param value
   *   The value of the context item to store.
   * @param overwrite
   *   True to overwrite existing values, false not to overwrite; default true.
   */
  Drupal.personalize.visitor_context_write = function(key, value, overwrite) {
    var bucketName = Drupal.personalize.storage.utilities.generateVisitorContextBucketName(key);
    var bucket = Drupal.personalize.storage.utilities.getBucket(bucketName);
    if (typeof overwrite === false) {
      var current = bucket.read(key);
      if (current !== null) {
        // A value already exists and we are not allowed to overwrite.
        return;
      }
    }

    return bucket.write(key, value);
  };

  /**
   * Processes all multivariate tests on the page.
   *
   * @param settings
   *   A Drupal settings object.
   */
  function processMVTs(settings) {
    var i, mvt_name, mvt, agent_info, option_set;
    if (settings.personalize.hasOwnProperty('mvt')) {
      for (mvt_name in settings.personalize.mvt) {
        if (settings.personalize.mvt.hasOwnProperty(mvt_name)) {
          // Extract agent and decision info from the mvt settings.
          mvt = settings.personalize.mvt[mvt_name];
          agent_info = Drupal.settings.personalize.agent_map[mvt.agent];
          for (i in mvt.option_sets) {
            if (mvt.option_sets.hasOwnProperty(i)) {
              option_set = mvt.option_sets[i];
              option_set.decision_point = mvt_name;
              option_set.agent = mvt.agent;
              option_set.agent_info = agent_info;
              processOptionSet(option_set);
            }
          }
        }
      }
    }
  }

  /**
   * Processes all Option Sets on the page.
   *
   * @param settings
   *   A Drupal settings object.
   */
  function processOptionSets(settings) {
    var i, osid, mvt, agent_info, option_set;
    if (settings.personalize.hasOwnProperty('option_sets')) {
      for (osid in settings.personalize.option_sets) {
        if (settings.personalize.option_sets.hasOwnProperty(osid)) {
          // Extract agent and decision info from the option set settings.
          option_set = settings.personalize.option_sets[osid];
          option_set.agent_info = Drupal.settings.personalize.agent_map[option_set.agent];
          processOptionSet(option_set)
        }
      }
    }
  }

  /**
   * Generates a standardized key format for a decision point to use for
   * persisted storage.
   *
   * @param agent_name
   *   The name of the agent for decisions.
   * @param point
   *   The decision point name.
   * @returns string
   *   The formatted key name to be used in persistent storage.
   */
  function generateDecisionStorageKey(agent_name, point) {
    return agent_name + Drupal.personalize.storage.utilities.cacheSeparator + point;
  }

  function readDecisionsfromStorage(agent_name, point) {
    if (!Drupal.settings.personalize.agent_map[agent_name].cache_decisions) {
      return null;
    }
    var bucket = Drupal.personalize.storage.utilities.getBucket('decisions');
    return bucket.read(generateDecisionStorageKey(agent_name, point));
  }

  function writeDecisionsToStorage(agent_name, point, decisions) {
    if (!sessionID || !Drupal.settings.personalize.agent_map[agent_name].cache_decisions) {
      return;
    }
    var bucket = Drupal.personalize.storage.utilities.getBucket('decisions');
    bucket.write(generateDecisionStorageKey(agent_name, point), decisions);
  }

  /**
   * Triggers all decisions needing to be made for the current page.
   */
  function triggerDecisions(settings) {
    var agent_name, agent, point, decisions, callback;

    // Given a set of callbacks and a selected option for each decision
    // made, calls the callbacks for each decision, passing them the
    // selected option.
    function callCallbacksWithSelection(callbacks, selection) {
      for (var i in selection) {
        if (selection.hasOwnProperty(i) && callbacks.hasOwnProperty(i)) {
          for (var j = 0; j < callbacks[i].length; j++) {
            callbacks[i][j].call(undefined, selection[i]);
          }
          // If the option set is shareable, push the decision to the
          // URL.
          if (optionSetIsStateful(i)) {
            var state = {};
            state[i] = selection[i];
            $.bbq.pushState(state);
          }
        }
      }
    }

    // Checks the choice for each decision against the valid set of choices
    // for that decision. Returns false if any of the decisions has an invalid
    // choice.
    function decisionsAreValid(decisionsToCheck, validDecisions) {
      var i;
      for (i in decisionsToCheck) {
        if (decisionsToCheck.hasOwnProperty(i)) {
          if (!validDecisions.hasOwnProperty(i) || validDecisions[i].indexOf(decisionsToCheck[i]) == -1) {
            return false;
          }
        }
      }
      return true;
    }

    // Loop through all agents and ask them for decisions.
    for (agent_name in agents) {
      if (agents.hasOwnProperty(agent_name)) {
        // Keep track of the decisions we process per agent.
        processedDecisions[agent_name] = processedDecisions[agent_name] || {};
        agent = agents[agent_name];
        for (point in agent.decisionPoints) {
          if (agent.decisionPoints.hasOwnProperty(point)) {
            // Only continue if this decision point hasn't previously been processed.
            if (!processedDecisions[agent_name][point]) {
              processedDecisions[agent_name][point] = 1;
              // Only talk to the agent if the decision hasn't already been
              // made and cached locally.
              decisions = readDecisionsfromStorage(agent_name, point);
              // Decisions from localStorage need to be checked against the known valid
              // set of choices because they may be stale (e.g. if an option has been
              // removed after being stored in a user's localStorage).
              if (!decisionsAreValid(decisions, agent.decisionPoints[point].choices)) {
                decisions = null;
              }
              if (decisions != null) {
                callCallbacksWithSelection(agent.decisionPoints[point].callbacks, decisions);
              }
              else {
                callback = (function(inner_agent_name, inner_agent, inner_point) {
                  return function(selection) {
                    // Save to local storage.
                    writeDecisionsToStorage(inner_agent_name, inner_point, selection)
                    // Call the per-option-set callbacks.
                    callCallbacksWithSelection(inner_agent.decisionPoints[inner_point].callbacks, selection);
                  };
                })(agent_name, agent, point);
                var decisionAgent = Drupal.personalize.agents[agent.agentType];
                if (!decisionAgent || typeof decisionAgent.getDecisionsForPoint !== 'function') {
                  // If for some reason we can't find the agent responsible for this decision,
                  // just use the fallbacks.
                  var fallbacks = agent.decisionPoints[point].fallbacks;
                  decisions = {};
                  for (var key in fallbacks) {
                    if (fallbacks.hasOwnProperty(key) && agent.decisionPoints[point].choices.hasOwnProperty(key)) {
                      decisions[key] = agent.decisionPoints[point].choices[key][fallbacks[key]];
                    }
                  }
                  callCallbacksWithSelection(agent.decisionPoints[point].callbacks, decisions);
                  return;
                }
                decisionAgent.getDecisionsForPoint(agent_name, agent.visitorContext, agent.decisionPoints[point].choices, point, agent.decisionPoints[point].fallbacks, callback);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Returns whether the specified option set is stateful.
   *
   * Stateful option sets cause the chosen option to be reflected in the
   * url. This way, if the url is shared with a friend, the friend will
   * see the same option for that option set.
   *
   * @param osid
   *   The option set ID
   *
   * @return boolean
   *   true if the option set is stateful, false otherwise.
   */
  function optionSetIsStateful(osid) {
    if (!Drupal.settings.personalize.option_sets.hasOwnProperty(osid)) {
      return false;
    }
    var stateful = Drupal.settings.personalize.option_sets[osid].stateful;
    return stateful == "1";
  }

  /**
   * Returns the preselected option for the given option set, if one
   * has been set.
   *
   * @param osid
   *   The option set ID
   * @returns string
   *   The selection for the option set or false if none exists.
   */
  function getPreselection(osid) {
    if (optionSetIsStateful(osid) && (selection = $.bbq.getState(osid, true))) {
      return selection;
    }
    if (Drupal.settings.personalize.preselected && Drupal.settings.personalize.preselected.hasOwnProperty(osid)) {
      return Drupal.settings.personalize.preselected[osid];
    }
    return false;
  }

  /**
   * Private function that parses information from the passed in
   * option set and builds up the decision tree for the relevant
   * agent.
   *
   * @param option_set
   *   An object representing an option sett.
   */
  function processOptionSet(option_set) {
    // Bail if this option set has already been processeed.
    for (var i in processedOptionSets) {
      if (option_set.osid == processedOptionSets[i]) {
        return;
      }
    }

    var executor = option_set.executor == undefined ? 'show' : option_set.executor,
      osid = option_set.osid,
      agent_name = option_set.agent,
      agent_info = option_set.agent_info,
      // If we have an empty or undefined decision name, use the osid.
      decision_name = option_set.decision_name == undefined || option_set.decision_name == '' ? osid : option_set.decision_name,
      // If we have an empty or undefined decision point, use the decision name.
      decision_point = option_set.decision_point == undefined || option_set.decision_point == '' ? decision_name : option_set.decision_point,
      choices = option_set.option_names,
      $option_set = $(option_set.selector);
    // Mark this Option Set as processed so it doesn't get processed again.
    processedOptionSets.push(option_set.osid);

    var chosenOption = null, fallbackIndex = 0;
    if (option_set.hasOwnProperty('winner') && option_set.winner !== null) {
      fallbackIndex = option_set.winner;
    }
    // If we have a pre-selected decision for this option set, just
    // use that.
    if (selection = getPreselection(osid)) {
      chosenOption = selection;
    }
    // If we're in admin mode or the campaign is paused, just show the first option,
    // or, if available, the "winner" option.
    else if (adminMode || !agent_info.active) {
      chosenOption = choices[fallbackIndex];
    }
    // If we now have a chosen option, just call the executor and be done.
    if (chosenOption !== null) {
      // We need the check for $option_set.length because the Option Set isn't
      // necessarily in the DOM - it could be part of an MVT where not all Option
      // Sets are present on the page.
      if ($option_set.length > 0 && Drupal.personalize.executors.hasOwnProperty(executor)) {
        Drupal.personalize.executors[executor].execute($option_set, chosenOption, osid);
      }
      // Either way, no further processing should take place.
      return;
    }

    if (!agent_info) {
      return;
    }
    var agent_type = agent_info.type;
    if (agent_type == undefined) {
      agent_type = 'default_agent';
    }

    var visitor_context = getVisitorContext(agent_name, agent_type, agent_info.enabled_contexts);

    // Build up the agent data, organized into decision points and decisions.
    agents[agent_name] = agents[agent_name] || {
      agentType: agent_type,
      visitorContext: visitor_context,
      decisionPoints: {}
    };
    agents[agent_name].decisionPoints[decision_point] =
       agents[agent_name].decisionPoints[decision_point] || { choices: {}, callbacks: {}, fallbacks: {}};

    if (!agents[agent_name].decisionPoints[decision_point].choices[decision_name]) {
      // The choices for a given decision are the same regardless of the number of
      // different option sets using it.
      agents[agent_name].decisionPoints[decision_point].choices[decision_name] = choices;
    }
    if (!agents[agent_name].decisionPoints[decision_point].fallbacks[decision_name]) {
      // The fallback for a given decision also has to be the same for each option
      // set using it.
      agents[agent_name].decisionPoints[decision_point].fallbacks[decision_name] = fallbackIndex;
    }

    agents[agent_name].decisionPoints[decision_point].callbacks[decision_name] =
      agents[agent_name].decisionPoints[decision_point].callbacks[decision_name] || [];
    // Add a callback for this option set to the decision point.
    if ($option_set.length > 0) {
      agents[agent_name].decisionPoints[decision_point].callbacks[decision_name].push(function(decision) {
        Drupal.personalize.executors[executor].execute($option_set, decision, osid);
        // Fire an event so other code can respond to the decision.
        $(document).trigger('personalizeDecision', [$option_set, decision, osid]);
      });
    }
    else {
      // If it's a phantom Option Set, i.e. one that hasn't actually been rendered on
      // the page, just pass an empty callback function.
      agents[agent_name].decisionPoints[decision_point].callbacks[decision_name].push(function(decision) {});
    }
  }

  // Keeps track of processed listeners so we don't subscribe them more than once.
  var processedListeners = {};

  /**
   * Add an action listener for client-side goal events.
   */
  function addActionListener(settings) {
    if (Drupal.hasOwnProperty('visitorActions') && !adminMode) {
      var events = {}, new_events = 0;
      for (var eventName in settings.personalize.actionListeners) {
        if (settings.personalize.actionListeners.hasOwnProperty(eventName) && !processedListeners.hasOwnProperty(eventName)) {
          processedListeners[eventName] = 1;
          events[eventName] = settings.personalize.actionListeners[eventName];
          new_events++;
        }
      }
      if (new_events > 0) {
        var callback = function(eventName, jsEvent) {
          if (events.hasOwnProperty(eventName)) {
            var goals = events[eventName];
            for (var i in goals) {
              if (goals.hasOwnProperty(i)) {
                var agent = settings.personalize.agent_map[goals[i].agent];
                if (agent !== undefined) {
                  Drupal.personalize.agents[agent.type].sendGoalToAgent(goals[i].agent, eventName, goals[i].value, jsEvent);
                }
              }
            }
          }
        };
        Drupal.visitorActions.publisher.subscribe(callback);
      }
    }
  }

  /*
   * W . E . B   S . T . O . R . A . G . E
   */
  Drupal.personalize.storage = Drupal.personalize.storage || {};
  Drupal.personalize.storage.buckets = Drupal.personalize.storage.buckets || {};
  Drupal.personalize.storage.utilities = {
    cachePrefix: 'Drupal.personalize',
    cacheSeparator: ':',

    /**
     * Generates a visitor context bucket for a particular key.
     *
     * Each visitor context option can have it's own cache expiration and
     * therefore it's own bucket.
     *
     * @param key
     *   The key to store.
     * @returns string
     *   The standardized bucket name.
     */
    generateVisitorContextBucketName: function (key) {
      return 'visitor_context' + this.cacheSeparator + key;
    },

    /**
     * Gets the expiration for a bucket based on the type of bucket.
     *
     * If a bucket specific expiration cannot be found, then keys are stored
     * in session only.
     *
     * @param bucketName
     *   The name of the bucket, i.e., visitor_context.
     * @returns number
     *   - If local storage then the expiration in number of milliseconds
     *   - If session storage then 0
     *   - If no storage configured then -1
     */
    getBucketExpiration: function (bucketName) {
      var data = {};
      if (Drupal.settings.personalize.cacheExpiration.hasOwnProperty(bucketName)) {
        var expirationSetting = Drupal.settings.personalize.cacheExpiration[bucketName];
        if (expirationSetting == 'session') {
          data.bucketType = 'session';
          data.expires = 0;
        } else {
          data.bucketType = 'local';
          if (expirationSetting === 'none') {
            data.expires = NaN;
          } else {
            data.expires = expirationSetting * 60 * 1000;
          }
        }
      }
      return data;
    },

    /**
     * A factory method to create/retrieve a storage bucket.
     *
     * @param bucketName
     *   The name of the bucket to retrieve.
     * @returns {Drupal.personalize.storage.bucket}
     *   The bucket instance.
     */
    getBucket: function (bucketName) {
      if (!Drupal.personalize.storage.buckets.hasOwnProperty(bucketName)) {
        var expirationData = this.getBucketExpiration(bucketName);
        if (expirationData.hasOwnProperty('bucketType')) {
          Drupal.personalize.storage.buckets[bucketName] = new Drupal.personalize.storage.bucket(bucketName, expirationData.bucketType, expirationData.expires);
        } else {
          // No cache mechanisms configured for this bucket.
          Drupal.personalize.storage.buckets[bucketName] = new Drupal.personalize.storage.nullBucket(bucketName);
        }
      }
      return Drupal.personalize.storage.buckets[bucketName];
    },

    /**
     * Determine if the current browser supports web storage.
     */
    supportsLocalStorage: function() {
      if (this.supportsHtmlLocalStorage != undefined) {
        return this.supportsHtmlLocalStorage;
      }
      try {
        this.supportsHtmlLocalStorage = 'localStorage' in window && window['localStorage'] !== null;
      } catch (e) {
        this.supportsHtmlLocalStorage = false;
      }
      return this.supportsHtmlLocalStorage;
    },

    /**
     * Purges the storage of any expired cache items.
     */
    maintain: function () {
      if (!this.supportsLocalStorage()) { return; }
      if (this.wasMaintained != undefined) { return; }
      var currentTime = new Date().getTime();
      var num = localStorage.length;
      var expirations = {};

      for (var i = 0; i < num; i++) {
        var key = localStorage.key(i);
        if (key.indexOf(this.cachePrefix) == 0) {
          // Key names are in the format cachePrefix:bucketName:otherArguments
          var keyParts = key.split(this.cacheSeparator);
          var bucketName = keyParts.length >= 2 ? keyParts[1] : '';
          var expiration = expirations.hasOwnProperty(bucketName) ? expirations[bucketName] : this.getBucketExpiration(bucketName);
          // Store back for fast retrieval.
          expirations[bucketName] = expiration;
          // Make sure the bucket content should expire.
          if (expiration.bucketType === 'local' && !isNaN(expiration.expires)) {
            var stored = localStorage.getItem(key);
            if (stored) {
              var record = JSON.parse(stored);
              // Expire the content if past expiration time.
              if (record.ts && (record.ts + expiration.expires) < currentTime) {
                localStorage.removeItem(key);
              }
            }
          }
        }
      }
      this.wasMaintained = true;
    }
  };

  /**
   * Returns an invalid storage mechanism bucket in a null object pattern.
   *
   * This bucket follows the publicly available methods for the
   * Drupal.personalize.storage.bucket in order to allow reads and writes to
   * fail gracefully when storage is not configured.
   */
  Drupal.personalize.storage.nullBucket = function(bucketName) {
    return {
      read: function (key) {
        return null;
      },
      write: function (key, value) {
        return;
      }
    }
  }

  /**
   * Returns a bucket for reading from and writing to HTML5 web storage.
   *
   * @param bucketName
   *   The name of this bucket of stored items.
   * @param bucketType
   *   The webstorage to use (either local or session).
   * @param expiration
   *   The expiration in minutes for items in this bucket.  NaN for none.
   */
  Drupal.personalize.storage.bucket = function(bucketName, bucketType, expiration) {
    this.bucketName = bucketName;
    this.store = bucketType === 'session' ? sessionStorage : localStorage;
    this.expiration = expiration;

  }

  /**
   * Bucket functions.
   */
  Drupal.personalize.storage.bucket.prototype = (function() {
    /**
     * Gets a bucket-specific prefix for a key.
     */
    function getBucketPrefix() {
      return Drupal.personalize.storage.utilities.cachePrefix + Drupal.personalize.storage.utilities.cacheSeparator + this.bucketName;
    }

    /**
     * Generates a standardized key name.
     *
     * @param key
     *   The key string for the key within the current bucket.
     * @returns string
     *   A fully namespaced key to prevent overwriting.
     */
    function generateKey(key) {
      return getBucketPrefix.call(this) + Drupal.personalize.storage.utilities.cacheSeparator + key;
    }

    /**
     * Generates a standardized value to be stored.
     *
     * @param value
     *   The key's value to be written.
     * @returns string
     *   A standardized stringified object that includes the keys:
     *   - ts:  the timestamp that this item was created
     *   - val: the original submitted value to store.
     */
    function generateRecord(value) {
      var now = new Date().getTime();
      var record =  {
        ts: now,
        val: value
      };

      return JSON.stringify(record);
    }

    return {
      /**
       * Reads an item from the bucket.
       *
       * @param key
       *   The bucket-specific key to use to lookup the item.
       * @returns
       *   The value set for the key or null if not available.
       */
      read: function (key) {
        if (!Drupal.personalize.storage.utilities.supportsLocalStorage()) { return null; }
        var stored = this.store.getItem(generateKey.call(this,key));
        if (stored) {
          var record = JSON.parse(stored);
          if (record.val) {
            return record.val;
          }
        }
        return null;
      },

      /**
       * Writes an item to the bucket.
       *
       * @param key
       *   The bucket-specific key to use to store the item.
       * @param value
       *   The value to store.
       */
      write: function (key, value) {
        if (!Drupal.personalize.storage.utilities.supportsLocalStorage()) { return; }
        var fullKey = generateKey.call(this, key);
        var record = generateRecord.call(this, value);
        // Fix for iPad issue - sometimes throws QUOTA_EXCEEDED_ERR on setItem.
        this.store.removeItem(fullKey);
        try {
          this.store.setItem(fullKey, record);
        } catch (e) {
          // @todo Add handling that removes records from storage based on age.
          //if (e.name === 'QUOTA_EXCEEDED_ERR' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          // For now just carry on without the additional stored values.
          return;
        }
      },

      /**
       * Removes an item from a bucket.
       *
       * @param key
       *   The bucket-specific key to use to remove the item.
       */
      removeItem: function (key) {
        if (!Drupal.personalize.storage.utilities.supportsHtmlLocalStorage()) { return; }
        var fullKey = generateKey.call(this, key);
        this.store.removeItem(fullKey);
      }
    }
  })();

})(jQuery);
