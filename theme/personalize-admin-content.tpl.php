<?php

/**
 * @file
 * Default theme implementation to display a personalize content set.
 *
 * Available variables:
 * - $title: the optional title for the set.
 * - $title_prefix (array): An array containing additional output populated by
 *   modules, intended to be displayed in front of the main title tag that
 *   appears in the template.
 * - $title_suffix (array): An array containing additional output populated by
 *   modules, intended to be displayed after the main title tag that appears in
 *   the template.
 *
 * Other variables:
 * - $element (array): The full element array.
 * - $classes: A string of classes to be applied to the outer container.
 * - $attributes: A string of attributes to be applied to the outer container.
 * - $title_attributes: A string of attributes to be applied to the title
 *   container.
 * - $content_attributes: A string of attributes to be applied to the content
 *   container.
 * - $collapsed_content: Content to be shown when the element is collapsed.
 *
 * Status variables:
 * - $collapsible: Signifies if a content set is collapsible.
 *
 * @see template_preprocess()
 * @see template_preprocess_personalize_content_set()
 * @see template_process()
 *
 * @ingroup themeable
 */
?>
<div class="<?php print $classes; ?>"<?php print $attributes; ?>>
  <?php print render($title_prefix); ?>
  <?php if (!empty($title)): ?>
    <h2<?php print $title_attributes; ?>><?php print $title; ?></h2>
  <?php endif; ?>
  <?php print render($title_suffix); ?>
  <?php if (isset($collapsed_content) && !empty($collapsed_content)) : ?>
    <div class="personalize-admin-content-collapsed"><?php print $collapsed_content; ?></div>
  <?php endif; ?>

  <div<?php print $content_attributes; ?>>
    <?php print $element['#children']; ?>
  </div>
</div>
