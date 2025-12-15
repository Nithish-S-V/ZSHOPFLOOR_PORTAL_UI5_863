sap.ui.define([
    "sap/ui/core/util/MockServer",
    "sap/base/util/UriParameters"
], function (MockServer, UriParameters) {
    "use strict";

    return {
        init: function () {
            // Check if mock server should be started
            var oUriParameters = new UriParameters(window.location.href);
            var isMockMode = oUriParameters.get("sap-ui-xx-mockserver") === "true";

            // In Orion, we'll use mock metadata but real data
            // Create mock server
            var oMockServer = new MockServer({
                rootUri: "/sap/opu/odata/sap/ZSHOP_PORTAL_863_SRV/"
            });

            var sPath = sap.ui.require.toUrl("ZSHOPFLOOR_PORTAL_UI5_863/localService");

            // Configure mock server with local metadata but don't generate mock data
            oMockServer.simulate(sPath + "/metadata.xml", {
                sMockdataBaseUrl: sPath + "/mockdata",
                bGenerateMissingMockData: false
            });

            // Override to allow real backend calls
            var aRequests = oMockServer.getRequests();
            oMockServer.setRequests([]);

            oMockServer.start();

            console.log("Mock Server initialized - Metadata loaded locally");
        }
    };
});
