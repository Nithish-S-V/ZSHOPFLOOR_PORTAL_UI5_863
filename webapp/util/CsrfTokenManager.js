sap.ui.define([
    "sap/base/Log"
], function (Log) {
    "use strict";

    return {
        _csrfToken: null,
        _sessionCookie: null,

        /**
         * Fetch CSRF token from SAP OData service
         * @returns {Promise} Promise that resolves with token and cookie
         */
        fetchToken: function () {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                // Revert to known working URL
                var url = "/sap/opu/odata/sap/ZSHOP_PORTAL_863_SRV/?$format=xml";

                xhr.open("GET", url, true);
                // Prevent caching
                xhr.setRequestHeader("Cache-Control", "no-cache");
                xhr.setRequestHeader("Pragma", "no-cache");
                xhr.withCredentials = true; // IMPORTANT: Allow cookies to be stored
                xhr.setRequestHeader("X-CSRF-Token", "Fetch"); // SAP requires capital "Fetch"
                xhr.setRequestHeader("Accept", "application/xml");

                xhr.onload = function () {
                    if (xhr.status === 200) {
                        // Get CSRF token from response headers
                        var token = xhr.getResponseHeader("X-CSRF-Token");

                        // Note: Browsers handle Set-Cookie automatically. We don't need to read it.

                        if (token) {
                            this._csrfToken = token;
                            Log.info("CSRF Token fetched successfully");
                            resolve({
                                token: token
                            });
                        } else {
                            Log.error("No CSRF token in response headers");
                            reject(new Error("No CSRF token received"));
                        }
                    } else {
                        Log.error("Failed to fetch CSRF token. Status: " + xhr.status);
                        reject(new Error("Token fetch failed with status: " + xhr.status));
                    }
                }.bind(this);

                xhr.onerror = function () {
                    Log.error("Network error while fetching CSRF token");
                    reject(new Error("Network error"));
                };

                xhr.send();
            }.bind(this));
        },

        /**
         * Get current CSRF token, fetch new one if not available
         * @returns {Promise} Promise that resolves with token
         */
        getToken: function () {
            if (this._csrfToken) {
                return Promise.resolve(this._csrfToken);
            }
            return this.fetchToken().then(function (result) {
                return result.token;
            });
        },

        /**
         * Clear stored token (e.g., after logout or token expiry)
         */
        clearToken: function () {
            this._csrfToken = null;
            this._sessionCookie = null;
            Log.info("CSRF token cleared");
        }
    };
});
