/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
        "pm11/zpm11nftcreate/util/Constants",
		"pm11/zpm11nftcreate/controller/BaseController",
		"pm11/zpm11nftcreate/model/formatter",
		"sap/m/GroupHeaderListItem"
	], function(CONSTANTS, BaseController, formatter, GroupHeaderListItem) {

	"use strict";

	return BaseController.extend("pm11.zpm11nftcreate.controller.LinksForTechnicalObject", {

        formatter: formatter,

		_bCurrentEntryFound: false,
		_bHistoryEntryFound: false,

		/**
		 * Provide an dialogue with overview information regarding the
		 * selected equipment respectively the functional location.
		 * @param {sap.ui.base.Event} [oEvent] the link to display technical object overview was clicked
		 * @public
		 */
		onPressTechnicalObjectOverview: function(oEvent) {
			var oNotification = this.getObject();

			this.getUtil().launchPopoverTechnicalObjectOverview(
				oNotification.TechnicalObjectNumber,
				oNotification.TecObjNoLeadingZeros,// technical object with leading zeros
				oNotification.TechnicalObjectType,
				oEvent.getSource(),
				this.getView());
		},

		/**
		 * determin all open Notifications belonging to the selected technical object
		 * and display them in a seperate popover
		 * @param {sap.ui.base.Event} [oEvent] the link to display current notifications was clicked
		 * @public
		 */
		onPressCurrentNotifications: function(oEvent) {
			var oNotification = this.getObject();
			var aFilters = this.getAppController().buildFilterForNotifications(oNotification, CONSTANTS.GENERAL.COUNT_ALL_NOTIFICATIONS);
			this.oCurrentNotifPopover = this.getUtil().launchPopoverCurrentNotifications(oNotification, aFilters, oEvent.getSource(), this.getView());
			//clear the marker that current/history entry was found, necessary for grouping headers
			this._bCurrentEntryFound = false;
			this._bHistoryEntryFound = false;
		},

		/**
		 * Opens the selected notificationif the user clicks.
		 * @param {sap.ui.base.Event} [oEvent] list selection of the current notifications
		 * @public
		 */
		onPressNotification: function(oEvent) {
			var oContext = oEvent.getSource().getBindingContext();
			var sNotificationNumber = oContext.getProperty("NotificationNumber");

			this.navTo(CONSTANTS.ROUTES.DISPLAY, {
				NotificationNumber: encodeURIComponent(sNotificationNumber)
			});
			
			if (this.oCurrentNotifPopover){
				this.oCurrentNotifPopover.close();
			}

		},

		/**
		 * Create group header for notifications list
		 * @param {object} [oGroup] group info
		 * @return {sap.m.GroupHeaderListItem} object Group header
		 * @public
		 */
		getGroupHeader: function (oGroup){
			
			var sTitle;
			var bVisible = true;
			
			var sCountCurrent = this.getView().getModel(CONSTANTS.MODEL.VIEW_PROP.NAME).getProperty(CONSTANTS.MODEL.VIEW_PROP.PROPERTIES.GENERAL.CNT_CURRENT_NOTIFICATIONS);
			var sCountHistory = this.getView().getModel(CONSTANTS.MODEL.VIEW_PROP.NAME).getProperty(CONSTANTS.MODEL.VIEW_PROP.PROPERTIES.GENERAL.CNT_HISTORY_NOTIFICATIONS);
			
			switch (oGroup.key) {
				case "4":
					sTitle = this.getResourceBundle().getText("xtit.groupHistoryNotifications", [sCountHistory]);
					if (this._bHistoryEntryFound) {
						bVisible = false;
					}					
					this._bHistoryEntryFound = true;
					break;
				case "5":
					sTitle = this.getResourceBundle().getText("xtit.groupHistoryNotifications", [sCountHistory]);
					if (this._bHistoryEntryFound) {
						bVisible = false;
					}					
					this._bHistoryEntryFound = true;
					break;					
				default:
					sTitle = this.getResourceBundle().getText("xtit.groupCurrentNotifications", [sCountCurrent]);
					if (this._bCurrentEntryFound) {
						bVisible = false;
					}					
					this._bCurrentEntryFound = true;					
			}
			

			
			return new GroupHeaderListItem( {
				title: sTitle,
				upperCase: false,
				visible: bVisible
			} );
		}		

	});
});