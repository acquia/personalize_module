(function ($, Drupal) {

  Drupal.personalizeDebug = (function() {

    var debuggedMessages = [];

    return {
      'log': function(message, type) {
        if (debuggedMessages.indexOf(message) == -1) {
          console.log(type.toUpperCase() + ': ' + message);
          debuggedMessages.push(message);
        }
      }
    };
  })();

})(Drupal.jQuery, Drupal);
