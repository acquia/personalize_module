<?php

/**
 * @file personalize_elements.admin.inc
 * Provides functions needed for the admin UI.
 */


/**
 * Menu callback for the element edit page.
 *
 * @param $element
 *   The element to edit
 *
 * @return array|mixed
 *   The element edit form.
 */
function personalize_elements_edit($element) {
  if (!$element) {
    drupal_not_found();
    return NULL;
  }
  return drupal_get_form('personalize_elements_form', NULL, FALSE, $element);
}

/**
 * Menu callback for displaying a list of all existing custom elements.
 */
function personalize_elements_list() {

  $header = array(
    array('data' => t('element name')),
    array('data' => t('Operations'), 'colspan' => 2),
  );
  $rows = array();

  foreach (personalize_option_set_load_by_type('elements') as $option_set) {
    $tablerow = array(
      array('data' => check_plain($option_set->label)),
      array('data' => l(t('Edit'), 'admin/structure/personalize-elements/manage/'. $option_set->osid . '/edit')),
      array('data' => l(t('Delete'), 'admin/structure/personalize-elements/manage/'. $option_set->osid . '/delete')),
    );
    $rows[] = $tablerow;
  }

  if (empty($rows)) {
    $rows[] = array(array('data' => t('No elements available.'), 'colspan' => 3));
  }

  $build = array(
    '#theme' => 'table',
    '#header' => $header,
    '#rows' => $rows,
    '#attributes' => array('id' => 'personalize_elements'),
  );
  return $build;
}

/**
 * Form for creating a new action.
 */
function personalize_elements_form($form, &$form_state, $isAjax = FALSE, $option_set = NULL) {
  $path = drupal_get_path('module', 'personalize_elements');
  $form = array(
    '#attached' => array(
      'css' => array(
        $path . '/css/personalize_elements.admin.css',
       ),
      'js' => array(
        $path . '/js/personalize_elements.admin.js',
      ),
    ),
  );

  if (!$option_set) {
    $option_set = new stdClass();
  }
  $options = array();
  if (isset($form_state['options'])) {
    $options = $form_state['options'];
  }
  elseif (isset($option_set->options)) {
    foreach ($option_set->options as $option) {
      $options[] = array('option_label' => $option['option_label'], 'personalize_elements_content' => $option['personalize_elements_content']);
    }
  }
  if (!empty($option_set->osid)) {
    // Make sure a warning message is delivered if this is a running
    // campaign.
    personalize_warn_if_running($option_set->agent);
    $form['osid'] = array(
      '#type' => 'value',
      '#value' => $option_set->osid,
    );
    $form['agent_select'] = array(
      '#type' => 'value',
      '#value' => $option_set->agent,
    );
  }
  else {
    $current_agent = isset($option_set->agent) ? $option_set->agent : '';
    $form += personalize_get_agent_selection_form($current_agent);
  }

  $form['title'] = array(
    '#title' => t('Title'),
    '#description' => t('The administrative title of this Option Set.'),
    '#type' => 'textfield',
    '#required' => TRUE,
    '#default_value' => isset($option_set->label) ? $option_set->label : '',
  );

  $variation_type_options = array();
  $selector_states = array();
  $variation_types = module_invoke_all('personalize_elements_variation_types');
  foreach ($variation_types as $type => $info) {
    $variation_type_options[$type] = $info['label'];
    if ($info['needs_selector']) {
      $selector_states[] = array('select[name="variation_type"]' => array("value" => $type));
    }
  }

  $form['variation_type'] = array(
    '#title' => t('Variation Type'),
    '#type' => 'select',
    '#options' => array('' => t('Select a variation type...')) + $variation_type_options,
    '#default_value' => isset($option_set->data['personalize_elements_type']) ? $option_set->data['personalize_elements_type'] : '',
  );

  if (!empty($selector_states)) {
    $form['selector'] = array(
      '#title' => t('Selector'),
      '#description' => t('The selector to find the element to personalize.'),
      '#type' => 'textfield',
      '#default_value' => isset($option_set->data['personalize_elements_selector']) ? $option_set->data['personalize_elements_selector'] : '',
    );
    $form['selector']['#states'] = array(
      'visible' => $selector_states,
      'required' => $selector_states,
    );
  }

  // If the "Add another" button was clicked, we need to increment the number of
  // options by one.
  $num_options = count($options);
  if (empty($options) || (isset($form_state['num_options']) && $form_state['num_options'] > $num_options)) {
    $index = isset($options[0]['option_label']) && $options[0]['option_label'] == PERSONALIZE_ELEMENTS_CONTROL_OPTION_LABEL ? $num_options - 1 : $num_options;
    $options[] = array(
      'option_label' => personalize_generate_option_label($index),
      'content' => '',
    );
  }
  $form_state['num_options'] = count($options);
  $form_state['options'] = $options;

  $form['add_control_option'] = array(
    '#type' => 'checkbox',
    '#title' => t('Use a control "do nothing" option'),
    '#default_value' => $options[0]['option_label'] == PERSONALIZE_ELEMENTS_CONTROL_OPTION_LABEL ? 1 : 0,
  );

  // Add a wrapper for the options and Add another option button.
  $form['options_wrapper'] = array(
    '#tree' => FALSE,
    '#title' => t('Options'),
  );

  $form['options_wrapper']['options'] = array(
    '#tree' => TRUE,
    '#theme_wrappers' => array('container'),
    '#attributes' => array('id' => 'personalize-elements-options'),
  );

  $form['options_wrapper']['options_more'] = array(
    '#type' => 'submit',
    '#value' => t('Add another'),
    '#attributes' => array('class' => array('personalize-elements-add-option'), 'title' => t('Click here to add more options.')),
    '#weight' => 1,
    '#submit' => array('personalize_elements_add_option_submit'),
    '#ajax' => array(
      'callback' => 'personalize_elements_add_option_ajax_callback',
      'wrapper' => 'personalize-elements-options',
      'effect' => 'fade',
    ),
    '#limit_validation_errors' => array(),
  );

  // Add current tabs to the form.
  foreach ($options as $delta => $option) {
    $option_form = array(
      '#tree' => TRUE,
    );
    $option_form['option_label'] = array(
      '#prefix' => '<div class="personalize-elements-option-label-element">',
      '#suffix' => '</div>',
      '#type' => 'textfield',
      '#title' => t('Variation label'),
      '#size' => 20,
      '#default_value' => !empty($option['option_label']) ? check_plain($option['option_label']) : '',
    );
    $option_form['personalize_elements_content'] = array(
      '#prefix' => '<div class="personalize-elements-option-content-element">',
      '#suffix' => '</div>',
      '#type' => 'textarea',
      '#rows' => 2,
      '#title' => t('Content'),
      '#default_value' => !empty($option['personalize_elements_content']) ? $option['personalize_elements_content'] : '',
    );
    if (empty($option_set->osid)) {
      $option_form['option_label']['#attributes']['class'][] = 'personalize-elements-add-option-label';
      $option_form['personalize_elements_content']['#attributes']['class'][] = 'personalize-elements-add-content';
    }
    $form['options_wrapper']['options'][$delta] = $option_form;
  }
  $form['options_wrapper']['options'][0]['option_label']['#states'] =
  $form['options_wrapper']['options'][0]['personalize_elements_content']['#states'] = array(
    'disabled' => array(
      ':input[name="options[0][option_label]"]' => array('value' => PERSONALIZE_ELEMENTS_CONTROL_OPTION_LABEL)
    )
  );

  $form['advanced'] = array(
    '#type' => 'fieldset',
    '#title' => t('Advanced Options'),
    '#collapsible' => TRUE,
    '#collapsed' => TRUE,
  );
  $form['advanced']['pages'] = array(
    '#type' => 'textarea',
    '#title' => t('Pages'),
    '#default_value' => isset($_GET['path']) ? urldecode($_GET['path']) : (isset($option_set->data['pages']) ? $option_set->data['pages'] : ''),
    '#description' => t("Specify pages by using their paths or leave blank to apply to all pages. Enter one path per line. The '*' character is a wildcard. Example paths are %blog for the blog page and %blog-wildcard for every personal blog. %front is the front page.", array('%blog' => 'blog', '%blog-wildcard' => 'blog/*', '%front' => '<front>')),
  );

  $form['actions'] = array('#type' => 'actions');
  $form['actions']['submit_form'] = array(
    '#type' => 'submit',
    '#value' => t('Save'),
  );

  $form_state['isAjax'] = $isAjax;

  return $form;
}

/**
 * Submit handler for the "Add another" button.
 */
function personalize_elements_add_option_submit($form, &$form_state) {
  // Increment the number of option element sets to be rendered.
  $form_state['num_options']++;
  $form_state['rebuild'] = TRUE;
}

/**
 * Ajax callback for the "Add another" button.
 */
function personalize_elements_add_option_ajax_callback($form, &$form_state) {
  return $form['options_wrapper']['options'];
}

/**
 * Validation callback for the element creation/edit form.
 */
function personalize_elements_form_validate($form, &$form_state) {
  $values = &$form_state['values'];
  if ($values['op'] == t('Save')) {
    if (empty($values['variation_type'])) {
      form_set_error('variation_type', t('You must choose a variation type'));
    }
    $needs_control_option = isset($values['add_control_option']) && $values['add_control_option'];
    $has_control_option = $values['options'][0]['option_label'] == PERSONALIZE_ELEMENTS_CONTROL_OPTION_LABEL;
    // If the option set needs a control option and doesn't yet have one, then
    // one will be added on submit so only 1 additional option is required,
    // otherwise a minimum of 2 options must be supplied.
    $num_required = 2;
    if ($needs_control_option && !$has_control_option) {
      $num_required = 1;
    }
    elseif ($has_control_option && !$needs_control_option) {
      // THe control option will be removed, there should be an additional 2
      // options besides the control option.
      $num_required = 3;
    }
    // If an option has an empty label and empty content, it will be removed so
    // we need to count how many non-empty options there are.
    $non_empty_options = 0;

    $allowed_html = variable_get('personalize_elements_allowed_html', _personalize_elements_get_default_allowed_tags());
    $allowed_tags = preg_split('/\s+|<|>/', $allowed_html, -1, PREG_SPLIT_NO_EMPTY);
    // Remove empty options.
    foreach ($values['options'] as $i => &$option) {
      // First, filter out any disallowed html tags.
      $option['personalize_elements_content'] = filter_xss($option['personalize_elements_content'], $allowed_tags);
      if (!empty($option['option_label']) || !empty($option['personalize_elements_content'])) {
        $non_empty_options++;
        if (empty($option['option_label'])) {
          form_set_error('options[' . $i . '][option_label', t('Please enter a label for each option'));
        }
        if ($option['option_label'] !== PERSONALIZE_ELEMENTS_CONTROL_OPTION_LABEL && empty($option['personalize_elements_content'])) {
          form_set_error('options[' . $i . '][personalize_elements_content', t('Please enter content for each option'));
        }
      }
    }
    if ($non_empty_options < $num_required) {
      form_set_error('', t('You must have at least 2 options for an option set'));
    }
  }
}

/**
 * Submit handler for the element creation/edit form.
 */
function personalize_elements_form_submit($form, &$form_state) {
  $op = isset($form_state['values']['op']) ? $form_state['values']['op'] : '';

  if ($op == t('Save')) {
    $option_set = personalize_elements_convert_form_values_to_option_set($form_state['values']);
    // @todo This section should really be the responsibility of personalize module, figure
    //   out a way to not have to add this to every submit callback of a form that uses
    //   the embedded campaign creation form.
    if ($form_state['values']['agent_select'] == PERSONALIZE_NEW_AGENT_FORM_VALUE) {
      if ($new_agent = personalize_save_agent_from_form_values($form_state['values'])) {
        $option_set->agent = $new_agent->machine_name;
      }
      else {
        drupal_set_message('There was a problem saving the new campaign', 'error');
        return;
      }
    }
    personalize_option_set_save($option_set);
    drupal_set_message(t('The option set was saved.'));
    $form_state['redirect'] = 'admin/structure/personalize-elements';
  }
}

/**
 * Ajax callback for the "Add another" button.
 */
function personalize_elements_option_ajax_callback($form, &$form_state) {
  return $form['option_wrapper']['options'];
}

/**
 * Submit handler for the "Add another" button.
 */
function personalize_elements_option_more_submit($form, &$form_state) {
  // Increment the number of option element sets to be rendered.
  $form_state['num_options']++;
  $form_state['rebuild'] = TRUE;
}

/**
 * Converts the values submitted in the form to an element array.
 *
 * @param $values
 *   The form values.
 * @return array
 *   An array that can be saved as an element to the db.
 */
function personalize_elements_convert_form_values_to_option_set($values) {
  $options = $values['options'];
  // Remove empty options.
  foreach ($options as $i => $option) {
    if (empty($option['option_label']) && empty($option['personalize_elements_content'])) {
      unset($options[$i]);
    }
  }
  // Re-key the array in case some items were removed.
  $options = array_values($options);
  if ($options[0]['option_label'] === PERSONALIZE_ELEMENTS_CONTROL_OPTION_LABEL) {
    // This will get added back on if needed, after the other options have
    // been processed.
    $control_option = array_shift($options);
  }
  if (isset($values['add_control_option']) && $values['add_control_option']) {
    if (!isset($control_option)) {
      $control_option = array('option_label' => PERSONALIZE_ELEMENTS_CONTROL_OPTION_LABEL, 'option_id' => PERSONALIZE_ELEMENTS_CONTROL_OPTION_ID, 'personalize_elements_content' => '');
    }
    // Auto-generation of option IDs needs to happen *before* we add the control
    // option as it should not affect the numbering scheme.
    $options = personalize_ensure_unique_option_ids($options);
    // Now add (back) the control option.
    array_unshift($options, $control_option);
  }

  $option_set = array(
    'label' => $values['title'],
    'plugin' => 'elements',
    'agent' => $values['agent_select'],
    'executor' => 'personalizeElements',
    'options' => $options,
    'data' => array(
      'personalize_elements_selector' => $values['selector'],
      'personalize_elements_type' => $values['variation_type'],
      'pages' => $values['pages'],
    )
  );
  if (isset($values['osid'])) {
    $option_set['osid'] = $values['osid'];
  }
  return (object) $option_set;
}

/**
 * Form for deleting a personalized element.
 */
function personalize_elements_element_delete($form, $form_state, $option_set) {
  $form['osid'] = array('#type' => 'hidden', '#value' => $option_set->osid);
  $form['title'] = array('#type' => 'hidden', '#value' => $option_set->label);
  return confirm_form($form, t('Are you sure you want to delete the element %title?', array('%title' => $option_set->label)), 'admin/structure/personalize-elements', '', t('Delete'), t('Cancel'));
}

/**
 * Submit handler for personalized element deletion form.
 */
function personalize_elements_element_delete_submit($form, &$form_state) {
  personalize_option_set_delete($form_state['values']['osid']);
  drupal_set_message(t('The personalized element %name has been removed.', array('%name' => $form_state['values']['title'])));
  $form_state['redirect'] = 'admin/structure/personalize-elements';
}

/**
 * Menu callback for the configuration form.
 */
function personalize_elements_configuration_form($form, &$form_state) {
  $form['personalize_elements_allowed_html'] = array(
    '#title' => t('Allowed HTML tags'),
    '#description' => t('Some Personalize Elements operations involve replacing existing HTML with new HTML, or appending/prepending HTML. Tags other than those included here will be filtered out.'),
    '#type' => 'textarea',
    '#default_value' => variable_get('personalize_elements_allowed_html', _personalize_elements_get_default_allowed_tags()),
  );
  return system_settings_form($form);
}

/**
 * Returns the HTML tags that are enabled by default.
 */
function _personalize_elements_get_default_allowed_tags() {
  return '<p> <div> <img> <a> <br> <caption> <col> <em> <strong> <cite> <blockquote> <code> <ul> <ol> <li> <dl> <dt> <dd> <h1> <h2> <h3> <h4> <h5> <h6> <pre> <span> <table> <tbody> <th> <tr>';
}
