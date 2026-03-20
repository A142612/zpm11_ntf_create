/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"pm11/zpm11nftcreate/controller/BaseController",
	"pm11/zpm11nftcreate/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"pm11/zpm11nftcreate/util/Constants"
], function (BaseController, formatter, Filter, FilterOperator, Constants) {
	"use strict";

	return BaseController.extend("pm11.zpm11nftcreate.controller.fragments.CurrentWorkRequests", {
		formatter: formatter,

		onInit: function () {
			this.getRouter().getRoute("showCurrentWorkRequests").attachMatched(this._onRouteMatched, this);
		},

		/**
		 * called when the show current wr link is pressed
		 */
		_onRouteMatched: function () {
			var that = this;
			this.getView().getModel().metadataLoaded().then(function () {
				return that.parentBindingContextAvailable(Constants.ENTITY.WORK_REQUEST_TP);
			}).then(function () {

				that._oCreateWorkRequestView = that.getView().getParent().getParent();
				that._oWorkRequest = that.getView().getBindingContext().getObject();
				var oList = that.getView().byId("CreateWrListCurrentNotifications");
				var oPopover = that.getView().byId("CreateWrRespPopoverCurrentNotifs");
				if (that._sTechnicalObject !== that._oWorkRequest.TechnicalObject || that._sTechObjIsEquipOrFuncnlLoc !== that._oWorkRequest
					.TechObjIsEquipOrFuncnlLoc) {
					that._sTechnicalObject = that._oWorkRequest.TechnicalObject;
					that._sTechObjIsEquipOrFuncnlLoc = that._oWorkRequest.TechObjIsEquipOrFuncnlLoc;

					oList.removeAllItems();
					oPopover.setBusy(true);

					oList.getBinding("items").attachEventOnce("change", function () {
						oPopover.setBusy(false);
					}, this);
					var _techObjIsFLorEqui = function(){
						if ( that._oWorkRequest.TechObjIsEquipOrFuncnlLoc === Constants.FUNCTIONAL_LOCATION){
							return "FunctionalLocation";
						} else if ( that._oWorkRequest.TechObjIsEquipOrFuncnlLoc === Constants.EQUIPMENT){
							return "Equipment";
						}
				};
					var aFilters = [
						new Filter({
							path: "IsActiveEntity",
							operator: FilterOperator.EQ,
							value1: true
						}),
						new Filter({
							path: _techObjIsFLorEqui(),
							operator: FilterOperator.EQ,
							value1: that._sTechnicalObject
						// }), new Filter({
						// 	path: "TechObjIsEquipOrFuncnlLoc",
						// 	operator: FilterOperator.EQ,
						// 	value1: that._sTechObjIsEquipOrFuncnlLoc
						}),
						new Filter({
							path: "NotifProcessingPhase",
							operator: FilterOperator.LE,
							value1: Constants.WORK_REQUEST_STATUS.CURRENT
						})
					];
					oList.getBinding("items").filter(aFilters);
				}

				oPopover.openBy(that._oCreateWorkRequestView.byId(
					"CreateWrCurrentNotificationsLink"));
			});
		},
		onMNotificationItemPress: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext();
			var sMaintenanceNotification = oContext.getProperty("MaintenanceNotification");
			 var oPopover = this.getView().byId("CreateWrRespPopoverCurrentNotifs");
			if (oPopover){
				oPopover.close();
			}
			//var sMaintenanceNotificationItem = oContext.getProperty("MaintenanceNotificationItem");
			if (sMaintenanceNotification) { 
			//	var oNavigationController = this.extensionAPI.getNavigationController();
			//	oNavigationController.navigateExternal("toMaintenanceNotification", {
				//	MaintenanceNotification: sMaintenanceNotification
				//});
				this.navTo(Constants.ROUTES.DISPLAY, {
				NotificationNumber: encodeURIComponent(sMaintenanceNotification)
			});

            

			/*	var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
				oCrossAppNav.toExternal({
					target: {
						semanticObject: "MaintenanceNotification",		
						action: "displayFactSheet"
					},
					params: {
						MaintenanceNotification: sMaintenanceNotification		
					}
				});*/
			}		
		},		

		onAfterClose: function () {
			//this.getRouter().navTo("draft", {
			//	DraftUUID: encodeURIComponent(this._oWorkRequest.DraftUUID)
		//	}, true);
			 this.getRouter().navTo("RouteCreateNotification", {}, true /*no history*/ );
		}
	});

});