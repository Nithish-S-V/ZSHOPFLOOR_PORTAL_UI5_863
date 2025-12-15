sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Format SAP OData date format to readable DD/MM/YYYY
         * Handles both XML format (2025-06-27T00:00:00) and JSON format (/Date(timestamp)/)
         */
        formatDate: function (sDate) {
            if (!sDate) { return ""; }

            var oDate;
            if (sDate instanceof Date) {
                oDate = sDate;
            } else if (typeof sDate === "string") {
                // Handle XML OData format: "2025-06-27T00:00:00"
                if (sDate.indexOf("T") !== -1) {
                    oDate = new Date(sDate);
                }
                // Handle JSON OData format: "/Date(1719446400000)/"
                else if (sDate.indexOf("/Date(") !== -1) {
                    var sTimestamp = sDate.replace("/Date(", "").replace(")/", "");
                    var iTimestamp = parseInt(sTimestamp, 10);
                    if (isNaN(iTimestamp)) { return ""; }
                    oDate = new Date(iTimestamp);
                } else {
                    return sDate;
                }
            } else {
                return "";
            }

            // Check if date is valid
            if (isNaN(oDate.getTime())) { return ""; }

            var sDay = ("0" + oDate.getDate()).slice(-2);
            var sMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
            var sYear = oDate.getFullYear();

            return sDay + "/" + sMonth + "/" + sYear;
        },

        /**
         * Format quantity with unit
         */
        formatQuantity: function (sQuantity, sUnit) {
            if (!sQuantity) { return ""; }
            return sQuantity + (sUnit ? " " + sUnit : "");
        },

        /**
         * Get order type description
         */
        formatOrderType: function (sOrderType) {
            var mOrderTypes = {
                "PM01": "Preventive Maintenance",
                "PM02": "Breakdown Maintenance",
                "PP01": "Production Order",
                "CU01": "Custom Order",
                "LA": "Make-to-Stock",
                "NB": "MRP"
            };
            return mOrderTypes[sOrderType] || sOrderType;
        },

        /**
         * Simple string concatenation for titles
         */
        formatTitle: function (sPrefix, sSuffix) {
            return sPrefix + " - " + sSuffix;
        },

        isMonthToDate: function (sDate) {
            if (!sDate) { return false; }

            var oDate;
            if (sDate instanceof Date) {
                oDate = sDate;
            } else if (typeof sDate === "string") {
                if (sDate.indexOf("/Date(") !== -1) {
                    var sTimestamp = sDate.replace("/Date(", "").replace(")/", "");
                    oDate = new Date(parseInt(sTimestamp, 10));
                } else {
                    return false;
                }
            } else {
                return false;
            }

            var oNow = new Date();
            return oDate.getMonth() === oNow.getMonth() &&
                oDate.getFullYear() === oNow.getFullYear();
        },

        isYearToDate: function (sDate) {
            if (!sDate) { return false; }

            var oDate;
            if (sDate instanceof Date) {
                oDate = sDate;
            } else if (typeof sDate === "string") {
                // Handle XML format: "2025-06-27T00:00:00"
                if (sDate.indexOf("T") !== -1) {
                    oDate = new Date(sDate);
                }
                // Handle JSON format: "/Date(timestamp)/"
                else if (sDate.indexOf("/Date(") !== -1) {
                    var sTimestamp = sDate.replace("/Date(", "").replace(")/", "");
                    oDate = new Date(parseInt(sTimestamp, 10));
                } else {
                    return false;
                }
            } else {
                return false;
            }

            if (isNaN(oDate.getTime())) { return false; }

            var oNow = new Date();
            return oDate.getFullYear() === oNow.getFullYear();
        }
    };
});
