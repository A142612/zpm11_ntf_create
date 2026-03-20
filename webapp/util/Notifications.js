/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"pm11/zpm11nftcreate/util/Constants",
	"sap/ui/base/Object"
], function (CONSTANTS, Object) {
	"use strict";

	return Object.extend("pm11.zpm11nftcreate.util.Notifications", {

		// Helper class for centrally handling oData CRUD and function import services. The interface provides the business
		// meanings for the application and can be reused in different places where the UI-specific actions after the call
		// could still be different and will be handled in the corresponding controller of the view.
		// Every (main) view of this app has an instance of this class as an attribute so that it can forward all explicit
		// backend calls to it.

		_oDataModel: null,
		_oAppModel: null,
		_oAppController: null,
		_oMainView: null,
		_oResourceBundle: null,
		_aDeleteListeners: [],

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Constructor
		 * 
		 * @param {object} oComponent
		 * @param {object} oMainView
		 * @public
		 * 
		 */
		constructor: function (oComponent, oMainView) {
			var oDeferred;

			this._oDataModel = oComponent.getModel();
			this._oAppModel = oComponent.getModel(CONSTANTS.MODEL.APP_MODEL.NAME);
			this._oMainView = oMainView;
			this._oAppController = oMainView.getController();
			this._oResourceBundle = oMainView.getController().getResourceBundle();

			oDeferred = new jQuery.Deferred();
			this._oDraftDeletedPromise = oDeferred.promise();
			oDeferred.resolve();

		},

		/* ===========================================================  */
		/* Helpers                                                      */
		/* ===========================================================  */

		/**
		 * Get path for NotificationHeaderSet + NotificationNumber
		 * @param {string} sNotificationNo NotificationNumber
		 * @return {string} path
		 * @public
		 */
		getPathForNotificationNo: function (sNotificationNo) {
			return "/NotificationHeaderSet('" + encodeURIComponent(sNotificationNo) + "')";
		},

		/**
		 * Get path for NotificationTypeSet + NotificationType
		 * @param {string} sNotificationType NotificationType
		 * @return {string} path
		 * @public
		 */
		getPathForNotificationType: function (sNotificationType) {
			return "/NotificationTypeSet('" + encodeURIComponent(sNotificationType) + "')";
		},

		/**
		 * Get path for NotificationTypeChangeSet + NotificationType
		 * @param {string} sNotificationType NotificationType
		 * @return {string} path
		 * @public
		 */
		getPathForNotificationTypeChange: function (sSourceNotificationType, sTargetNotificationType) {
			return "/NotificationTypeChangeSet(SourceNotificationType='" + encodeURIComponent(sSourceNotificationType) +
				"',TargetNotificationType='" + encodeURIComponent(sTargetNotificationType) + "')";
		},

		/**
		 * Get path for NotificationHeaderSet 
		 * @return {string} path
		 * @public
		 */
		getPathForNotificationHeaders: function () {
			return "/NotificationHeaderSet";
		},

		/**
		 * Get path for LongTextSet 
		 * @return {string} path
		 * @public
		 */
		getPathForLongTextSet: function () {
			return "/LongTextSet";
		},

		/**
		 * Get path for TechnicalObject 
		 * @param {string} sNumber TechnicalObjectNumber
		 * @param {string} sTechnicalObjectType TechnicalObjectType
		 * @return {string} path
		 * @public
		 */
		getPathForTechnicalObject: function (sNumber, sTechnicalObjectType) {
			return "/TechnicalObject(TechnicalObjectNumber='" + encodeURIComponent(sNumber) + "',TechnicalObjectType='" + encodeURIComponent(
				sTechnicalObjectType) + "')";
		},

		/**
		 * Get path for TechnicalObjectSet
		 * @param {string} sNumber TechnicalObjectNumber
		 * @param {string} sTechnicalObjectType TechnicalObjectType
		 * @return {string} path
		 * @public
		 */
		getPathForTechnicalObjectSet: function (sNumber, sTechnicalObjectType) {
			return "/TechnicalObjectSet(TechnicalObjectNumber='" + encodeURIComponent(sNumber) + "',TechnicalObjectType='" + encodeURIComponent(
				sTechnicalObjectType) + "')";
		},

		/**
		 * Get path for TechnicalObject ThumbnailSet
		 * @param {string} sNumber TechnicalObjectNumber
		 * @param {string} sTechnicalObjectType TechnicalObjectType
		 * @return {string} path
		 * @public
		 */
		getPathForTechnicalObjectThumbnailSet: function (sNumber, sTechnicalObjectType) {
			return "/TechnicalObjectThumbnailSet(TechnicalObjectNumber='" + encodeURIComponent(sNumber) + "',TechnicalObjectType='" +
				encodeURIComponent(sTechnicalObjectType) + "')";
		},
		/**


		/**
		 * Get path for Notes belonging to a notification
		 * @param {string} sNotificationNo NotificationNumber
		 * @param {function} fnSuccess
		 * @param {function} fnError
		 * @return {string} path
		 * @public
		 */
		getNoteSet: function (sNotificationNo, fnSuccess, fnError) {
			this._oDataModel.read("/NoteSet", {
				filters: [
					new sap.ui.model.Filter({
						filters: [
							new sap.ui.model.Filter({
								path: "NotificationNumber",
								operator: sap.ui.model.FilterOperator.EQ,
								value1: sNotificationNo
							})
						],
						and: true
					})
				],

				success: fnSuccess,
				error: fnError
			});
		},

		/**
		 * Get path for User ID
		 * @param {string} sUserId User ID
		 * @return {string} path
		 * @public
		 */
		getPathForUserId: function (sUserId) {
			//return "/PMUserDetailsSet(UserID='" + sUserId.toUpperCase() + "')";
			if (sUserId) {
				return "/PMUserDetailsSet('" + encodeURIComponent(sUserId.toUpperCase()) + "')";
			} else {
				return "/PMUserDetailsSet('')";
			}
		},

		/**
		 * Delete Notification
		 * @param {string} sNotificationNumber NotificationNumber
		 * @param {string} fnSuccess function to process in case of success
		 * @param {string} fnError function to process in case of error
		 * @public
		 */
		deleteNotification: function (sNotificationNumber, fnSuccess, fnError) {

			var that = this;

			/**
			 * Show success message
			 * @param {Object} oData Data with a responded by backend call
			 * @param {Object} response Full response of backend call
			 */
			function fnSubmitSuccess() { // deleted successfully

				// navigate to the list
				//  cases:
				//    - delete within edit -> display makes no sense as the entity is deleted
				//    - delete within edit -> only list makes sense
				that._oMainView.getController().navBack();

				if (fnSuccess) {
					fnSuccess();
				}

				// show success message
				jQuery.sap.require("sap.m.MessageToast");
				sap.m.MessageToast.show(
					that._oResourceBundle.getText("ymsg.deleteSuccess",
						sNotificationNumber), {
						duration: CONSTANTS.GENERAL.MESSAGETOAST_DELAY,
						closeOnBrowserNavigation: CONSTANTS.GENERAL.MESSAGETOAST_CLOSE_ON_NAV
					}
				);

			}

			// remove the entity
			this._oDataModel.remove(this.getPathForNotificationNo(sNotificationNumber), {
				success: fnSubmitSuccess,
				error: fnError
					//				error: fnSubmitError    //Error handling is done in ErrorHandler via Event Listener on Model
			});
		},

		/**
		 * Cancel a notification if changes were made and reset attachments
		 * @param {string} sNotificationNumber NotificationNumber
		 * @param {object} oAttachmentHandler
		 * @param {function} fnAfterSuccess
		 * @param {function} fnAfterError
		 * @public
		 */
		cancelNotification: function (sNotificationNumber, oAttachmentComponent, fnAfterSuccess, fnAfterError) {

			var that = this;
			try {
				if (that._oDataModel.hasPendingChanges()) {
					that._oDataModel.resetChanges();
				}

				// cancel attachments if they have changes
				if (oAttachmentComponent) {
					oAttachmentComponent.getApplicationState(function (bResp) {
						if (bResp) {
							oAttachmentComponent.cancel(true);
						}
					});
				}
			} catch (err) {
				if (fnAfterError) {
					fnAfterError();
				}
			}
			if (!that._oAppModel.getProperty(CONSTANTS.MODEL.APP_MODEL.PROPERTIES.IS_CREATE_MODE)) { //edit mode

				if (fnAfterSuccess) {
					fnAfterSuccess();
				}

			} else { //create mode 

				// DELETED because the app, when in cancelled from S1, thinks it is in edit mode in fnAfterSuccess
				//	that._oAppModel.setProperty(CONSTANTS.MODEL.APP_MODEL.PROPERTIES.IS_CREATE_MODE, false);

				if (fnAfterSuccess) {
					fnAfterSuccess();
				}
			}

		},

		/**
		 * Function to count notifications for a technical object 
		 * 
		 * @param {object} oNotification the notification element
		 * @param {JSONModel} oViewModel model containing view properties
		 * @param {string} sType destinguish between open, history and notifications in general per Technical Object 
		 * ["open"|"history"|""]
		 * @param {ODataModel} oDataModel
		 * @return promise object
		 * @private
		 */
		_countNotifications: function (oNotification, oViewModel, sType, oDataModel) {

			var sCounterProperty;
			// create local model if none supplied
			var oLocalModel = oDataModel ? oDataModel : new sap.ui.model.odata.v2.ODataModel({
				serviceUrl: this._oDataModel.sServiceUrl,
				defaultCountMode: sap.ui.model.odata.CountMode.Request
			});

			switch (sType) {
			case CONSTANTS.GENERAL.COUNT_OPEN_NOTIFICATIONS:
				sCounterProperty = CONSTANTS.MODEL.VIEW_PROP.PROPERTIES.GENERAL.CNT_CURRENT_NOTIFICATIONS;
				break;
			case CONSTANTS.GENERAL.COUNT_HISTORY_NOTIFICATIONS:
				sCounterProperty = CONSTANTS.MODEL.VIEW_PROP.PROPERTIES.GENERAL.CNT_HISTORY_NOTIFICATIONS;
				break;
			default: //CONSTANTS.GENERAL.COUNT_ALL_NOTIFICATIONS currently not processed
			}

			// fetch filters via App-Controller (Filters are built in AppController)
			var aFilters = this._oAppController.buildFilterForNotifications(oNotification, sType);

			// perform count
			return this._countNotificationsWithModel(oNotification.TechnicalObjectNumber,
				oNotification.TechnicalObjectType,
				oViewModel,
				sCounterProperty,
				oLocalModel,
				aFilters);

		},

		/**
		 * Function to count open notifications  for a technical object by using a local model
		 * 
		 * @param {object} oNotification the notification element
		 * @param {JSONModel} oViewModel model containing view properties
		 * @param {ODataModel} oDataModel
		 * @return promise object
		 * @public
		 */
		countOpenNotifications: function (oNotification, oViewModel, oDataModel) {

			// perform count
			return this._countNotifications(oNotification,
				oViewModel,
				CONSTANTS.GENERAL.COUNT_OPEN_NOTIFICATIONS,
				oDataModel
			);

		},

		/**
		 * Function to count history notifications  for a technical object by using a local model
		 * 
		 * @param {object} oNotification the notification element
		 * @param {JSONModel} oViewModel model containing view properties
		 * @param {ODataModel} oDataModel
		 * @return promise object
		 * @public
		 */
		countHistoryNotifications: function (oNotification, oViewModel, oDataModel) {

			// perform count
			return this._countNotifications(oNotification,
				oViewModel,
				CONSTANTS.GENERAL.COUNT_HISTORY_NOTIFICATIONS,
				oDataModel
			);

		},

		/**
		 * Helper function to count open/history notifications for a technical object by using a given Model and filter
		 * 
		 * @param {string} sTechnObjectNo TechnicalObjectNumber
		 * @param {string} sTechnObjectType Object Type of the technical object
		 * @param {JSONModel} oViewModel model containing view properties
		 * @param {ODataModel}   oDataModel
		 * @param {object}   aFilters
		 * 
		 * @return promise object
		 * @private
		 */
		_countNotificationsWithModel: function (sTechnObjectNo, sTechnObjectType, oViewModel, sCounterProperty, oDataModel, aFilters) {

			var oDeferred = new jQuery.Deferred();

			oViewModel.setProperty(sCounterProperty, 0);

			if (!(sTechnObjectNo === undefined || sTechnObjectType === undefined || sTechnObjectNo === "" || sTechnObjectType === "")) {

				oDataModel.read(
					"/NotificationHeaderSet/$count", {
						filters: aFilters,
						success: jQuery.proxy(function (oData) {
							if (oData && typeof oData !== "undefined") {
								this.setProperty(sCounterProperty, oData);
							}
							oDeferred.resolve();
						}, oViewModel)
					});

			} else {
				oDeferred.resolve();
			}
			return oDeferred.promise();
		}

	});

});