<?php

/**
 * @file
 * Theme and processing functions for the Personalize module.
 */

/**
 * Themes a button that allows the text to be set independent of the value.
 */
function theme_personalize_html_tag($variables) {
  $element = $variables['element'];
  $attributes = isset($element['#attributes']) ? drupal_attributes($element['#attributes']) : '';
  $output = '<' . $element['#tag'] . $attributes . '>';
  $output .= $element['#text'];
  $output .= '</' . $element['#tag'] . ">\n";
  return $output;
}

/**
 * Theme wrapper for option sets.
 *
 * Wraps an option set in a script tag so that options are not parsed
 * by the browser on page load. Surrounds this with a div containing
 * all the information needed by our js.
 */
function theme_personalize_options_wrapper($variables) {
  if (!isset($variables['element']['#personalize_option_set'])) {
    return $variables['element']['#children'];
  }

  $option_set = $variables['element']['#personalize_option_set'];
  $js_id = _personalize_get_nonnumeric_osid($option_set->osid);
  $prefix = '<div class="' . PERSONALIZE_OPTION_SET_CLASS . '" id="personalize-' . $js_id . '">';
  if (isset($variables['element']['#first_option'])) {
    $prefix .= '<noscript>' . drupal_render($variables['element']['#first_option']) . '</noscript>';
  }
  $prefix .= '<script type="text/template">';
  $suffix = '</script></div>';

  // Build array of rendered options for JSON encoding.
  $rendered = array();
  $i = 0;
  foreach($variables['element']['#personalize_options'] as $option_name => $option) {
    $rendered[$option_name] = array(
      'html' => drupal_render($option),
      'index' => $i,
    );
    $i++;
  }
  return $prefix . json_encode($rendered) . $suffix;
}

/**
 * Theme wrapper for option sets that are populated via callback.
 *
 * Provides a div to use with Ajax callback population.
 */
function theme_personalize_options_callback_wrapper($variables) {
  $option_set = $variables['element']['#personalize_option_set'];
  $js_id = _personalize_get_nonnumeric_osid($option_set->osid);
  $rendered = '<div class="' . PERSONALIZE_OPTION_SET_CLASS . '" id="personalize-' . $js_id . '"></div>';
  $rendered .= '<noscript>' . drupal_render($variables['element']['#first_option']) . '</noscript>';
  return $rendered;
}

/**
 * Theme wrapper for campaign status alert update message.
 *
 * @param $variables
 *   Associative array of information to display about the status alert.
 *   - status_message: The main status message indicating campaign status.
 *   - option_message: A message to show to introduce the winning options.
 *   - option_sets: An associative array of options sets within this campaign.
 *     - label: The label of the option set
 *     - counter: A counter for the current option set
 *     - winner_label: The label of the winning variation for the option set.
 *     - winner_type: The type of winning variation (e.g., winner, control)
 *     - alert: Additional alert to show the end user regarding change.
 */
function theme_personalize_campaign_status_update($variables) {
  $status_message = $variables['status_message'];
  $option_message = $variables['option_message'];
  $option_sets = $variables['option_sets'];

  $update_message = $status_message;
  if (!empty($option_sets)) {
    if (!empty($option_message)) {
      $update_message .= ' ' . $option_message;
    }
    $winner_defaults = array(
      'label' => 'Content variation',
      'counter' => '',
      'winner_label' => t('Variation'),
      'winner_type' => t('Control'),
      'alert' => '',
    );
    $winners = array();
    foreach($option_sets as $option) {
      $option += $winner_defaults;
      $winner_message = "<strong>{$option['label']}:</strong> {$option['counter']} {$option['winner_label']} ({$option['winner_type']})";
      if (!empty($option['alert'])) {
        $winner_message .= ' <span class="personalize-alert">' . $option['alert'] . '</span>';
      }
      $winners[] = $winner_message;
    }
    $update_message .= theme('item_list', array('items' => $winners));
  }
  return $update_message;
}

/**
 * Theme function to output a report for an Option Set.
 *
 * @param $variables
 *   An associative array of variables with a single 'report' key that
 *   holds the report.
 * @return string
 *   The themed output.
 */
function theme_personalize_option_set_report($variables) {
  if (empty($variables['report'])) {
    return '';
  }
  $output = '<div class="personalize-option-set-report">' . $variables['report'] . '</div>';
  return $output;
}

/**
 * Theme wrapper for an administrative option that displays optional
 * details beyond the base description.
 *
 * @param $variables
 *   Associative array of variables for the theme.
 *   - details: The optional details that should only be shown when requested.
 */
function theme_personalize_admin_info_details($variables) {
  if (!empty($variables['details'])) {
    return '<div class="personalize-admin-optional">' . $variables['details'] . '</div>';
  }
  return '';
}

/**
 * Implements hook_personalize_admin_section().
 */
function personalize_preprocess_personalize_admin_section(&$variables, $hook) {
  // Add general classes.
  $variables['classes_array'][] = 'clearfix';
}

/**
 * Implements hook_preprocess_personalize_content_set().
 */
function personalize_preprocess_personalize_admin_content(&$variables, $hook) {
  // Move elements to the template variables.
  $variables['title'] = $variables['element']['#title'];
  $variables['collapsible'] = $variables['element']['#collapsible'];

  // Add general classes.
  $variables['title_attributes_array']['class'][] = 'personalize-admin-content-title';
  $variables['content_attributes_array']['class'][] = 'personalize-admin-content-content';

  // Add "add" links to the title suffix.
  if (isset($variables['element']['#add_markup'])) {
    if (isset($variables['element']['#add_markup']['#prefix'])) {
      $variables['element']['#add_markup']['#prefix'] = '<span class="personalize-admin-content-add">' . $variables['element']['#add_markup']['#prefix'] . '</span>';
    }
    $variables['title_suffix']['add_markup'] = $variables['element']['#add_markup'];
  }

  // Add the variation count to the title suffix.
  if (isset($variables['element']['#variation_count'])) {
    $variables['title_suffix']['variation_count'] = $variables['element']['#variation_count'];
  }

  // Add the statistics to the title suffix.
  if (isset($variables['element']['#statistics'])) {
    $variables['title_suffix']['statistics'] = $variables['element']['#statistics'];
    $variables['title_suffix']['statistics']['#weight'] = 30;
  }

  // Add needed pieces for collapsing content.
  if ($variables['collapsible']) {
    $variables['classes_array'][] = 'personalize-collapsible';
    $variables['classes_array'][] = 'personalize-collapsed';
    $variables['title_prefix']['collapse-trigger'] = array(
      '#type' => 'link',
      '#title' => t('edit'),
      '#href' => '',
      '#attributes' => array('class' => array('personalize-collapse-edit')),
    );
  }
}

/**
 * Implements hook_preprocess_personalize_content_set_item().
 */
function personalize_preprocess_personalize_content_set_item(&$variables, $hook) {
  // Move elements to the template variables.
  $variables['title'] = $variables['element']['#title'];

  // Add general classes.
  $variables['title_attributes_array']['class'][] = 'personalize-content-set-item-title';
  $variables['content_attributes_array']['class'][] = 'personalize-content-set-item-content';
}
