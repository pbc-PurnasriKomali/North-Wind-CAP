sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("northwind.app.controller.Main", {
        onInit: function () {},

        onRefresh: function () {
            var oModel = this.getView().getModel();
            if (oModel) oModel.refresh();
        },

        onSearchProducts: function (oEvent) {
            this._filterTable(oEvent, "productsTable", "ProductName");
        },

        onSearchOrders: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oBinding = this.byId("ordersTable").getBinding("items");
            if (oBinding) {
                oBinding.filter(sQuery ? [new Filter("CustomerID", FilterOperator.Contains, sQuery.toUpperCase())] : []);
            }
        },

        onSearchCategories: function (oEvent) {
            this._filterTable(oEvent, "categoriesTable", "CategoryName");
        },

        onSearchCustomers: function (oEvent) {
            this._filterTable(oEvent, "customersTable", "CompanyName");
        },

        onSearchSuppliers: function (oEvent) {
            this._filterTable(oEvent, "suppliersTable", "CompanyName");
        },

        _filterTable: function (oEvent, tableId, field) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oBinding = this.byId(tableId).getBinding("items");
            if (oBinding) {
                oBinding.filter(sQuery ? [new Filter(field, FilterOperator.Contains, sQuery)] : []);
            }
        }
    });
});
