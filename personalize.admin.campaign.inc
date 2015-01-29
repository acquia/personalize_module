<?php

/**
 * @file personalize.admin.campaign.inc
 * Includes the multi-page campaign form wizard.
 */

/**
 ********************************************************************
 *
 * F O R M  G E N E R A T I O N
 *
 ********************************************************************
 */

/**
 * Drupal form callback to generate the full campaign wizard.
 */
function personalize_campaign_wizard($form, &$form_state, $agent_data = NULL) {
  $form_state['storage']['step'] = isset($form_state['storage']['step']) ? $form_state['storage']['step'] : 'variations';

  // Determine the data for the current campaign.
  if (empty($agent_data)) {
    if (isset($form_state['values']['agent'])) {
      $agent_data = personalize_agent_load($form_state['values']['agent']);
    }
    else {
      $agent_data = new stdClass();
      if (isset($_GET['personalize_agent_type']) && $plugin = personalize_get_agent_type($_GET['personalize_agent_type'])) {
        $agent_data->plugin = $plugin['name'];
      }
    }
  }
  $form['#agent'] = $agent_data;

  // Add the top level campaign base information.
  $header_form = personalize_campaign_wizard_base($form, $form_state, $agent_data);
  if ($header_form === FALSE) {
    return $form;
  }
  $form += $header_form;

  // Add the form navigation bar.
  $form += personalize_campaign_wizard_navigation($form, $form_state, $agent_data);

  // Add the current sub-form.
  $function = 'personalize_campaign_wizard_' . $form_state['storage']['step'];
  if (function_exists($function)) {
    $form += $function($form, $form_state, $agent_data);
  }

  // Add the form action buttons.
  $form += personalize_campaign_wizard_action($form, $form_state, $agent_data);
  return $form;
}

/**
 * Generates the top-level campaign information shown above each sub-form.
 *
 * @param array $form
 *   The current form array.
 * @param array $form_state
 *   The current drupal form state
 * @param stdClass $agent_data
 *   The current campaign data.
 *
 * @return array|bool
 *   Returns the form array to include for the campaign header form or FALSE
 *   if there is an error that prevents form display.
 */
function personalize_campaign_wizard_base($form, &$form_state, $agent_data) {
  $form = array();
  // Base form is shown for all steps so the values are the main values.
  $values = isset($form_state['values']) ? $form_state['values'] : array();

  // Make sure we have at least one agent type available.
  $agent_types = personalize_get_agent_types();
  $agent_type_options = $agent_type_form_options = array();
  foreach ($agent_types as $name => $info) {
    if ($class = ctools_plugin_load_class('personalize', 'agent_type', $name, 'handler')) {
      // Add this option to the options for the "agent type" dropdown.
      $agent_type_options[$name] = $name;
    }
  }
  if (empty($agent_type_options)) {
    drupal_set_message(t('You don\'t have any agent types enabled. Please enable the personalize_target module or another module that provides an agent type.'), 'error');
    return FALSE;
  }
  ksort($agent_type_options);

  $form['header'] = array(
    '#markup' => '<h2>' . t('Create Personalization') . '</h2>',
  );

  $form['agent_base_info'] = array(
    '#type' => 'container',
    '#tree' => TRUE,
  );
  if (!empty($agent_data->machine_name)) {
    $form['agent_base_info']['machine_name'] = array(
      '#type' => 'value',
      '#value' => $agent_data->machine_name,
    );
  }
  if (empty($values['agent_base_info']['title'])) {
    $title = isset($agent_data->label) ? $agent_data->label : '';
  }
  else {
    $title = $values['agent_base_info']['title'];
  }
  $form['agent_base_info']['title'] = array(
    '#title' => t('Name'),
    '#type' => 'textfield',
    '#default_value' => $title,
    '#required' => TRUE,
  );
  if (!empty($agent_data->plugin)) {
    // It is not possible to change the type of an agent.
    $form['agent_base_info']['agent_type'] = array(
      '#type' => 'value',
      '#value' => $agent_data->plugin,
    );
  }
  elseif (count($agent_type_options) < 2) {
    // No need to show a dropdown if there's only one available plugin.
    $form['agent_base_info']['agent_type'] = array(
      '#type' => 'hidden',
      '#value' => key($agent_type_options),
    );
  }
  else {
    $form['agent_base_info']['agent_type'] = array(
      '#type' => 'select',
      '#title' => t('Agent Type'),
      '#options' => $agent_type_options,
      '#default_value' => '',
      '#description' => t('Choose which type of agent to create.'),
    );
  }
  return $form;
}

/**
 * Generate the multi-step form navigation display.
 *
 * @param array $form
 *   The current form array.
 * @param array $form_state
 *   The current drupal form state
 * @param stdClass $agent_data
 *   The current campaign data.
 *
 * @return array
 *   The form array for the navigation of the multi-step form.
 */
function personalize_campaign_wizard_navigation($form, &$form_state, $agent_data) {
  $form = array();
  $form['navigation'] = array(
    '#type' => 'container',
    '#attributes' => array(
      'id' => 'personalize-campaign-wizard-navigation',
    ),
  );
  // @todo Possibly change these to links and handle submitting the form
  // via JavaScript.  That way we don't have a problem with the wrong
  // button being set by the browser as the default submit button for the form.
  $form['navigation']['variations'] = array(
    '#type' => 'submit',
    '#name' => 'variations',
    '#value' => t('What'),
  );
  $form['navigation']['goals'] = array(
    '#type' => 'submit',
    '#name' => 'goals',
    '#value' => t('Why'),
  );
  $form['navigation']['targeting'] = array(
    '#type' => 'submit',
    '#name' => 'targeting',
    '#value' => t('Who'),
  );
  $form['navigation']['scheduling'] = array(
    '#type' => 'submit',
    '#name' => 'scheduling',
    '#value' => t('When'),
  );
  $form['navigation']['review'] = array(
    '#type' => 'submit',
    '#name' => 'review',
    '#value' => t('Review'),
  );

  // Update the display and handling for the current step.
  $current_step = $form_state['storage']['step'];
  if (isset($form['navigation'][$current_step])) {
    $form['navigation'][$current_step]['#attributes'] = array(
      'class' => array('personalize-campaign-wizard-active'),
    );
    $form['navigation'][$current_step]['#disabled'] = TRUE;
  }
  return $form;
}

/**
 * Generate the action buttons for the current step of the form.
 *
 * @param array $form
 *   The current form array.
 * @param array $form_state
 *   The current drupal form state
 * @param stdClass $agent_data
 *   The current campaign data.
 *
 * @return array
 *   The form array for the actions of the multi-step form.
 */
function personalize_campaign_wizard_action($form, &$form_state, $agent_data) {

  $status = empty($agent_data->machine_name) ? PERSONALIZE_STATUS_NOT_STARTED : personalize_agent_get_status($agent_data->machine_name);
  $button_value = t('Next');
  $message = '';
  switch ($form_state['storage']['step']) {
    case 'variations':
      $message = t('Goals for these variations');
      break;
    case 'goals':
      $message = t('Who\'s going to see what');
      break;
    case 'targeting':
      $message = t('When should this campaign run');
      break;
    case 'scheduling':
      $message = $status == PERSONALIZE_STATUS_NOT_STARTED || $status == PERSONALIZE_STATUS_PAUSED ? t('Review personalization settings') : t('Review personalization results');
      break;
    case 'review':
      list($next_status, $button_value) = _personalize_status_toggle_next($status);
      break;
  }
  $form['actions'] = array(
    '#type' => 'actions',
  );
  $form['actions']['submit'] = array(
    '#type' => 'submit',
    '#name' => 'submit',
    '#value' => $button_value,
    '#suffix' => $message,
  );
  return $form;
}

/**
 ********************************************************************
 *
 * V A L I D A T I O N
 *
 ********************************************************************
 */

/**
 * Validate handler for wizard form.
 */
function personalize_campaign_wizard_validate($form, &$form_state) {
  // Call the validation step for the appropriate subform.
  $function = 'personalize_campaign_wizard_validate_' . $form_state['storage']['step'];
  if (function_exists($function)) {
    $function($form, $form_state);
  }
}

/**
 ********************************************************************
 *
 * S U B M I S S I O N
 *
 ********************************************************************
 */

/**
 * Submit handler for wizard form to save current values to the appropriate
 * step.
 */
function personalize_campaign_wizard_submit($form, &$form_state) {
  $form_state['storage']['multistep_values'][$form_state['storage']['step']] = $form_state['values'];

  // Call the base level submit handler.
  $agent = personalize_campaign_wizard_submit_base($form, $form_state);

  // Call the submit handler that is specific to the current step.
  // Each step submit handler is responsible for setting the
  // $form_state['new_step'] value to the appropriate next step.
  $form_state['new_step'] = 'review';
  $function = 'personalize_campaign_wizard_submit_' . $form_state['storage']['step'];
  if (function_exists($function)) {
    $function($form, $form_state, $agent);
  }
  // Save the campaign.
  $exists = personalize_agent_load($agent->machine_name);
  if (personalize_agent_save($agent)) {
    drupal_set_message(t('The campaign has been @saved.', array('@saved' => $exists ? 'updated' : 'created')));
    personalize_set_campaign_context($agent->machine_name);
    if (personalize_agent_get_status($agent->machine_name) == PERSONALIZE_STATUS_RUNNING) {
      personalize_agent_set_status($agent->machine_name, PERSONALIZE_STATUS_PAUSED);
      personalize_status_toggle_message($agent->machine_name, PERSONALIZE_STATUS_PAUSED);
    }
  }
  else {
    drupal_set_message(t('There was a problem saving the campaign.'));
  }

  // If the button that caused the submit is from the navigation, then the next
  // step should be the clicked navigation button regardless of the last step.
  if ($form_state['triggering_element']['#name'] !== 'submit') {
    $form_state['new_step'] = $form_state['triggering_element']['#name'];
  }

  // Rebuild the form to show the next step.
  $form_state['storage']['step'] = $form_state['new_step'];
  $form_state['rebuild'] = TRUE;
}

/**
 * Submit handler for the base campaign-level information.
 *
 * This submit handler is responsible for retrieving the base agent object
 * for any other changes to modify prior to saving.
 *
 * @return stdClass
 *   The agent/campaign class that is being modified.
 */
function personalize_campaign_wizard_submit_base($form, &$form_state) {
  module_load_include('inc', 'personalize', 'personalize.admin');
  return _personalize_agent_from_form_values($form_state['values']['agent_base_info']);
}

/**
 * Submit handler for the variations section.
 */
function personalize_campaign_wizard_submit_variations($form, &$form_state) {
  $form_state['new_step'] = 'goals';
}

/**
 * Submit handler for the goals section.
 */
function personalize_campaign_wizard_submit_goals($form, &$form_state) {
  $form_state['new_step'] = 'targeting';
}
/**
 * Submit handler for the targeting section.
 */
function personalize_campaign_wizard_submit_targeting($form, &$form_state) {
  $form_state['new_step'] = 'scheduling';
}

/**
 * Submit handler for the scheduling section.
 */
function personalize_campaign_wizard_submit_scheduling($form, &$form_state) {
  $form_state['new_step'] = 'review';
}

/**
 * Submit handler for the review section.
 *
 * This really is the form to set the status of the campaign.
 */
function personalize_campaign_wizard_submit_review($form, &$form_state) {
  $form_state['new_step'] = 'review';
}
