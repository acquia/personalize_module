<?php
/**
 * @file
 * Provides the personalize_blocks administrative interface.
 */

/**
 * Page callback to list personalize_blocks instances in the system.
 */
function personalize_blocks_list() {
  $header = array(
    array('data' => t('Block')),
    array('data' => t('Operations'), 'colspan' => 4),
  );
  $rows = array();

  foreach (personalize_option_set_load_by_type('block') as $personalized_block) {
    $tablerow = array(
      array('data' => check_plain($personalized_block->data['block_title'])),
      array('data' => l(t('Edit'), 'admin/structure/personalize-blocks/manage/'. $personalized_block->osid .'/edit')),
      array('data' => l(t('Export'), 'admin/structure/personalize-blocks/manage/'. $personalized_block->osid .'/export')),
      array('data' => l(t('Clone'), 'admin/structure/personalize-blocks/manage/'. $personalized_block->osid .'/clone')),
      array('data' => l(t('Delete'), 'admin/structure/personalize-blocks/manage/'. $personalized_block->osid .'/delete')),
    );
    $rows[] = $tablerow;
  }

  if (empty($rows)) {
    $rows[] = array(array('data' => t('No personalize_blocks instances available.'), 'colspan' => 5));
  }

  $build = array(
    '#theme' => 'table',
    '#header' => $header,
    '#rows' => $rows,
    '#attributes' => array('id' => 'personalize_blocks'),
  );
  return $build;
}

/**
 * Clone personalize_blocks.
 */
function personalize_blocks_clone($block) {
  unset($block->osid);
  $data = $block->data;
  $data['block_title'] = '';
  $block->data = $data;
  return drupal_get_form('personalize_blocks_form', 'clone', $block);
}

/**
 * Build the personalize_blocks creation and edit form.
 */
function personalize_blocks_form($form, &$form_state, $formtype, $pblock = NULL) {
  if (!isset($pblock)) {
    if (!empty($form_state['pblock'])) {
      $pblock = $form_state['pblock'];
    }
    else {
      $pblock = new stdClass;
    }
  }
  // The contents of $pblock will either come from the db or from $form_state.
  if (isset($form_state['values']['title'])) {
    $pblock = _personalize_blocks_convert_form_to_personalized_block($form_state);
  }

  if (!empty($pblock->osid)) {
    // Make sure a warning message is delivered if this is a running
    // campaign.
    personalize_warn_if_running($pblock->agent);
    $form['osid'] = array(
      '#type' => 'value',
      '#value' => $pblock->osid,
    );
    $form['agent_select'] = array(
      '#type' => 'value',
      '#value' => $pblock->agent,
    );
  }
  else {
    $current_agent = isset($pblock->agent) ? $pblock->agent : '';
    $form += personalize_get_agent_selection_form($current_agent);
  }

  $form['title'] = array(
    '#title' => t('Title'),
    '#description' => t('This will be the administrative title of the block.'),
    '#type' => 'textfield',
    '#default_value' => isset($pblock->data['block_title']) ? $pblock->data['block_title'] : '',
    '#weight' => -100,
    '#required' => TRUE,
  );

  $form['options'] = array(
    '#tree' => TRUE,
    '#theme_wrappers' => array('container'),
    '#attributes' => array('id' => 'options-replace'),
  );

  // Add a wrapper for the blocks and Add Another Tab button.
  $form['pblock_wrapper'] = array(
    '#tree' => FALSE,
    '#theme_wrappers' => array('fieldset'),
    '#title' => t('Variations'),
    '#attributes' => array('id' => 'personalize-blocks-wrapper'),
    '#weight' => -3,
  );

  $form['pblock_wrapper']['blocks'] = array(
    '#tree' => TRUE,
    '#theme_wrappers' => array('container'),
    '#attributes' => array('id' => 'personalized-block-variations'),
    '#theme' => empty($pblock->osid) ? 'personalize_blocks_admin_form_draggable_blocks' : 'personalize_blocks_admin_form_blocks',
  );

  $form['pblock_wrapper']['blocks_more'] = array(
    '#type' => 'submit',
    '#value' => t('Add another'),
    '#attributes' => array('class' => array('personalize-blocks-add-block'), 'title' => t('Click here to add more blocks.')),
    '#weight' => 1,
    '#submit' => array('personalize_blocks_more_blocks_submit'),
    '#ajax' => array(
      'callback' => 'personalize_blocks_ajax_callback',
      'wrapper' => 'personalized-block-variations',
      'effect' => 'fade',
    ),
    '#limit_validation_errors' => array(),
  );

  // If creating a new personalize_blocks instance, start off with 2 empty blocks.
  if (empty($pblock->options)) {
    $pblock->options = array(
      0 => array('option_label' => personalize_generate_option_label(0)),
      1 => array('option_label' => personalize_generate_option_label(1)),
    );
    if (isset($_GET['original_block'])) {
      // Use the original block as the first option in our new
      // option set.
      $query = db_select('block', 'b')
        ->fields('b', array('module', 'delta'))
        ->condition('bid', $_GET['original_block']);
      $result = $query->execute()->fetchAssoc();
      $pblock->options[0]['bid'] = $result['module'] . '_delta_' . $result['delta'];
    }
  }

  // If the "Add another" button was clicked, we need to increment the number of
  // blocks by one.
  $num_blocks = count($pblock->options);
  if (isset($form_state['num_blocks']) && $form_state['num_blocks'] > $num_blocks) {
    $pblock->options[] = array('option_label' => personalize_generate_option_label($num_blocks));
  }
  $form_state['num_blocks'] = count($pblock->options);
  // Keep track of block options throughout Ajax submits.
  $form_state['pblock'] =  $pblock;

  // If the "Remove" button was clicked for a block, we need to remove that block
  // from the form.
  if (isset($form_state['to_remove'])) {
    unset($pblock->options[$form_state['to_remove']]);
    unset($form_state['to_remove']);
    $form_state['num_blocks']--;
  }

  // Add current tabs to the form.
  foreach ($pblock->options as $delta => $block) {
    $block['delta'] = $delta;
    $form['pblock_wrapper']['blocks'][$delta] = _personalize_blocks_form($block, $pblock);
  }
  // If there's only one block, it shouldn't be removeable.
  if (count($pblock->options) == 1) {
    $form['pblock_wrapper']['blocks'][$delta]['remove']['#access'] = FALSE;
  }

  $form['original_block'] = array(
    '#type' => 'value',
    '#value' => isset($_GET['original_block']) ? $_GET['original_block'] : NULL,
  );

  $form['actions'] = array('#type' => 'actions');
  $form['actions']['submit_form'] = array(
    '#type' => 'submit',
    '#value' => t('Save'),
  );
  return $form;
}

/*
 * Build one row (one block) on the personalized_blocks admin form.
 *
 * @param array $block
 *  An array containing the details of this particular block.
 *
 * @param object $pblock
 *  An object representing the personalize_blocks instance that the blocks are
 *  being built for.
 */
function _personalize_blocks_form(array $block, $pblock) {
  $form['#tree'] = TRUE;
  $delta = $block['delta'];

  $form['option_label'] = array(
    '#type' => 'textfield',
    '#size' => '10',
    '#default_value' => isset($block['option_label']) ? $block['option_label'] : '',
  );
  if (isset($block['option_id'])) {
    $form['option_id'] = array(
      '#type' => 'value',
      '#value' => $block['option_id'],
    );
  }

  $form['weight'] = array(
    '#type' => 'weight',
    '#default_value' => isset($block['weight']) ? $block['weight'] : $delta-100,
    '#delta' => 100,
  );
  $default = '';
  if (isset($block['bid'])) {
    $default = $block['bid'];
  }
  elseif (isset($_GET['personalize_blocks_new_block'])) {
    $default = 'block_delta_' . $_GET['personalize_blocks_new_block'];
    unset($_GET['personalize_blocks_new_block']);
  }
  // @see personalize_blocks_drupal_goto_alter().
  $query = drupal_get_query_parameters();
  $query['personalize_add_block'] = 1;

  // Use hardcoded urls instead of just current path to avoid
  // invalid destination url after form ajax replacing of table items
  $destination_url = isset($pblock->osid) ? 'admin/structure/personalize-blocks/manage/' . $pblock->osid . '/edit' :
    'admin/structure/personalize-blocks/add';

  $link_options['query'] = array(
    'destination' => $destination_url . '?' . drupal_http_build_query($query)
  );

  $form['bid'] = array(
    '#type' => 'select',
    '#options' => array('' => t('Select a block...')) + personalize_blocks_get_blocks(),
    '#default_value' => $default,
    '#title' => t('Select a block'),
    '#title_display' => 'invisible',
    '#suffix' => t('Or !addnewblock', array('!addnewblock' => l(t('add a new one'), 'admin/structure/block/add', $link_options))),
  );

  $form['remove'] = array(
    '#type' => 'submit',
    '#tag' => 'button',
    '#text' => t('Remove'),
    '#value' => 'remove_' . $delta,
    '#theme_wrappers' => array('personalize_html_tag'),
    '#attributes' => array(
      // The ID is necessary for the AJAX replace to function correctly. It
      // is fragile to declare it like this, essentially hard-coding the
      // #parents, but I know of no other way to do this programmatically.
      'id' => 'edit-blocks-' . $delta . '-remove',
      'class' => array('personalize-blocks-delete-block', 'form-submit',),
      'title' => t('Remove the block.'),
    ),

    '#submit' => array('personalize_blocks_remove_block_submit'),
    '#ajax' => array(
      'callback' => 'personalize_blocks_ajax_callback',
      'wrapper' => 'personalized-block-variations',
      'method' => 'replace',
      'effect' => 'fade',
    ),
    '#limit_validation_errors' => array(),
  );

  return $form;
}

/**
 * Theme function for personalize_blocks edit page.
 * Theme the form elements for the blocks as table rows.
 *
 * @ingroup themeable
 */
function theme_personalize_blocks_admin_form_blocks($variables) {
  $blocks = $variables['blocks'];
  $draggable = isset($blocks['#draggable']) && $blocks['#draggable'];
  $rows = array();
  $header = array(
    t('Option'),
  );
  if ($draggable) {
    drupal_add_tabledrag('personalize-blocks-table', 'order', 'sibling', 'personalized-blocks-weight');
    $header[] = t('Weight');
  }
  $header = array_merge($header, array(
    t('Block'),
    t('Operations'),
  ));
  foreach (element_children($blocks) as $key) {
    $block = &$blocks[$key];
    if ($draggable) {
      $block['weight']['#attributes']['class'] = array('personalized-blocks-weight');
    }

    // tab settings fields
    $fields = array(
      array('data' => drupal_render($block['option_label']), 'class' => array('personalized-block-option-name')),
    );

    if ($draggable) {
      $fields[] = array('data' => drupal_render($block['weight']), 'class' => array('personalized-blocks-weight'));
    }
    $fields = array_merge($fields, array(
      array('data' => drupal_render($block['bid']), 'class' => array('personalized-block-block')),
      array('data' => drupal_render($block['remove']), 'class' => array('personalize-block-remove'))
    ));

    // Build the table row.
    $row = array(
      'data' => $fields,
      'class' => $draggable ? array('draggable') : array(),
    );

    // Add additional attributes to the row, such as a class for this row.
    if (isset($block['#attributes'])) {
      $row = array_merge($row, $block['#attributes']);
    }
    $rows[] = $row;
  }

  $build['personalized_block'] = array(
    '#theme' => 'table',
    '#sticky' => FALSE,
    '#header' => $header,
    '#rows' => $rows,
    '#attributes' => array('id' => 'personalize-blocks-table'),
    '#weight' => -1,
  );

  $output = drupal_render($build);
  return $output;
}

/**
 * Theme function for personalize_blocks add page.
 * Theme the form elements for the blocks as draggable table rows.
 *
 * @ingroup themeable
 */
function theme_personalize_blocks_admin_form_draggable_blocks($variables) {
  $variables['blocks']['#draggable'] = 1;
  return theme('personalize_blocks_admin_form_blocks', $variables);
}

/**
 * Ajax callback for the add tab and remove tab buttons.
 */
function personalize_blocks_ajax_callback($form, $form_state) {
  return $form['pblock_wrapper']['blocks'];
}

/**
 * Submit handler for the "Add Tab" button.
 */
function personalize_blocks_more_blocks_submit($form, &$form_state) {
  // Increment the number of blocks to be rendered.
  $form_state['num_blocks']++;
  $form_state['rebuild'] = TRUE;
}

/**
 * Submit handler for the "Remove Tab" button.
 */
function personalize_blocks_remove_block_submit($form, &$form_state) {
  // Get the tab delta for the clicked button.
  $delta = $form_state['clicked_button']['#parents'][1];
  $form_state['to_remove'] = $delta;
  $form_state['rebuild'] = TRUE;
}

/**
 * Validation handler for personalize_blocks admin page.
 */
function personalize_blocks_form_validate($form, &$form_state) {
  $valid = FALSE;
  if (isset($form_state['values']['blocks'])) {
    $num_blocks = 0;
    foreach ($form_state['values']['blocks'] as $j => $block) {
      if (empty($block['option_label'])) {
        form_set_error('blocks][' . $j . '][option_label', t('A label is required for each block option.'));
      }
      if (!empty($block['bid'])) {
        $num_blocks++;
      }
    }
    $valid = $num_blocks > 1;
  }
  if (!$valid) {
    form_set_error('', t('You must add at least 2 blocks to your personalized block'));
  }

  if ($form_state['values']['agent_select'] == '__new__') {
    $agent_title = trim($form_state['values']['agent_basic_info']['title']);

    if (empty($agent_title)) {
      form_error($form['personalize']['agent_basic_info']['title'], t('Campaign name is required'));
    }
  }
}

/**
 * Submit handler for personalize_blocks admin page.
 */
function personalize_blocks_form_submit($form, &$form_state) {
  if ($form_state['clicked_button']['#id'] == 'edit-submit-form') {
    $pblock = _personalize_blocks_convert_form_to_personalized_block($form_state);
    if ($form_state['values']['agent_select'] == PERSONALIZE_NEW_AGENT_FORM_VALUE) {
      if ($new_agent = personalize_save_agent_from_form_values($form_state['values'])) {
        $pblock->agent = $new_agent->machine_name;
      }
      else {
        drupal_set_message('There was a problem saving the new campaign', 'error');
        return;
      }
    }
    personalize_option_set_save($pblock);
    if ($form_state['values']['original_block']) {
      personalize_blocks_replace_existing($form_state['values']['original_block'], $pblock);
    }
    else {
      drupal_goto('admin/structure/personalize-blocks');
    }
  }
}

/**
 * Deletion of personalized_block block.
 */
function personalize_blocks_block_delete($form, $form_state, $pblock) {
  $form['osid'] = array('#type' => 'hidden', '#value' => $pblock->osid);
  $form['title'] = array('#type' => 'hidden', '#value' => $pblock->data['block_title']);
  return confirm_form($form, t('Are you sure you want to delete the personalized_block block %title?', array('%title' => $pblock->data['block_title'])), 'admin/structure/personalize-blocks', '', t('Delete'), t('Cancel'));
}

/**
 * Submit handler for personalized_block block deletion.
 */
function personalize_blocks_block_delete_submit($form, &$form_state) {
  personalize_option_set_delete($form_state['values']['osid']);
  drupal_set_message(t('The personalize_blocks instance %name has been removed.', array('%name' => $form_state['values']['title'])));
  cache_clear_all();
  $form_state['redirect'] = 'admin/structure/personalize-blocks';
}


/**
 * Helper function to get all blocks.
 */
function personalize_blocks_get_blocks() {
  $blocksarray = &drupal_static(__FUNCTION__, array());
  if (empty($blocksarray)) {
    $blocks = _block_rehash();
    $blocksarray = array();
    foreach ($blocks as $block) {
      if ($block['module'] != 'personalize_blocks') {
        $key = $block['module'] . '_delta_' . $block['delta'];
        $blocksarray[$key] = $block['info'] . ' (' . $block['module'] . ':' . $block['delta'] . ')';
      }
    }
  }
  return $blocksarray;
}

/**
 * Helper function to convert the data on admin form into personalized_block presentation.
 */
function _personalize_blocks_convert_form_to_personalized_block($form_state) {
  $formvalues_blocks = array();
  if (!empty($form_state['values']['blocks'])) {
    foreach ($form_state['values']['blocks'] as $i => $block) {
      $formvalues_blocks[$i] = $block;
      $weight[$i] = $block['weight'];
    }
    array_multisort($weight, SORT_ASC, $formvalues_blocks);
  }
  $options = array();
  foreach ($formvalues_blocks as $block) {
    if (empty($block['bid'])) {
      continue;
    }
    $options[] = array_intersect_key($block, array('option_id' => '', 'option_label' => '', 'bid' => ''));
  }
  $pblock = new stdClass();
  $pblock->plugin = 'block';
  $pblock->agent = $form_state['values']['agent_select'];
  $pblock->label = $form_state['values']['title'];
  $pblock->data = array('block_title' => $form_state['values']['title']);
  $pblock->options = $options;

  if (isset($form_state['values']['osid'])) {
    $pblock->osid = $form_state['values']['osid'];
  }

  return $pblock;
}
