sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "ZSHOPFLOOR_PORTAL_UI5_863/model/models",
    "sap/base/Log",
    "sap/ui/model/odata/v2/ODataModel"
], function (UIComponent, Device, models, Log, ODataModel) {
    "use strict";

    return UIComponent.extend("ZSHOPFLOOR_PORTAL_UI5_863.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // Manually create OData model with local metadata
            var sServiceUrl = "/sap/opu/odata/sap/ZSHOP_PORTAL_863_SRV/";
            var sMetadataUrl = sap.ui.require.toUrl("ZSHOPFLOOR_PORTAL_UI5_863/localService/metadata.xml");

            try {
                var oModel = new ODataModel(sServiceUrl, {
                    json: false,  // ✅ Force XML format (backend's JSON is broken)
                    useBatch: false,
                    defaultBindingMode: "TwoWay",
                    defaultCountMode: "None",  // ✅ Prevent 500 errors from $inlinecount
                    headers: {
                        "Accept": "application/atom+xml",  // ✅ Request XML responses
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    metadataUrlParams: {
                        "sap-documentation": "heading"
                    },
                    loadMetadataAsync: false,
                    annotationURI: [],
                    skipMetadataAnnotationParsing: true,
                    tokenHandling: true,
                    refreshSecurityToken: true,
                    disableHeadRequestForToken: false
                });

                // Load metadata manually from local file
                var oMetadata = new XMLHttpRequest();
                oMetadata.open("GET", sMetadataUrl, false);
                oMetadata.send();

                if (oMetadata.status === 200) {
                    Log.info("Local metadata loaded successfully");
                }

                // Set the model
                this.setModel(oModel);

                // Headers are already set in model config above
                // No need for setHeaders() call

                // Attach error handlers
                oModel.attachMetadataFailed(function (oEvent) {
                    Log.warning("Metadata failed - using local fallback", oEvent.getParameters());
                });

                oModel.attachRequestFailed(function (oEvent) {
                    var oParams = oEvent.getParameters();
                    Log.error("OData request failed", oParams);
                });



            } catch (e) {
                Log.error("Error initializing OData model", e);
            }

            // enable routing
            this.getRouter().initialize();

            // set the device model
            this.setModel(models.createDeviceModel(), "device");
        }
    });
});