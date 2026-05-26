sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("northwind.app.controller.Main", {
        onInit: function () {
            // Main initialization logic
        },

        onRefresh: function () {
            var oModel = this.getView().getModel();
            if (oModel) {
                oModel.refresh();
            }
        },

        onSearchProducts: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("productsTable");
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                if (sQuery && sQuery.length > 0) {
                    var oFilter = new Filter("ProductName", FilterOperator.Contains, sQuery);
                    oBinding.filter([oFilter]);
                } else {
                    oBinding.filter([]);
                }
            }
        },

        onSearchOrders: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("ordersTable");
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                if (sQuery && sQuery.length > 0) {
                    var oFilter = new Filter("CustomerID", FilterOperator.Contains, sQuery.toUpperCase());
                    oBinding.filter([oFilter]);
                } else {
                    oBinding.filter([]);
                }
            }
        },

        onSearchCategories: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("categoriesTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(sQuery ? [new Filter("CategoryName", FilterOperator.Contains, sQuery)] : []);
            }
        },

        onSearchCustomers: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("customersTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(sQuery ? [new Filter("CompanyName", FilterOperator.Contains, sQuery)] : []);
            }
        },

        onSearchSuppliers: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("suppliersTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(sQuery ? [new Filter("CompanyName", FilterOperator.Contains, sQuery)] : []);
            }
        }
    });
});
