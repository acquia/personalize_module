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
  $agent_instance = !empty($agent_data->plugin) ? personalize_agent_load_agent($agent_data->machine_name) : NULL;

  $form['#attached']['library'][] = array('personalize', 'admin.campaign');

  // Add the top level campaign base information.
  $header_form = personalize_campaign_wizard_base($form, $form_state, $agent_data, $agent_instance);
  if ($header_form === FALSE) {
    return $form;
  }
  $form += $header_form;

  // Add the form navigation bar.
  $form += personalize_campaign_wizard_navigation($form, $form_state, $agent_data, $agent_instance);

  // Add the current sub-form.
  $function = 'personalize_campaign_wizard_' . $form_state['storage']['step'];
  if (function_exists($function)) {
    $form += $function($form, $form_state, $agent_data, $agent_instance);
  }

  // Add the form action buttons.
  $form += personalize_campaign_wizard_action($form, $form_state, $agent_data, $agent_instance);
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
 * @param PersonalizeAgentInterface $agent_instance
 *   The agent that defines the functionality for the campaign (if set).
 *
 * @return array|bool
 *   Returns the form array to include for the campaign header form or FALSE
 *   if there is an error that prevents form display.
 */
function personalize_campaign_wizard_base($form, &$form_state, $agent_data, $agent_instance) {
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
    '#markup' => '<h2>' . t('Create Campaign') . '</h2>',
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
 * @param PersonalizeAgentInterface $agent_instance
 *   The agent that defines the functionality for the campaign (if set).
 *
 * @return array
 *   The form array for the navigation of the multi-step form.
 */
function personalize_campaign_wizard_navigation($form, &$form_state, $agent_data, $agent_instance) {
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
  /*
  $form['navigation']['targeting'] = array(
    '#type' => 'submit',
    '#name' => 'targeting',
    '#value' => t('Who'),
  );*/
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
 * @param PersonalizeAgentInterface $agent_instance
 *   The agent that defines the functionality for the campaign (if set).
 *
 * @return array
 *   The form array for the actions of the multi-step form.
 */
function personalize_campaign_wizard_action($form, &$form_state, $agent_data, $agent_instance) {

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
 * The subform for add/editing variations.
 *
 * @param array $form
 *   The current form array.
 * @param array $form_state
 *   The current drupal form state
 * @param stdClass $agent_data
 *   The current campaign data.
 * @param PersonalizeAgentInterface $agent_instance
 *   The agent that defines the functionality for the campaign (if set).
 */
function personalize_campaign_wizard_variations($form, &$form_state, $agent_data, $agent_instance = NULL) {
  module_load_include('inc', 'personalize', 'personalize.admin');

  // Load the data used throughout form.
  $option_sets = personalize_option_set_load_by_agent($agent_data->machine_name);
  $campaign_page = "admin/structure/personalize/wizard/{$agent_data->machine_name}";
  $is_running = personalize_agent_get_status($agent_data->machine_name) == PERSONALIZE_STATUS_RUNNING;

  $form = array();
  $form['variations'] = array(
    '#type' => 'container',
    '#tree' => FALSE,
    '#attributes' => array(
      'class' => array('personalize-wizard-section'),
    ),
  );
  $form['variations']['title'] = array(
    '#markup' => theme('personalize_wizard_section_title', array(
      'title' => t('Variation sets'),
      'title_summary' => personalize_get_create_new_links_dropbutton($campaign_page),
    )),
  );
  // Determine option set labels.
  $counter = 1;
  // Tricky: key is not necessarily from 0.
  // Setting value on existing object causes unwanted recursion so labels
  // are saved within their own object.
  $option_sets_labels = array();
  foreach($option_sets as $option_set) {
    $option_sets_labels[$option_set->osid] = theme('personalize_admin_enumerated_item', array(
      'enum' => t('Set @delta', array('@delta' => $counter)),
      'title' => isset($option_set->label) ? check_plain($option_set->label) : t('Option Set @id', array('@id' => $option_set->osid)),
    ));
    $counter++;
  }

  // Containing element for all option sets.
  $form['variations']['option_sets'] = array(
    '#tree' => TRUE,
    '#type' => 'container',
    '#attributes' => array(
      'class' => array('personalize-wizard-variation-sets'),
    ),
  );

  $section = &$form['variations']['option_sets'];
  // For any option sets that have been created for this campaign, display
  // advanced options for specifying decision name etc.
  if (empty($option_sets)) {
    return $form;
  }

  $targeting_support = FALSE;
  if ($agent_instance instanceof PersonalizeExplicitTargetingInterface) {
    $targeting_support = $agent_instance->explicitTargetingSupportMultiple();
    // Build up a list of targeting values so we can map options to them.
    $targeting_values = personalize_get_fixed_targeting_values_for_agent($agent_data);
  }

  foreach ($option_sets as $option_set) {
    $option_set_plugin = personalize_get_option_set_type($option_set->plugin);
    $replace_option_set_id = 'personalize-option-set-' . $option_set->osid;

    // Show this open if it was just refreshed via Ajax.
    $section['option_set_' . $option_set->osid] = array(
      '#tree' => TRUE,
      '#type' => 'container',
      '#attributes' => array(
        'class' => array('personalize-option-set'),
        'id' => $replace_option_set_id, // Used for AJAX replace.
      ),
    );
    $option_set_winner = isset($form_state['winners']['option_set_' . $option_set->osid]) ? $form_state['winners']['option_set_' . $option_set->osid] : $option_set->winner;
    $section['option_set_' . $option_set->osid]['winner'] = array(
      '#type' => 'value',
      '#value' => $option_set_winner,
    );
    // Header information.
    $edit_link = module_invoke($option_set_plugin['module'], 'personalize_edit_link', $option_set);
    $delete_link = module_invoke($option_set_plugin['module'], 'personalize_delete_link', $option_set);
    $section['option_set_' . $option_set->osid]['summary'] = array(
      '#type' => 'markup',
      '#markup' => theme('personalize_wizard_variations_header', array(
        'variation_title' => $option_sets_labels[$option_set->osid],
        'variation_count' => count($option_set->options),
        'report' => $agent_instance instanceof PersonalizeAgentReportInterface ? $agent_instance->renderStatsForOptionSet($option_set, $agent_data->started) : array(),
        'report_link' => $agent_instance instanceof PersonalizeAgentReportInterface ? l(t('report'), "admin/structure/personalize/manage/{$agent_data->machine_name}/report/{$option_set->osid}") : '',
        'edit_link' => !empty($edit_link) ? l('edit', $edit_link, array('query' => array('destination' => $campaign_page))) : '',
        'delete_link' => !empty($delete_link) ? l('delete', $delete_link, array('query' => array('destination' => $campaign_page))) : '',
      )),
      '#theme_wrappers' => array('container'),
    );

    $variant_number = 1;
    foreach ($option_set->options as $option) {
      $is_winner = FALSE;
      $is_control = $variant_number == 1;
      // Determine container classes based on campaign status and winner.
      $classes = array('personalize-admin-content-item', 'personalize-content-variation', 'clearfix');
      if ($is_running) {
        $classes[] = 'personalize-content-variation-running';
      }
      else {
        $classes[] = 'personalize-content-variation-stopped';
        // The winner is either previously selected, or the control option.
        if ((!empty($option_set_winner) && $option_set_winner == $option['option_id']) ||
          (empty($option_set_winner) && $is_control)) {
          $is_winner = TRUE;
          $classes[] = 'personalize-content-variation-winner';
        }
      }
      $section['option_set_' . $option_set->osid]['options'][$option['option_id']] = array(
        '#tree' => TRUE,
        '#type' => 'container',
        '#attributes' => array(
          'class' => $classes,
        ),
      );
      $section['option_set_' . $option_set->osid]['options'][$option['option_id']]['basic'] = array(
        '#type' => 'container',
        '#attributes' => array(
          'class' => array('personalize-variation-row'),
        ),
      );
      $preview_link = '';
      if (!empty($option_set->preview_link)) {
        $preview_link = l('Preview', $option_set->preview_link, array(
          'attributes' => array('target' => 'preview'),
          'query' => array(PERSONALIZE_PRESELECTION_PARAM => personalize_stringify_osid($option_set->osid) . '--' . $option['option_id']),
        ));
      }
      $suffix = !empty($preview_link) ? '" ' . $preview_link : '"';
      if ($is_control) {
        $suffix .= '<span class="personalize-content-variation-control">' . t('Control') . '</span>';
      }
      if ($is_winner) {
        $suffix .= '<span class="personalize-content-variation-winner">' . t('Fallback/Winner') . '</span>';
      }

      $heading = theme('personalize_admin_enumerated_item', array(
        'enum' => t('V@delta', array('@delta' => $variant_number)),
        'title' => check_plain($option['option_label']),
        'title_prefix' => '"',
        'title_suffix' => $suffix,
      ));
      $section['option_set_' . $option_set->osid]['options'][$option['option_id']]['basic']['heading'] = array(
        '#markup' => $heading,
      );
      if (!$is_running & !$is_winner) {
        $section['option_set_' . $option_set->osid]['options'][$option['option_id']]['basic']['winner'] = array(
          '#prefix' => '<div class="personalize-option-set-winner">',
          '#suffix' => '</div>',
          '#type' => 'submit',
          '#tag' => 'button',
          '#text' => t('Set as Fallback/Winner'),
          '#value' => 'winner_' . $option_set->osid . '_' . $option['option_id'],
          '#theme_wrappers' => array('personalize_html_tag'),
          '#attributes' => array(
            // The ID is necessary for the AJAX replace to function correctly.
            'id' => 'edit-option-sets-option-set-' . $option_set->osid . '-options-' . $option['option_id'] . '-basic-winner',
            'class' => array('personalize-add-link'),
            'title' => t('Click here to set as winning variation.')
          ),
          '#submit' => array('personalize_campaign_wizard_ajax_variations_winner_submit'),
          '#ajax' => array(
            'callback' => 'personalize_campaign_wizard_ajax_variations_callback',
            'wrapper' => $replace_option_set_id,
            'effect' => 'fade',
            'progress' => array(
              'message' => ' ',
              'type' => 'throbber',
            )
          ),
        );
      }
      if ($targeting_support && !empty($targeting_values)) {
        $section['option_set_' . $option_set->osid]['options'][$option['option_id']]['targeting'] = array(
          '#type' => 'container',
          '#attributes' => array(
            'class' => array('personalize-variation-row'),
          ),
        );
        $section['option_set_' . $option_set->osid]['options'][$option['option_id']]['targeting']['enable_explicit_targeting'] = array(
          '#title' => t('Show to visitors with specific traits'),
          '#type' => 'checkbox',
          '#default_value' => !empty($option['fixed_targeting']) ? 1 : 0,
          '#parents' => array('option_sets', 'option_set_' . $option_set->osid, 'options', $option['option_id'],'enable_explicit_targeting'),
        );
        $states = array(
          'visible' => array(
            ':input[name="option_sets[option_set_' . $option_set->osid . '][options][' . $option['option_id'] . '][enable_explicit_targeting]"]' => array('checked' => TRUE),
          ),
        );
        $parents = array('option_sets', 'option_set_' . $option_set->osid, 'options', $option['option_id']);
        $section['option_set_' . $option_set->osid]['options'][$option['option_id']]['explicit_targeting'] = personalize_targeting_support_form_elements($option_set, $option, $targeting_values, $targeting_support, $states, $parents, $form_state);
      }
      $variant_number++;
    } // end of loop through variations.

    switch ($targeting_support) {
      case PersonalizeExplicitTargetingInterface::EXPLICIT_TARGETING_MULTIPLE_AND:
        $section['option_set_' . $option_set->osid]['explicit_targeting_explanation'] = array(
          '#type' => 'markup',
          '#markup' => t('You can add explicit targeting for this content variation. If you choose multiple contexts for an option, then the visitor must have all specified contexts for the rule to apply.')

        );
        break;
      case PersonalizeExplicitTargetingInterface::EXPLICIT_TARGETING_MULTIPLE_OR:
        $section['option_set_' . $option_set->osid]['explicit_targeting_explanation'] = array(
          '#type' => 'markup',
          '#markup' => t('You can add explicit targeting for this content variation. If you choose multiple contexts for an option, then the rule will apply if the visitor has any of the specified contexts.')
        );
        break;
    }

    // Advanced area per option set.
    $section['option_set_' . $option_set->osid]['advanced'] = array(
      '#type' => 'fieldset',
      '#collapsible' => TRUE,
      '#collapsed' => TRUE,
      '#title' => t('Advanced'),
    );
    $section['option_set_' . $option_set->osid]['advanced']['label'] = array(
      '#type' => 'textfield',
      '#title' => 'Name',
      '#description' => 'Shown in the menu when you are viewing content variations on a page.',
      '#default_value' => isset($option_set->label) ? $option_set->label : '',
    );
    $section['option_set_' . $option_set->osid]['advanced']['decision_name'] = array(
      '#type' => 'textfield',
      '#title' => 'Decision Name',
      '#description' => 'By default, this decision will be named after the content variation ID. You can use this if you want to make one conceptual decision across multiple content variations such as a special offer which manifests in different places on the site.',
      '#default_value' => isset($option_set->decision_name) ? $option_set->decision_name : '',
    );
    $section['option_set_' . $option_set->osid]['advanced']['stateful'] = array(
      '#type' => 'checkbox',
      '#title' => t('Shareable'),
      '#description' => 'Will display what the original visitor saw, not another variation.',
      '#default_value' => isset($option_set->stateful) ? $option_set->stateful : 0,
    );
    $section['option_set_' . $option_set->osid]['advanced']['preview_link'] = array(
      '#type' => 'textfield',
      '#title' => 'Preview link',
      '#description' => t('Enter the internal Drupal path on your site to a page containing this content variation set. Enter &lt;front&gt; to link to the front page.'),
      '#default_value' => !empty($option_set->preview_link) ? $option_set->preview_link : '',
    );
    // Display options to select the executor if supported.
    $executors = personalize_get_executors();
    $supported_executors = module_invoke($option_set_plugin['module'], 'personalize_get_executor_options');
    if (count($supported_executors) == 1) {
      $section['option_set_' . $option_set->osid]['advanced']['executor'] = array(
        '#type' => 'value',
        '#value' => array_shift(array_keys($supported_executors)),
      );
    }
    else if (count($supported_executors) > 1) {
      $default_executor = '';
      $options = array();
      foreach($supported_executors as $executor_name => &$supported_options) {
        // Allow the supported declarations to overwrite the default displays.
        $supported_options += $executors[$executor_name];
        $options[$executor_name] = $supported_options['title'];
        if (isset($supported_options['default']) && $supported_options['default'] === TRUE) {
          $default_executor = $executor_name;
        }
      }

      if (isset($option_set->executor) && isset($options[$option_set->executor])) {
        $default_executor = $option_set->executor;
      }
      if (empty($default_executor)) {
        reset($supported_executors);
        $default_executor = key($supported_executors);
      }

      $section['option_set_' . $option_set->osid]['advanced']['executor'] = array(
        '#type' => 'radios',
        '#title' => t('Rendering'),
        '#options' => $options,
        '#default_value' => $default_executor,
        '#title_display' => 'invisible',
      );
      // Add descriptions to the executor options
      foreach($supported_executors as $executor_name => $options) {
        $section['option_set_' . $option_set -> osid]['advanced']['executor'][$executor_name] = array(
          '#description' => $options['description'] . theme('personalize_admin_info_details', $options),
        );
      }
    }
  } // End loop through option sets.
  return $form;
}

/**
 ********************************************************************
 *
 * A J A X  C A L L B A C K S
 *
 ********************************************************************
 */

/**
 * Ajax submit callback to set the winning variation within an option set.
 */
function personalize_campaign_wizard_ajax_variations_winner_submit($form, &$form_state) {
  list($prefix, $osid, $option_id) = explode('_', $form_state['triggering_element']['#value']);
  $form_state['winners']['option_set_' . $osid] = $option_id;
  $form_state['rebuild'] = TRUE;
}

/**
 * Ajax callback to return a portion of the variations form.
 */
function personalize_campaign_wizard_ajax_variations_callback($form, &$form_state) {
  list($prefix, $osid, $option_id) = explode('_', $form_state['triggering_element']['#value']);
  return $form['variations']['option_sets']['option_set_' . $osid];
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
 * Custom validation callback for variations form.
 *
 * Clean Explicit targeting if "Enable explicit targeting" is unchecked.
 * Ensure that preview links are internal and valid.
 */
function personalize_campaign_wizard_validate_variations($form, &$form_state) {
  $form_values = &$form_state['values']['option_sets'];

  $need_form_state_cache_clear = FALSE;

  foreach ($form_values as $option_set_id => $values) {
    if (!empty($form_values[$option_set_id]['advanced']['preview_link'])) {
      if ($form_values[$option_set_id]['advanced']['preview_link'] != '<front>' && drupal_lookup_path('source', $form_values[$option_set_id]['advanced']['preview_link']) === FALSE) {
        form_set_error('option_sets][' . $option_set_id . '][advanced][preview_link', t('The preview link for "@option_set" must be a valid internal Drupal path.', array(
          '@option_set' => $form_values[$option_set_id]['advanced']['label'],
        )));
      }
    }
    if (!empty($form_values[$option_set_id]['options'])) {
      foreach ($form_values[$option_set_id]['options'] as $option_name => $option) {
        if (isset($option['enable_explicit_targeting']) && $option['enable_explicit_targeting'] == 0) {
          $form_values[$option_set_id]['options'][$option_name]['explicit_targeting']['mapping'] = array();
          $need_form_state_cache_clear = TRUE;
        }
      }
    }
  }

  // Drupal caches form_state before validators are triggered, so flush it
  if ($need_form_state_cache_clear) {
    cache_clear_all('form_state_' . $form_state['values']['form_build_id'], 'cache_form');
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
  $agent = _personalize_agent_from_form_values($form_state['values']['agent_base_info']);
  // If it is a new campaign, save the basic information so that it can be
  // added to in the other subform submit handlers.
  if (empty($agent->machine_name)) {
    $agent = personalize_agent_save($agent);
  }
  return $agent;
}

/**
 * Submit handler for the variations section.
 */
function personalize_campaign_wizard_submit_variations($form, &$form_state, $agent_data) {
  $form_values = $form_state['values']['option_sets'];
  foreach ($form_values as $option_set_id => $values) {
    $osid = (int) str_replace('option_set_', '', $option_set_id);
    if ($option_set = personalize_option_set_load($osid)) {
      $option_set->label = $values['advanced']['label'];
      $option_set->stateful = $values['advanced']['stateful'];
      if (isset($values['advanced']['executor'])) {
        $option_set->executor = $values['advanced']['executor'];
      }
      if (isset($values['advanced']['decision_name'])) {
        $option_set->decision_name = personalize_generate_machine_name($values['advanced']['decision_name']);
      }
      if (isset($values['advanced']['preview_link'])) {
        $option_set->preview_link = $values['advanced']['preview_link'];
      }
      if (isset($values['winner'])) {
        $option_set->winner = $values['winner'];
      }
      if (!isset($values['options'])) {
        personalize_option_set_save($option_set);
        continue;
      }

      // Keep track of which explicit targeting features have already been
      // designated as each can only be specified for one option.
      // Keep track of feature strings that have already been designated to options,
      // which options they have been designated to, and whether there's a rule
      // associated with each feature.
      $designated_features = $option_features = $feature_rules = array();
      foreach ($values['options'] as $option_id => $settings) {
        $option_features[$option_id] = $feature_rules[$option_id] = array();
        $feature_values = $rules = array();
        if (isset($settings['explicit_targeting']) && !empty($settings['explicit_targeting']['mapping'])) {
          foreach ($settings['explicit_targeting']['mapping']['contexts'] as $delta => $context_values) {
            if ($context_values['context'] == '') {
              continue;
            }
            list($plugin_name, $context_name) = explode(PERSONALIZE_TARGETING_ADMIN_SEPARATOR, $context_values['context']);
            $context_values['match'] = $context_values['value']['match'];
            $context_values['operator'] = $context_values['value']['operator'];
            unset($context_values['value'], $context_values['remove']);
            // Generate a value code based on the operator used.
            $value = personalize_targeting_generate_value_code($context_values['match'], $context_values['operator']);
            // Create a feature string for this context value that can be consumed
            // by the agent that will be using it.
            $feature_string = $agent_data->convertContextToFeatureString($context_name, $value);
            $feature_values[] = $feature_string;
            // Save the actual rule information as this is what will be used
            // for evaluating it.
            $rules[$feature_string] = $context_values;
            // Override the context to split it into plugin and context parts.
            $rules[$feature_string]['context'] = $context_name;
            $rules[$feature_string]['plugin'] = $plugin_name;
          }
          foreach ($feature_values as $feature) {
            $option_features[$option_id][] = $feature;
            $feature_rules[$option_id][$feature] = $rules[$feature];
            // Mark this feature string as already designated.
            if (!in_array($feature, $designated_features)) {
              $designated_features[] = $feature;
            }
            else {
              drupal_set_message(t('You have set the same targeting feature for more than one option. Depending on whether features are AND\'d or OR\'d together for the different options, and on how the decision agent evaluates explicit targeting rules, this may not produced the desired effect.'), 'warning');
            }

          }
        }
      }

      // Now add the features to the option set's options array.
      foreach ($option_set->options as &$option) {
        if (isset($option_features[$option['option_id']])) {
          $option['fixed_targeting'] = $option_features[$option['option_id']];
          $option['fixed_targeting_rules'] = $feature_rules[$option['option_id']];

          // If a strategy has been specified for how to use the targeting features,
          // then store this as well.
          if (isset($values['options'][$option['option_id']]['explicit_targeting']['strategy'])) {
            $option['fixed_targeting_strategy'] = $values['options'][$option['option_id']]['explicit_targeting']['strategy'];
          }
        }
      }
      personalize_option_set_save($option_set);
    }
  }
  $form_state['new_step'] = 'goals';
}

/**
 * Submit handler for the goals section.
 */
function personalize_campaign_wizard_submit_goals($form, &$form_state) {
  // $form_state['new_step'] = 'targeting'; Put this back when there is a "who" page.
  $form_state['new_step'] = 'scheduling';
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
