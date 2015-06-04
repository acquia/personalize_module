(function (Drupal) {
  Drupal.personalizeStorage = (function() {

    var personalizeStorageKey = 'personalize::storage::keys';

     /**
     * Determine if the current browser supports web storage.
     */
    function _supportsLocalStorage() {
      if (this.supportsHtmlLocalStorage != undefined) {
        return this.supportsHtmlLocalStorage;
      }
      try {
        this.supportsHtmlLocalStorage = 'localStorage' in window && window['localStorage'] !== null;
      } catch (e) {
        this.supportsHtmlLocalStorage = false;
      }
      return this.supportsHtmlLocalStorage;
    }

    /**
     * Determine the kind of storage to use based on session type requested.
     *
     * @param session
     *   True if session storage, false if local storage.  Defaults true.
     */
    function _getStore(session) {
      session = typeof(session) == 'undefined';
      return session ? sessionStorage : localStorage;
    }

    /**
     * Gets the listing of keys and the order in which they were added.
     *
     * @param key
     *   The key of the item saved to storage
     * @param session
     *   True if session storage, false if local storage.  Defaults true.
     */
    function _getTrackedKeys(session) {
      var store = _getStore(session);
      var keys = store.getItem(personalizeStorageKey);
      if (keys) {
        keys = JSON.parse(keys);
      } else {
        keys = [];
      }
      return keys;
    }

    /**
     * Update the listing of keys and the order in which they were added.
     *
     * @param key
     *   The key of the item saved to storage
     * @param session
     *   True if session storage, false if local storage.  Defaults true.
     */
    function _trackKey(key, session) {
      var store = _getStore(session);
      var keys = _getTrackedKeys(session);
      keys.push(key);
      store.setItem(personalizeStorageKey, JSON.stringify(keys));
    }

    /**
     * Prunes the oldest key(s) from storage.
     *
     * @param session
     *   True if session storage, false if local storage.  Defaults true.
     * @param numEntries
     *   The number of entries to remove.  Default = 10.
     */
    function _pruneOldest(session, numEntries) {
      numEntries = numEntries || 10;
      var keys = _getTrackedKeys(session);
      var totalKeys = keys.length;
      var until = totalKeys > numEntries ? totalKeys - numEntries : 0;

      for (var i=totalKeys; i>=until; i--) {
        key = keys.pop();
        this.removeItem(key, session);
      }
    }

    return {
      /**
       * Determine if the current browser supports web storage.
       */
      'supportsLocalStorage': function() {
        return _supportsLocalStorage();
      },

      /**
       * Reads an item from storage.
       *
       * @param key
       *   The bucket-specific key to use to lookup the item.
       * @param session
       *   True if session storage, false if local storage.  Defaults true.
       * @return
       *   The value set for the key or null if not available.
       */
      read: function (key, session) {
        var store, stored, record;
        if (!_supportsLocalStorage()) { return null; }

        store = _getStore(session);
        stored = store.getItem(key);
        if (stored) {
          record = JSON.parse(stored);
          if (typeof record.val !== 'undefined') {
            return record.val;
          }
        }
        return null;
      },

      /**
       * Writes an item to the bucket.
       *
       * @param key
       *   The bucket-specific key to use to store the item.
       * @param value
       *   The value to store (in any format that JSON.stringify can handle).
       * @param session
       *   True if session storage, false if local storage.  Defaults true.
       */
      write: function (key, value, session) {
        var store;

        if (!_supportsLocalStorage()) { return; }

        store = _getStore(session);
        // Fix for iPad issue - sometimes throws QUOTA_EXCEEDED_ERR on setItem.
        store.removeItem(key);
        try {
          store.setItem(key, JSON.stringify(value));
          _trackKey(key, session);
        } catch (e) {
          if (e.name === 'QUOTA_EXCEEDED_ERR' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            // Prune off the oldest entries and try again.
            _pruneOldest(session);
            this.write(key, value, session);
          }
        }
      },

      /**
       * Removes an item from a bucket.
       *
       * @param key
       *   The bucket-specific key to use to remove the item.
       * @param session
       *   True if session storage, false if local storage.  Defaults true.
       */
      removeItem: function (key, session) {
        var store;

        if (!_supportsHtmlLocalStorage()) { return; }
        store = _getStore(session);
        store.removeItem(key);
      }

    };
  })();

})(Drupal);
