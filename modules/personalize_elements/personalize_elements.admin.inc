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
  $form = array(
    '#attached' => array(
      'css' => array(
        drupal_get_path('module', 'personalize_elements') . '/css/personalize_elements.admin.css'
       )
    )
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

  $form['selector'] = array(
    '#title' => t('Selector'),
    '#description' => t('The selector to find the element to personalize.'),
    '#type' => 'textfield',
    '#required' => TRUE,
    '#default_value' => isset($option_set->data['personalize_elements_selector']) ? $option_set->data['personalize_elements_selector'] : '',
  );

  $variation_type_options = array();
  $variation_types = module_invoke_all('personalize_elements_variation_types');
  foreach ($variation_types as $type => $label) {
    $variation_type_options[$type] = $label;
  }

  $form['variation_type'] = array(
    '#title' => t('Variation Type'),
    '#type' => 'select',
    '#options' => array('' => t('Select a variation type...')) + $variation_type_options,
    '#default_value' => isset($option_set->data['personalize_elements_type']) ? $option_set->data['personalize_elements_type'] : '',
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

  // If the "Add another" button was clicked, we need to increment the number of
  // options by one.
  $num_options = count($options);
  if (empty($options) || (isset($form_state['num_options']) && $form_state['num_options'] > $num_options)) {
    $options[] = array(
      'option_label' => personalize_generate_option_label($num_options),
      'content' => '',
    );
  }
  $form_state['num_options'] = count($options);
  $form_state['options'] = $options;
  // Add current tabs to the form.
  foreach ($options as $delta => $option) {
    $option_form = array(
      '#tree' => TRUE,
    );
    $option_form['option_label'] = array(
      '#prefix' => '<div class="personalize-elements-option-label-element">',
      '#suffix' => '</div>',
      '#type' => 'textfield',
      '#title' => t('Option label'),
      '#size' => 20,
      '#default_value' => !empty($option['option_label']) ? $option['option_label'] : '',
    );
    $option_form['personalize_elements_content'] = array(
      '#prefix' => '<div class="personalize-elements-option-content-element">',
      '#suffix' => '</div>',
      '#type' => 'textfield',
      '#size' => 120,
      '#title' => t('Content'),
      '#default_value' => !empty($option['personalize_elements_content']) ? $option['personalize_elements_content'] : '',
    );
    $form['options_wrapper']['options'][$delta] = $option_form;
  }

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
 * Submit handler for the element creation form.
 */
function personalize_elements_form_submit($form, &$form_state) {
  $op = isset($form_state['values']['op']) ? $form_state['values']['op'] : '';

  if ($op == t('Save')) {
    $option_set = personalize_elements_convert_form_values_to_option_set($form_state['values']);
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
  $option_set = array(
    'label' => $values['title'],
    'plugin' => 'elements',
    'agent' => $values['agent_select'],
    'executor' => 'personalizeElements',
    'options' => $values['options'],
    'data' => array(
      'personalize_elements_selector' => $values['selector'],
      'personalize_elements_type' => $values['variation_type']
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
