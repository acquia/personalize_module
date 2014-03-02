<?php
/**
 * @file
 * Provides an extra test agent type for testing with multiple agent types.
 */

class PersonalizeTestExtraAgent extends PersonalizeAgentBase implements PersonalizeExplicitTargetingInterface {

  public $goals_received = array();

  /**
   * Implements PersonalizeAgentInterface::create().
   */
  public static function create($agent_data) {
    return new self($agent_data->machine_name, $agent_data->label, $agent_data->data, $agent_data->status);
  }

  /**
   * Implements PersonalizeAgentInterface::getType().
   */
  public function getType()
  {
    return 'test_extra_agent';
  }

  /**
   * Implements PersonalizeAgentInterface::useClientSideGoalDelivery().
   */
  public function useClientSideGoalDelivery()
  {
    return FALSE;
  }


  /**
   * Implements PersonalizeAgentInterface::sendGoal().
   */
  public function sendGoal($goal_name, $value = NULL) {
    // Just print info to the screen.
    print sprintf("The %s goal with value %d was received by the %s agent", $goal_name, $value, $this->getMachineName());
  }

  /**
   * Implements PersonalizeExplicitTargetingInterface::explicitTargetingSupportMultiple().
   */
  public static function explicitTargetingSupportMultiple() {
    return PersonalizeExplicitTargetingInterface::EXPLICIT_TARGETING_MULTIPLE_BOTH;
  }

  public function verify() {
    return FALSE;
  }
}
