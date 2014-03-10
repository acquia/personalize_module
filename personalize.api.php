<?php

/**
 * CTools plugin hook for defining an agent type.
 *
 * All agent type plugins must specify a class that implements
 * PersonalizeAgentInterface. If the agent type supports explicit
 * targeting (allowing the mapping of visitor contexts to specific
 * options in an option set, e.g. "Users from Canada should always
 * see option C") then the class should implement the
 * PersonalizeExplicitTargetingInterface. There is a PersonalizeAgentBase
 * which it usually makes sense to extend.
 *
 * In addition to providing this class, all modules providing agent types
 * are expected to implement hook_personalize_campaign_report(), which will
 * be called from the 'reports' page of any agent of a type provided by the
 * module.
 *
 * @see modules/personalize_target/plugins/agent_types/PersonalizeTarget.inc
 * @see hook_personalize_campaign_report().
 */
function hook_personalize_agent_type() {
  $info = array();
  $path = drupal_get_path('module', 'my_module') . '/plugins/agent_types';
  $info['my_agent_type'] = array(
    'path' => $path,
    'handler' => array(
      'file' => 'MyAgentType.inc',
      'class' => 'MyAgentType',
    ),
  );
  return $info;
}

/**
 * CTools plugin hook for defining an Option Set type.
 *
 * An Option Set type plugin provides a mechanism for personalizing
 * a particiular type of thing in Drupal, e.g. a block in the case of
 * the plugin provided by personalize_blocks module. The plugin does
 * not need to provide a class, rather it is expected to act on whatever
 * type of Drupal content it is concerned with personalizing. This will
 * mean calling the personalize_element_with_option_set() function at
 * the time of rendering that content, and it will usually mean adding
 * personalize_options_wrapper as a theme wrapper on the element being
 * rendered. Finally, all modules providing Option Set type plugins are
 * expected to implement hook_personalize_create_new_links() and
 * hook_personalize_option_values_for_admin().
 *
 * @see hook_personalize_create_new_links()
 * @see hook_personalize_option_values_for_admin()
 * @see modules/personalize_blocks.module
 */
function hook_personalize_option_set_type() {
  return array(
    'my_type' => array()
  );
}

/**
 * An agent is about to be created or updated.
 *
 * This hook is invoked before the agent is saved to the database so
 * modules can alter the information that is saved.
 *
 * @param stdClass $agent
 *   A stdClass object representing the agent being saved.
 */
function hook_personalize_agent_presave($agent) {

}

/**
 * Respond to agent being saved.
 *
 * This hook is invoked after an agent has been saved to the database.
 *
 * @param stdClass $agent
 *   A stdClass object representing the agent that has just been saved.
 */
function hook_personalize_agent_save($agent) {

}

/**
 * Respond to an agent's status change.
 *
 * This hook is invoked after an agent's status has changed, e.g. from
 * 'paused' to 'running'.
 *
 * @param $agent_name
 *   The name of the agent whose status has just been updated.
 * @param $old_status
 *   The status of the agent before the change.
 * @param $new_status
 *   The status of the agent after the change
 */
function hook_personalize_agent_update_status($agent_name, $old_status, $new_status) {

}

/**
 * Respond to agent being deleted.
 *
 * This hook is invoked after the agent has been deleted from the db.
 *
 * @param stdClass $agent
 *   A stdClass object representing the agent that has been deleted.
 */
function hook_personalize_agent_delete($agent) {

}

/**
 * An Option Set is about to be created or updated.
 *
 * This hook is invoked before the Option Set is saved to the database
 * so modules can alter the information that is saved.
 *
 * @param stdClass $option_set
 *   A stdClass object representing the Option Set being saved.
 */
function hook_personalize_option_set_presave($option_set) {

}

/**
 * Add additional data to a loaded option set.
 *
 * @see e.g. personalize_fields_option_set_load().
 */
function hook_personalize_option_set_load($option_set) {

}

/**
 * Respond to Option Set being saved.
 *
 * This hook is invoked after an Option Set has been saved to the db.
 *
 * @param stdClass $option_set
 *   A stdClass object representing the Option Set that's just been saved.
 */
function hook_personalize_option_set_save($option_set) {

}

/**
 * Respond to an Option Set  being deleted.
 *
 * This hook is invoked after the Option Set is deleted from the database.
 *
 * @param stdClass $option_set
 *   A stdClass object representing the Option Set that's been deleted.
 */
function hook_personalize_option_set_delete($option_set) {

}

/**
 * Respond to an MVT being deleted.
 *
 * This hook is invoked after an MVT has been deleted from the db.
 *
 * @param $mvt
 *   A fully loaded MVT object representing a multivariate test
 *   that has just been deleted from the DB. The Option Sets
 *   associated wtih the MVT, though still part of this object,
 *   will have already been disassociated from the deleted MVT.
 */
function hook_personalize_mvt_delete($mvt) {

}

/**
 * Respond to a goal being created or updated.
 *
 * This goal is invoked after a goal has been saved to the db.
 *
 * @param array $goal_array
 *   An associative array representing the goal, with the following
 *   keys:
 *   - agent The name of the agent the goal was saved for.
 *   - name The name of the action used by the goal.
 *   - value The value of the goal.
 */
function hook_personalize_goal_save($goal_array) {

}

/**
 * Respond to ajax submission of agent-related changes.
 *
 * This hook is invoked at the end of the ajax callback when any of
 * the forms on the campaign edit page are submitted.
 *
 * @param stdClass $agent
 *   A stdClass object representing the agent being updated.
 */
function hook_personalize_form_ajax_submit($agent_data) {

}

/**
 * Returns links for the "create new personalized content" dropdown.
 *
 * This hook is typically implemented by modules that provide an
 * Option Set type, and returns an array of link information for
 * getting to the place where Option Sets of this type can be created.
 * For example, personalize_fields module provides links to create
 * new nodes of any types that contain at least one personalizable
 * field.
 *
 * @return array
 *   An array  of associative arrays, each representing a link, with
 *   the following keys:
 *   - title The clickable text for the link.
 *   - path The path to go to in order to create this type of
 *     personalized thing.
 *
 * @see personalize_fields_personalize_create_new_links().
 */
function hook_personalize_create_new_links() {
  return array(
    array(
      'title' => 'Personalized widget',
      'path' => 'admin/my-module/add/new/widget'
    )
  );
}

/**
 * Returns option values to show in the admin UI.
 *
 * This hook must be implemented by modules providing Option Set type
 * plugins. Its purpose is to return something meaningful to display
 * for each option in the campaign edit UI so that it is clear what the
 * actual content of each option is, short of rendering that content.
 * For example, the 'block' Option Set plugin returns the block title,
 * if one has been set.
 */
function hook_personalize_option_values_for_admin() {

}

/**
 * Returns the available executor options to show in the admin UI.
 *
 * This hook should be implemented whenever the site administrator is allowed
 * to specify the executor to use for a particular option set.  It should return
 * a form element to be rendered within the campaign edit form that defines
 * the possible values for the executor.
 *
 * @param stdClass $option_set
 *   A stdClass object representing the loaded option set.
 *
 * @return array
 *   The form element to include within the campaign edit UI.
 */
function hook_personalize_executors_for_admin($option_set) {

}

/**
 * Returns a render array or themed output for a report on the specified agent.
 *
 * This hook will be invoked on the module responsible for the agent type of
 * the agent in question.
 *
 * @param stdClass $agent_data
 *   A stdClass object representing the loaded agent.
 *
 * @return string|array
 *   Either a string of themed output or an array that can be passed to drupal_render.
 */
function hook_personalize_campaign_report($agent_data) {

}
