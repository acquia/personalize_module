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
    foreach ($params as $name => $values) {
      $options[$name] = array(
        'name' => $name,
        'group' => 'Querystring Params'
      );
    }

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
    $param_values = variable_get('personalize_url_querystring_contexts', array());
    foreach ($this->selectedContext as $name) {
      $possible_values[$name] = array(
        'values' => array(),
      );
      foreach ($param_values[$name] as $param_value) {
        // The 'values' array has the actual value as the key and the label or
        // friendly name as the value, but in this case we don't have a label
        // so just use the $param_value as both key and value.
        $possible_values[$name]['values'][$param_value] = $param_value;
      }
    }
    return $possible_values;
  }
}
