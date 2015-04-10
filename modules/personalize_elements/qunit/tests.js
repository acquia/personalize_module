QUnit.module("Personalize Elements", {
  // Set up a base agent and the personalize element types.
  setup: function() {
    $ = jQuery;
    Drupal.personalize.resetAll();
    Drupal.settings.personalize = {
      'cacheExpiration': {
        'decisions': 'session'
      },
      'agent_map': {
        'my-agent': {
          'active': 1,
          'cache_decisions': false,
          'enabled_contexts': [],
          'type': 'test_agent'
        }
      }
    };

    Drupal.settings.personalize_elements.elements = {};
    Drupal.settings.personalize.option_sets = {};
  }
});

QUnit.test("Personalize page simple", function( assert ) {

  expect(2);
  Drupal.attachBehaviors = function (context, settings) {
    assert.ok(true, 'Attach behaviors was called.');
    assert.ok($('#personalize-option-set-1 p').data('personalize') == 'osid-1', 'Personalized element was assigned a data identifier.');
  }

  addOptionSet('osid-1', '#personalize-option-set-1 p', 'editText', [{option_id: 'variation-1', option_label: 'Variation #1', personalize_elements_content: 'The Rainbow Connection'}]);
  Drupal.personalize.personalizePage(Drupal.settings);
});

/**
 * Adds a personalize elements option set to the settings.
 *
 * @param osid
 *   The option set id to use.
 * @param selector
 *   The selector that should be affected.
 * @param variationType
 *   The type of variation, e.g., editText, addClass, etc.
 * @param options
 *   An array of options to add not including the control.  Each object in the
 *   array should have the following keys:
 *   - option_id: the id of the option
 *   - option_label: the label of the option
 *   - personalize_elements_content: The content that should be used for
 *     personalization.
 */
function addOptionSet(osid, selector, variationType, options) {
  Drupal.settings.personalize.option_sets[osid] = {
    agent: "my-agent",
    agent_info: {
      active: false,
      cache_decisions: false,
      enabled_contexts: [],
      label: "My agent",
      type: "test_agent"
    },
    data: {
      pages: "node",
      personalize_elements_selector: selector,
      personalize_elements_type: variationType
    },
    decision_name: osid,
    decision_point: osid,
    entity_type: "personalize_option_set",
    executor: "personalizeElements",
    label: "Option set " + osid,
    mvt: "",
    option_names: ["control-variation"],
    options: [
      {
        option_id: "control-variation",
        option_label: "Control variation",
        original_index: 0,
        personalize_elements_content: ""
      }
    ],
    osid: osid,
    plugin: "elements",
    preview_link: "",
    rdf_mapping: [],
    selector: selector,
    stateful: "0",
    targeting: {},
    winner: null
  }

  Drupal.settings.personalize_elements.elements[osid] = {
    previewable: true,
    selector: selector,
    variation_type: variationType
  }

  for (var i = 0; i < options.length; i++) {
    options[i].original_index = i + 1;
    Drupal.settings.personalize.option_sets[osid]['option_names'].push(options[i].option_id);
    Drupal.settings.personalize.option_sets[osid]['options'].push(options[i]);
  }
}
