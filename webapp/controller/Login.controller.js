sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/base/Log",
    "ZSHOPFLOOR_PORTAL_UI5_863/util/CsrfTokenManager"
], function (Controller, MessageToast, MessageBox, Log, CsrfTokenManager) {
    "use strict";

    return Controller.extend("ZSHOPFLOOR_PORTAL_UI5_863.controller.Login", {

        onInit: function () {
            // Initial setup if needed
        },

        onLoginPress: function () {
            var oView = this.getView();
            var oRouter = this.getOwnerComponent().getRouter();
            var oModel = this.getOwnerComponent().getModel();

            // Get UI elements
            var oErrorStrip = oView.byId("errorMessageStrip");
            var oBusyIndicator = oView.byId("loginBusyIndicator");
            var oLoginButton = oView.byId("loginButton");

            // Hide error message
            oErrorStrip.setVisible(false);

            // Check if model is loaded
            if (!oModel) {
                oErrorStrip.setText("Service connection error. Please try again.");
                oErrorStrip.setVisible(true);
                Log.error("OData model is not loaded");
                return;
            }

            // Get input values
            var sUsername = oView.byId("usernameInput").getValue().trim();
            var sPassword = oView.byId("passwordInput").getValue();

            // Validation
            if (!sUsername || !sPassword) {
                oErrorStrip.setText(this.getResourceBundle().getText("emptyCredentials"));
                oErrorStrip.setVisible(true);
                return;
            }

            // Show loading state
            oBusyIndicator.setVisible(true);
            oLoginButton.setEnabled(false);

            // Show loading state
            oBusyIndicator.setVisible(true);
            oLoginButton.setEnabled(false);

            // Simple Direct POST using XML format (backend's JSON is broken)
            var xhr = new XMLHttpRequest();
            var url = "/sap/opu/odata/sap/ZSHOP_PORTAL_863_SRV/LoginSet";

            xhr.open("POST", url, true);
            xhr.withCredentials = true;

            // Set XML headers instead of JSON
            xhr.setRequestHeader("Content-Type", "application/atom+xml");
            xhr.setRequestHeader("Accept", "application/atom+xml");
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

            // Create XML payload for OData POST
            var payload = '<?xml version="1.0" encoding="utf-8"?>' +
                '<entry xmlns="http://www.w3.org/2005/Atom" ' +
                'xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" ' +
                'xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">' +
                '<content type="application/xml">' +
                '<m:properties>' +
                '<d:Userid>' + sUsername + '</d:Userid>' +
                '<d:Password>' + sPassword + '</d:Password>' +
                '</m:properties>' +
                '</content>' +
                '</entry>';

            xhr.onload = function () {
                oBusyIndicator.setVisible(false);
                oLoginButton.setEnabled(true);

                if (xhr.status === 200 || xhr.status === 201) {
                    try {
                        // Parse XML response
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(xhr.responseText, "text/xml");

                        // Extract Userid from XML response
                        var useridElement = xmlDoc.getElementsByTagNameNS(
                            "http://schemas.microsoft.com/ado/2007/08/dataservices",
                            "Userid"
                        )[0];

                        var userId = useridElement ? useridElement.textContent : sUsername;

                        // Store user session data
                        var oUserModel = new sap.ui.model.json.JSONModel({
                            userId: userId,
                            isAuthenticated: true,
                            loginTime: new Date()
                        });
                        this.getOwnerComponent().setModel(oUserModel, "userSession");

                        MessageToast.show(this.getResourceBundle().getText("loginSuccess"));
                        oRouter.navTo("dashboard");

                    } catch (e) {
                        Log.error("Login response parsing error", e);
                        oErrorStrip.setText("Login succeeded but response was invalid.");
                        oErrorStrip.setVisible(true);
                    }
                } else {
                    Log.error("Login Failed: " + xhr.status);

                    var sErrorMessage = this.getResourceBundle().getText("invalidCredentials");
                    // Try to read error from server
                    if (xhr.responseText) {
                        try {
                            if (xhr.responseText.trim().startsWith("{")) {
                                var oError = JSON.parse(xhr.responseText);
                                if (oError.error && oError.error.message) {
                                    sErrorMessage = oError.error.message.value || sErrorMessage;
                                }
                            } else {
                                sErrorMessage = xhr.responseText;
                            }
                        } catch (e) {
                            // ignore parse error
                        }
                    }
                    oErrorStrip.setText(sErrorMessage);
                    oErrorStrip.setVisible(true);
                }
            }.bind(this);

            xhr.onerror = function () {
                oBusyIndicator.setVisible(false);
                oLoginButton.setEnabled(true);
                oErrorStrip.setText("Network connection failed.");
                oErrorStrip.setVisible(true);
            };

            xhr.send(payload);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});