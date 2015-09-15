'use strict';

(function (Drupal) {

  Drupal.personalizeStorage = (function() {

    var personalizeStorageKey = 'personalize::storage::keys';

    /**
     * Determine the kind of storage to use based on session type requested.
     *
     * @param session
     *   True if session storage, false if local storage.  Defaults true.
     */
    function _getStore(session) {
      session = session === undefined ? true : session;
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
      var key, i;

      for (i = totalKeys; i >= until; i--) {
        key = keys.pop();
        this.removeItem(key, session);
      }
    }

    return {
      /**
       * Determine if the current browser supports web storage.
       * @return
       *   True if the current browser supports local storage, false otherwise.
       */
      supportsLocalStorage: function() {
        if (this.supportsHtmlLocalStorage !== undefined) {
          return this.supportsHtmlLocalStorage;
        }
        try {
          this.supportsHtmlLocalStorage = window.hasOwnProperty('localStorage') && window.localStorage !== null;
        } catch (e) {
          this.supportsHtmlLocalStorage = false;
        }
        return this.supportsHtmlLocalStorage;
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
        if (!this.supportsLocalStorage()) { return null; }

        var store = _getStore(session),
            stored = store.getItem(key),
            record;
        if (stored) {
          record = JSON.parse(stored);
          if (record.val !== undefined) {
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
        if (!this.supportsLocalStorage()) { return; }

        var store = _getStore(session);
        // Fix for iPad issue - sometimes throws QUOTA_EXCEEDED_ERR on setItem.
        store.removeItem(key);
        try {
          store.setItem(key, JSON.stringify(value));
          _trackKey(key, session);
        } catch (e) {
          if (e.name === 'QUOTA_EXCEEDED_ERR' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            // Prune off the oldest entries and try again.
            _pruneOldest(session);
            try {
              store.setItem(key, JSON.stringify(value));
              _trackKey(key, session);
            } catch (e2) {
              console.error('Failed to write to storage, unhandled exception: ', e2);
            }
            return;
          }
          console.error('Failed to write to storage, unhandled exception: ', e);
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
        if (!this.supportsLocalStorage()) { return; }

        var store = _getStore(session);
        store.removeItem(key);
      },

      /**
       * Clears all items key containing prefix in storage
       *
       * @param prefix
       *    The bucket-specific key to use to remove the item.
       * @param session
       *    True if session storage, false if local storage. Defaults true.
       */
      clearStorage: function(prefix, session){
        if (!this.supportsLocalStorage()) { return; }

        var store = _getStore(session),
            i = store.length,
            key;
        while(i--) {
          key = store.key(i);
          if(key.indexOf(prefix) === 0) {
            store.removeItem(key);
          }
        }
        store.removeItem(personalizeStorageKey);
      }

    };
  })();

})(Drupal);
