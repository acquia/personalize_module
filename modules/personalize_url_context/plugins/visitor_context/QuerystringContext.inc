<?php
/**
 * @file
 * Provides a visitor context plugin for querystring params

 */

class QuerystringContext extends PersonalizeContextBase {

  /**
   * Implements PersonalizeContextInterface::create().
   */
  public static function create(PersonalizeAgentInterface $agent, $selected_context) {
    return new self($agent, $selected_context);
  }

  /**
   * Implements PersonalizeContextInterface::getOptions().
   */
  public static function getOptions() {
    $params = variable_get('personalize_url_querystring_contexts', array());
    $options = array();
    foreach ($params as $name) {
      $options[$name] = array(
        'name' => $name,
        'group' => 'Querystring Params'
      );
    }
    // Add the referrer URL context. This will get lumped into the
    // "Miscellaneous" group.
    $options['referrer_url'] = array(
      'name' => t('Referrer URL')
    );

    return $options;
  }

  /**
   * Implements PersonalizeAgentInterface::getAssets().
   */
  public function getAssets() {
    return array(
      'js' => array(
        drupal_get_path('module', 'personalize_url_context') . '/js/personalize_url_context.js' => array(),
      )
    );
  }

  /**
   * Implements PersonalizeAgentInterface::getPossibleValues().
   */
  public function getPossibleValues() {
    $possible_values = array();
    foreach ($this->selectedContext as $name) {
      $possible_values[$name] = array(
        'value type' => 'string',
      );
    }
    // Also add the possible values for the Referrer URL context.
    $possible_values['referrer_url'] = array(
      'value type' => 'string',
      'friendly name' => t('Referrer URL')
    );
    return $possible_values;
  }
}
