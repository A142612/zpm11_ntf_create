/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"pm11/zpm11nftcreate/util/Constants",
	"pm11/zpm11nftcreate/controller/BaseController",
	"pm11/zpm11nftcreate/model/formatter",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"pm11/zpm11nftcreate/util/Notifications",
], function (CONSTANTS, BaseController, formatter, MessageBox, JSONModel, Notifications) {
	"use strict";

	return BaseController.extend("pm11.zpm11nftcreate.controller.DisplayExistingNotif", {

		formatter: formatter,

		_oDataHelper: null,
		_oViewProperties: null,
		_oAppModel: null,
		_sContextPath: null,
		_oAttachmentComponent: null,
		_sNotificationNumber: "",
		_oNotification: null, // Notification currently bound to the view, it could be null if the requested Notification cannot be found any more or we are in the process of loading it	

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * onInit
		 * @public
		 */
		onInit: function () {

			this._oAppModel = this.getModel(CONSTANTS.MODEL.APP_MODEL.NAME);
			this._refreshViewPropertiesModel();
			this.setAppBusyComplex({
				delay: 0
			});
			this.getView().loaded().then(function() {
				this._oDataHelper = this._oDataHelper = new Notifications(this.getOwnerComponent(), this.getView());
			}.bind(this));

			this.oShareModel = new JSONModel({
				bookmarkTitle: this.getResourceBundle().getText("xtit.displayNotification"),
				bookmarkIcon: "sap-icon://S4Hana/S0012"
			});
			this.setModel(this.oShareModel, "share");

			// attach to DISPLAY route
			this.getRouter().getRoute(CONSTANTS.ROUTES.DISPLAY).attachMatched(this.onRoutePatternMatched, this);

		},

		// /**
		//  * Refresh of View properties
		//  * onBeforeRendering
		//  * @public
		//  */        
		//      onBeforeRendering: function(){
		//      	this._refreshViewPropertiesModel();
		//      },
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * process the onRoutePatternMatched event
		 * @param {sap.ui.base.Event} oEvent
		 * @private
		 */
		onRoutePatternMatched: function (oEvent) {

			this._sNotificationNumber = decodeURIComponent(oEvent.getParameter("arguments").NotificationNumber);

		

			if (!this._sNotificationNumber) {
				return;
			}

			Promise.all([this.getView().loaded(), this.getModel("EAM_NTF_CREATE").metadataLoaded()]).then(function () {
				

				// bind the notification to the view
		 var sNotificationNumberNormalized = String("000000000000" + this._sNotificationNumber).slice(-12);
				//this._sContextPath = this.getODataHelper().getPathForNotificationNo(this._sNotificationNumber);
				this._sContextPath = this.getModel("EAM_NTF_CREATE").createKey("/NotificationHeaderSet", {
					 NotificationNumber: this._sNotificationNumber
				});
				//this._sContextPath = "/xPM11xC_PMNotificationHeader" + "(" + "MaintenanceNotification='" + this._sNotificationNumber + "')";


				this._bindView(this._sContextPath);

				// ==>  Notes (GOS) <==
				var oTimelineNotes = this.byId("pmNotifTimelineTimelineNotes");
				var oTimelineNotesHeaderBar = oTimelineNotes.getHeaderBar();
				oTimelineNotesHeaderBar.removeAllContent();
				if (!oTimelineNotesHeaderBar.getModel(CONSTANTS.MODEL.VIEW_PROP.NAME)) {
					oTimelineNotesHeaderBar.setModel(this._oViewProperties, CONSTANTS.MODEL.VIEW_PROP.NAME);
				}
				oTimelineNotesHeaderBar.setDesign(sap.m.ToolbarDesign.Transparent);
				oTimelineNotesHeaderBar.addContent(new sap.m.Title({
					text: "{viewProperties>/NotesTitle}"
				}));

				var oBindingTimeLineNotes = oTimelineNotes.getBinding("content");
				oBindingTimeLineNotes.suspend();
				oBindingTimeLineNotes.attachDataRequested(function () {
					oTimelineNotes.setBusy(true);
				});
				oBindingTimeLineNotes.attachDataReceived(function () {
					oTimelineNotes.setBusy(false);
				});
				oBindingTimeLineNotes.attachChange(function () {
					this._oViewProperties.setProperty(
						CONSTANTS.MODEL.VIEW_PROP.PROPERTIES.S3.TITLE_NOTES,
						this.getResourceBundle().getText("xtit.tabNotesCounter", oBindingTimeLineNotes.getLength().toString()));
				}.bind(this));

				// ==>  Contacts <==
				var oContactsTable = this.byId("pmNotifTableContactsTable");
				var oBindingContactsTable = oContactsTable.getBinding("items");
				oBindingContactsTable.suspend();
				oBindingContactsTable.attachDataRequested(function () {
					oContactsTable.setBusy(true);
				});
				oBindingContactsTable.attachDataReceived(function () {
					oContactsTable.setBusy(false);
				});
				oBindingContactsTable.attachChange(function () {
					this._oViewProperties.setProperty(
						CONSTANTS.MODEL.VIEW_PROP.PROPERTIES.S3.TITLE_CONTACTS,
						this.getResourceBundle().getText("xtit.tabContactsCounter", oBindingContactsTable.getLength().toString()));
				}.bind(this));

				// ==> Attachments <==   
				var sAttachObjectKey = sNotificationNumberNormalized;

				if (this._oAppModel.getProperty(CONSTANTS.MODEL.APP_MODEL.PROPERTIES.ATTACHMENTS_AVAILABLE)) {

					// create Attachment Component for the notification
					var that = this;
					this._initAttachmentComponent(
						this._oAttachmentComponent, {
							mode: CONSTANTS.ATTACHMENTS.ATTACHMENTMODE_DISPLAY,
							objectType: CONSTANTS.ATTACHMENTS.OBJECTTYPE_NOTIFICATION,
							objectKey: sAttachObjectKey
						},
						"pmNotifContainerAttachments"
					).then(function (oAttachmentComponent) {
						that._oAttachmentComponent = oAttachmentComponent;
					});
			} 

				var oIconTab = this.byId("pmNotifIconTab");
				oIconTab.setSelectedKey("request"); 

			}.bind(this)); 
		},

		onIconTabFilterSelected: function (oEvent) {
			switch (oEvent.getParameter("key")) {
			case "notes":
				var oNotesTimeLineBinding = this.byId("pmNotifTimelineTimelineNotes").getBinding("content");
				if (oNotesTimeLineBinding.isSuspended()) {
					oNotesTimeLineBinding.refresh();
					oNotesTimeLineBinding.resume();
				}
				break;
			case "contacts":
				var oContactsTableBinding = this.byId("pmNotifTableContactsTable").getBinding("items");
				if (oContactsTableBinding.isSuspended()) {
					oContactsTableBinding.refresh();
					oContactsTableBinding.resume();
				}
				break;
			}
		},

		/**
		 * Triggers a phone call
		 * @param {sap.ui.base.Event} oEvent
		 * @public
		 *  
		 */
		onPressTelephoneNumber: function (oEvent) {
			sap.m.URLHelper.triggerTel(oEvent.getSource().getText());

		},

		/**
		 * Triggers an email
		 * @param {sap.ui.base.Event} oEvent
		 * @public
		 *  
		 */
		onPressEmail: function (oEvent) {
			this.onShareEmailPress({
				sReceiver: oEvent.getSource().getText()
			});
		},

		/**
		 * Event Handler for message display: opens message in a popover
		 * @param {sap.ui.base.Event} oEvent
		 * @public
		 */
		onMessageButtonPressed: function (oEvent) {
			this.getMessagePopover().toggle(oEvent.getSource());
		},

		/**
		 * Opens the ContactInfo-Popover
		 * @param {sap.ui.base.Event} oEvent
		 * @public
		 *  
		 */
		onPressContact: function (oEvent) {

			var oItem = oEvent.getSource();
			this.getUtil().launchPopoverEmployeeQuickView(
				oItem.getBindingContext().getObject().Partner,
				oEvent.getSource(),
				this.getView());
		},

		/**
		 * Opens the EmployeeInfo-Popover when Reporter is clicked in header
		 *
		 * @public
		 * @param {sap.ui.base.Event} oEvent
		 */
		onPressReporter: function (oEvent) {
			this.getUtil().launchPopoverEmployeeQuickView(
				this.getObject().ReporterUserId,
				oEvent.getSource(),
				this.getView());

		},

		/**
		 * Opens the EmployeeInfo-Popover if a user is selected in the timeline (notes)
		 *
		 * @param {sap.ui.base.Event} oEvent user is selected within timeline
		 * @public
		 */
		onTimelineUserNameClicked: function (oEvent) {
			var oItem = oEvent.getSource();
			this.getUtil().launchPopoverEmployeeQuickView(
				oItem.getBindingContext().getObject().CreatorUsername,
				oEvent.getSource(),
				this.getView());

		},

		/**
		 * Navigate to the edit view of this notification.
		 *
		 * @param {sap.ui.base.Event} [oEvent] edit button pressed
		 * @public
		 */
		onEditPressed: function () {
			var sNotificationNumber = this.getObject().NotificationNumber;
			this.getView().unbindElement();
			this.navTo(CONSTANTS.ROUTES.EDIT, {
				NotificationNumber: sNotificationNumber
			});
		},

		/**
		 * Deletes the current notification.
		 *
		 * @public
		 */
		onDeletePressed: function () {

			var that = this;
			var sNotificationNumber = this.getObject().NotificationNumber;
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;

			// === Display confirmation dailogue ===
			MessageBox.show(
				this.getResourceBundle().getText("ymsg.deleteConfirm", sNotificationNumber), {
					icon: MessageBox.Icon.WARNING,
					title: this.getResourceBundle().getText("xtit.delete"),
					actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
					onClose: function (oAction) {
						if (oAction === MessageBox.Action.OK) {
							that.setAppBusy();
							that._oDataHelper.deleteNotification(sNotificationNumber);
						}
					},
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);
		},

		/**
		 * navigates back 
		 * @function
		 */
		onNavBack: function () {
			this.getView().unbindElement();
			this.navBack();
		},

		/* ======================================================================== */
		/* miscellanious Helpers                                                    */
		/* ======================================================================== */

		/**
		 * Getter for the AttachmentHandler of this view
		 * @return {object} AttachmentHandler
		 * @public
		 */
		getAttachmentComponent: function () {
			return this._oAttachmentComponent;
		},

		/* ========================================================================
        /* begin internal Methods 
        /* ======================================================================== */

		/**
		 * Initializes the view properties model an sets it to the parent view
		 *
		 * @private
		 */
		_refreshViewPropertiesModel: function () {

			var oGeneralViewPropConstants = CONSTANTS.MODEL.VIEW_PROP.PROPERTIES.GENERAL;

			if (!this._oViewProperties) { // set the model to the view
				this._oViewProperties = new sap.ui.model.json.JSONModel();
				this.getView().setModel(this._oViewProperties, CONSTANTS.MODEL.VIEW_PROP.NAME);
			}

			this._oViewProperties.setProperty(oGeneralViewPropConstants.CNT_CURRENT_NOTIFICATIONS, 0);
			// set view properties
			var oNotification = this.getObject();
			if (oNotification) {
				this._oViewProperties.setProperty(oGeneralViewPropConstants.GPS_DATA_AVAILABLE, (oNotification[CONSTANTS.GENERAL.LOCATION_GPS.substring(
					1)] && oNotification[CONSTANTS.GENERAL.LOCATION_GPS.substring(1)] !== "") ? true : false);
				this._oViewProperties.setProperty(oGeneralViewPropConstants.TECHNICAL_OBJECT_VALID, oNotification.TechnicalObjectNumber !== "" ?
					true : false);
				this._oViewProperties.setProperty(oGeneralViewPropConstants.VALID_USER_GIVEN, false);
				this._oViewProperties.setProperty(oGeneralViewPropConstants.CHANGE_ALLOWED, false);
				this._oViewProperties.setProperty(oGeneralViewPropConstants.NAVTOEDIT_ALLOWED, !this.hasPendingChangesForOtherNotification({
					sObjectKey: oNotification.NotificationNumber
				}));

				//this.getAppController().setPropUserValid.apply(this);
			} else {
				this._oViewProperties.setProperty(oGeneralViewPropConstants.GPS_DATA_AVAILABLE, false);
				this._oViewProperties.setProperty(oGeneralViewPropConstants.VALID_USER_GIVEN, false);
				this._oViewProperties.setProperty(oGeneralViewPropConstants.TECHNICAL_OBJECT_VALID, false);
				this._oViewProperties.setProperty(oGeneralViewPropConstants.CHANGE_ALLOWED, false);
				this._oViewProperties.setProperty(oGeneralViewPropConstants.NAVTOEDIT_ALLOWED, false);
			}
		},

		/**
		 * Binds the view to the object path.
		 *
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView: function (sObjectPath) {

			var that = this;

			this.getView().setModel(this.getModel("EAM_NTF_CREATE"));

			this.getView().bindElement({
				path: sObjectPath,
				parameters: {
					expand: "LongText01"
			},
				events: {
					change: function () {
						that.setAppUnBusy();
					},
					dataRequested: function () {
						that.setAppBusyComplex({
							delay: 0
						});
					},
					dataReceived: function () {
						that.setAppUnBusy();
						var oElementBinding = that.getView().getElementBinding();

						// No data for the binding
						if (!oElementBinding.getBoundContext()) {
							that.getRouter().getTargets().display("objectNotFound");
							return;
						}

						that._refreshViewPropertiesModel();
						that._oDataHelper.countOpenNotifications(that.getObject(), that._oViewProperties, that.getView().getModel());
					}
				}
			});

			// Checks if the binding context is already available locally. If so, refreshes the binding and retrieves the
			// data from backend again.
			var oBindingContext = this.getView().getBindingContext();
			if (oBindingContext && oBindingContext.getPath() === sObjectPath) {
				this.getView().getElementBinding().refresh();
			}

		}

	});

});