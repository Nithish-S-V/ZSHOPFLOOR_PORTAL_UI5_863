sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ui/model/Filter",             // Added Filter module
    "sap/ui/model/FilterOperator",     // Added FilterOperator module
    "ZSHOPFLOOR_PORTAL_UI5_863/util/formatter" // Kept for other potential uses, though not used for dashboard counts anymore
], function (Controller, MessageToast, JSONModel, Log, Filter, FilterOperator, formatter) { // Updated parameters
    "use strict";

    return Controller.extend("ZSHOPFLOOR_PORTAL_UI5_863.controller.Dashboard", {

        formatter: formatter,

        onInit: function () {
            // Create local model for dashboard data
            var oDashboardModel = new JSONModel({
                plannedOrdersMTDCount: 0,
                plannedOrdersYTDCount: 0,
                productionOrdersMTDCount: 0,
                productionOrdersYTDCount: 0,
                totalPlannedOrders: 0,
                totalProductionOrders: 0,
                lastUpdated: new Date().toLocaleString()
            });
            this.getView().setModel(oDashboardModel);

            // Load dashboard data
            this._loadDashboardData();
        },

        /**
         * Helper function to format a Date object into 'YYYY-MM-DDTHH:MM:SS' string.
         * This format is commonly used for OData date filters.
         * Time is set to T00:00:00 to ensure filtering from the very beginning of the day.
         * @param {Date} oDate The date object to format.
         * @returns {string} The formatted date string.
         */
        _getODataDateString: function (oDate) {
            var sYear = oDate.getFullYear();
            var sMonth = (oDate.getMonth() + 1).toString().padStart(2, '0');
            var sDay = oDate.getDate().toString().padStart(2, '0');
            // Using T00:00:00 to match the typical date format in the provided XML and ensure
            // the start of the day is correctly represented for filtering.
            return `${sYear}-${sMonth}-${sDay}T00:00:00`;
        },

        _loadDashboardData: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            var oView = this.getView();
            var oDashboardModel = oView.getModel();
            var that = this;

            var oNow = new Date();
            var currentYear = oNow.getFullYear();
            var currentMonth = oNow.getMonth(); // 0-indexed month

            // Calculate date ranges for OData filtering
            var oFirstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
            var oFirstDayNextMonth = new Date(currentYear, currentMonth + 1, 1);
            var oFirstDayCurrentYear = new Date(currentYear, 0, 1);
            var oFirstDayNextYear = new Date(currentYear + 1, 0, 1); // For full current year

            // Format dates into strings suitable for OData filters
            var sMTDStartDate = this._getODataDateString(oFirstDayCurrentMonth);
            var sMTDEndDate = this._getODataDateString(oFirstDayNextMonth);
            var sYTDStartDate = this._getODataDateString(oFirstDayCurrentYear);
            var sYTDEndDate = this._getODataDateString(oFirstDayNextYear);

            Log.info("OData Filter Dates - MTD Start: " + sMTDStartDate + ", MTD End: " + sMTDEndDate);
            Log.info("OData Filter Dates - YTD Start: " + sYTDStartDate + ", YTD End: " + sYTDEndDate);

            /**
             * Helper function to make an OData read call with filters and update a model property.
             * @param {string} sEntitySet The OData entity set path (e.g., "/PlannedOrderSet").
             * @param {sap.ui.model.Filter[]} aFilters An array of sap.ui.model.Filter objects.
             * @param {string} sPropertyPath The path in the JSONModel to update (e.g., "/plannedOrdersMTDCount").
             * @param {string} sLogMessage A message to log on success.
             * @param {string} sErrorMessage A message to show and log on error.
             * @returns {Promise<number>} A promise that resolves with the count or rejects with the error.
             */
            function fetchAndSetCount(sEntitySet, aFilters, sPropertyPath, sLogMessage, sErrorMessage) {
                return new Promise((resolve, reject) => {
                    oODataModel.read(sEntitySet, {
                        filters: aFilters,
                        success: function (oData) {
                            var iCount = oData.results ? oData.results.length : 0;
                            oDashboardModel.setProperty(sPropertyPath, iCount);
                            Log.info(sLogMessage + iCount + " via OData filter.");
                            resolve(iCount);
                        },
                        error: function (oError) {
                            oDashboardModel.setProperty(sPropertyPath, 0); // Set to 0 on error
                            MessageToast.show(sErrorMessage);
                            Log.error(sErrorMessage, oError);
                            reject(oError);
                        }
                    });
                });
            }

            /**
             * Helper function to fetch the total count of an entity set (without filters).
             * @param {string} sEntitySet The OData entity set path (e.g., "/PlannedOrderSet").
             * @param {string} sPropertyPath The path in the JSONModel to update (e.g., "/totalPlannedOrders").
             * @param {string} sLogMessage A message to log on success.
             * @param {string} sErrorMessage A message to show and log on error.
             * @returns {Promise<number>} A promise that resolves with the total count or rejects with the error.
             */
            function fetchAndSetTotalCount(sEntitySet, sPropertyPath, sLogMessage, sErrorMessage) {
                return new Promise((resolve, reject) => {
                    oODataModel.read(sEntitySet, {
                        success: function (oData) {
                            var iCount = oData.results ? oData.results.length : 0;
                            oDashboardModel.setProperty(sPropertyPath, iCount);
                            Log.info(sLogMessage + iCount + ".");
                            resolve(iCount);
                        },
                        error: function (oError) {
                            oDashboardModel.setProperty(sPropertyPath, 0); // Set to 0 on error
                            MessageToast.show(sErrorMessage);
                            Log.error(sErrorMessage, oError);
                            reject(oError);
                        }
                    });
                });
            }

            // --- Fetch Planned Orders Data ---
            Promise.all([
                // MTD Planned Orders Count
                fetchAndSetCount(
                    "/PlannedOrderSet",
                    [
                        new Filter("Basicstartdate", FilterOperator.GE, sMTDStartDate),
                        new Filter("Basicstartdate", FilterOperator.LT, sMTDEndDate)
                    ],
                    "/plannedOrdersMTDCount",
                    "Loaded MTD planned orders: ",
                    that.getResourceBundle().getText("errorLoadingData") + " (Planned MTD)"
                ),
                // YTD Planned Orders Count
                fetchAndSetCount(
                    "/PlannedOrderSet",
                    [
                        new Filter("Basicstartdate", FilterOperator.GE, sYTDStartDate),
                        new Filter("Basicstartdate", FilterOperator.LT, sYTDEndDate)
                    ],
                    "/plannedOrdersYTDCount",
                    "Loaded YTD planned orders: ",
                    that.getResourceBundle().getText("errorLoadingData") + " (Planned YTD)"
                ),
                // Total Planned Orders Count
                fetchAndSetTotalCount(
                    "/PlannedOrderSet",
                    "/totalPlannedOrders",
                    "Loaded total planned orders: ",
                    that.getResourceBundle().getText("errorLoadingData") + " (Planned Total)"
                )
            ]).then(() => {
                // Update lastUpdated after all planned order fetches are complete
                oDashboardModel.setProperty("/lastUpdated", new Date().toLocaleString());
            }).catch(() => {
                Log.error("One or more Planned Order data fetches failed.");
                oDashboardModel.setProperty("/lastUpdated", new Date().toLocaleString()); // Update anyway for feedback
            });

            // --- Fetch Production Orders Data ---
            Promise.all([
                // MTD Production Orders Count
                fetchAndSetCount(
                    "/ProductionOrderSet",
                    [
                        new Filter("Basicstartdate", FilterOperator.GE, sMTDStartDate),
                        new Filter("Basicstartdate", FilterOperator.LT, sMTDEndDate)
                    ],
                    "/productionOrdersMTDCount",
                    "Loaded MTD production orders: ",
                    "Unable to load MTD Production Orders. Please contact your administrator."
                ),
                // YTD Production Orders Count
                fetchAndSetCount(
                    "/ProductionOrderSet",
                    [
                        new Filter("Basicstartdate", FilterOperator.GE, sYTDStartDate),
                        new Filter("Basicstartdate", FilterOperator.LT, sYTDEndDate)
                    ],
                    "/productionOrdersYTDCount",
                    "Loaded YTD production orders: ",
                    "Unable to load YTD Production Orders. Please contact your administrator."
                ),
                // Total Production Orders Count
                fetchAndSetTotalCount(
                    "/ProductionOrderSet",
                    "/totalProductionOrders",
                    "Loaded total production orders: ",
                    "Unable to load Total Production Orders. Please contact your administrator."
                )
            ]).then(() => {
                // Update lastUpdated after all production order fetches are complete
                oDashboardModel.setProperty("/lastUpdated", new Date().toLocaleString());
            }).catch(() => {
                Log.error("One or more Production Order data fetches failed.");
                oDashboardModel.setProperty("/lastUpdated", new Date().toLocaleString()); // Update anyway for feedback
            });
        },

        onPlannedOrdersMTDPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("plannedorders", {
                filter: "MTD"
            });
        },

        onPlannedOrdersYTDPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("plannedorders", {
                filter: "YTD"
            });
        },

        onProductionOrdersMTDPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("productionorders", {
                filter: "MTD"
            });
        },

        onProductionOrdersYTDPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("productionorders", {
                filter: "YTD"
            });
        },

        onLogout: function () {
            MessageToast.show(this.getResourceBundle().getText("logoutMessage"));

            // Clear user session
            var oUserSession = this.getOwnerComponent().getModel("userSession");
            if (oUserSession) {
                oUserSession.setData({
                    userId: null,
                    isAuthenticated: false
                });
            }

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("login");
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});