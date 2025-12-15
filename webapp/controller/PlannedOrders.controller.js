sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/base/Log",
    "ZSHOPFLOOR_PORTAL_UI5_863/util/formatter"
], function (Controller, MessageToast, JSONModel, Filter, FilterOperator, Log, formatter) {
    "use strict";

    return Controller.extend("ZSHOPFLOOR_PORTAL_UI5_863.controller.PlannedOrders", {

        formatter: formatter,

        onInit: function () {
            console.log("PlannedOrders.controller.js: onInit called.");
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("plannedorders").attachPatternMatched(this._onRouteMatched, this);

            var oViewModel = new JSONModel({
                filterType: "MTD",
                count: 0
            });
            this.getView().setModel(oViewModel, "viewModel");

            // Local Model for Client-Side Filtering
            var oLocalModel = new JSONModel({ results: [] });
            oLocalModel.setSizeLimit(10000); // Ensure we can hold enough records
            this.getView().setModel(oLocalModel, "localModel");


            // Log the OData model when the controller initializes
            var oODataModel = this.getOwnerComponent().getModel();
            console.log("PlannedOrders.controller.js: OData Model (from Component):", oODataModel);
            if (!oODataModel) {
                console.error("PlannedOrders.controller.js: ERROR - OData model not found via getOwnerComponent().getModel()!");
            }
        },

        _onRouteMatched: function (oEvent) {
            console.log("PlannedOrders.controller.js: _onRouteMatched called.");
            var sFilter = oEvent.getParameter("arguments").filter;
            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/filterType", sFilter);
            oViewModel.setProperty("/count", 0);

            this._populateSelectBox(sFilter);
            this._fetchAllData();
        },

        _fetchAllData: function () {
            var oModel = this.getOwnerComponent().getModel();
            var that = this;
            var oTable = this.byId("plannedOrdersTable");
            oTable.setBusy(true);

            console.log("PlannedOrders: Fetching ALL data from OData...");

            oModel.read("/PlannedOrderSet", {
                success: function (oData) {
                    console.log("PlannedOrders: Data fetched successfully.", oData.results.length);
                    if (oData.results.length > 0) {
                        console.log("PlannedOrders: First Item Keys:", Object.keys(oData.results[0]));
                        console.log("PlannedOrders: First Item Sample:", oData.results[0]);
                    }
                    var aResults = oData.results;
                    that.getView().getModel("localModel").setProperty("/results", aResults);
                    oTable.setBusy(false);

                    // Apply default filters (e.g. current month) after data load
                    that.onSearch();
                },
                error: function (oError) {
                    console.error("PlannedOrders: Error fetching data", oError);
                    oTable.setBusy(false);
                    sap.m.MessageToast.show("Failed to fetch data.");
                }
            });
        },

        _populateSelectBox: function (sFilterType) {
            var oSelect = this.byId("idPeriodSelect");
            if (!oSelect) return;

            oSelect.destroyItems();
            oSelect.addItem(new sap.ui.core.Item({ key: "All", text: "All Periods" }));

            if (sFilterType === "YTD") {
                oSelect.setSelectedKey("All");
                oSelect.setEnabled(false);
            } else {
                oSelect.setEnabled(true);
                // Defaulting to Month view for now as requested
                var aMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                for (var i = 0; i < 12; i++) {
                    oSelect.addItem(new sap.ui.core.Item({ key: (i + 1).toString(), text: aMonths[i] }));
                }

                // Select current month by default
                var currentMonth = new Date().getMonth() + 1;
                oSelect.setSelectedKey(currentMonth.toString());
            }
        },

        onSearch: function (oEvent) {
            console.log("PlannedOrders.controller.js: onSearch called (Client-Side).");

            var sQuery = "";
            var oSearchField = this.byId("searchField");
            if (oSearchField) {
                sQuery = oSearchField.getValue();
            }

            var oTable = this.byId("plannedOrdersTable");
            var oBinding = oTable.getBinding("items");

            if (!oBinding) {
                return;
            }

            // 1. Search Filters
            var aSearchFilters = [];
            if (sQuery && sQuery.length > 0) {
                aSearchFilters.push(new Filter({
                    filters: [
                        new Filter("Plannedordernumber", FilterOperator.Contains, sQuery),
                        new Filter("Materialnumber", FilterOperator.Contains, sQuery),
                        new Filter("Planningplant", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            // 2. Date Filters from Select
            var oSelect = this.byId("idPeriodSelect");
            var sKey = oSelect ? oSelect.getSelectedKey() : "All";
            var aDateFilters = [];

            if (sKey !== "All") {
                // Year-Agnostic Month Filter
                // sKey is "1" for Jan, "2" for Feb, etc.
                var iSelectedMonth = parseInt(sKey, 10) - 1; // 0-indexed for JS Date

                aDateFilters.push(new Filter({
                    path: "Basicstartdate",
                    test: function (oValue) {
                        if (!oValue) return false;

                        // Handle raw OData date if it's somehow not a Date object yet (though it should be)
                        var oDate = oValue;
                        if (!(oDate instanceof Date)) {
                            oDate = new Date(oValue);
                        }
                        if (isNaN(oDate.getTime())) return false;

                        // Compare Months Only (Ignore Year)
                        return oDate.getMonth() === iSelectedMonth;
                    }
                }));
            }

            // 3. Combine
            var aCombinedFilters = [];
            if (aSearchFilters.length > 0) aCombinedFilters.push(new Filter(aSearchFilters, false));
            if (aDateFilters.length > 0) aCombinedFilters = aCombinedFilters.concat(aDateFilters);

            if (aCombinedFilters.length > 0) {
                oBinding.filter(new Filter(aCombinedFilters, true));
            } else {
                oBinding.filter([]);
            }

            // Update Count
            var iCount = oBinding.getLength();
            this.getView().getModel("viewModel").setProperty("/count", iCount);
        },

        onRefresh: function () {
            console.log("PlannedOrders.controller.js: onRefresh called.");
            var oTable = this.byId("plannedOrdersTable");
            var oBinding = oTable.getBinding("items");

            if (oBinding) {
                oBinding.refresh();
                MessageToast.show(this.getResourceBundle().getText("refreshButton"));
                console.log("PlannedOrders.controller.js: Binding refreshed.");
            }
        },

        onNavBack: function () {
            console.log("PlannedOrders.controller.js: onNavBack called.");
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("dashboard");
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});
