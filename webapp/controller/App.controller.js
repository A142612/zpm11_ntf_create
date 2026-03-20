sap.ui.define([
   "pm11/zpm11nftcreate/util/Constants",
		"pm11/zpm11nftcreate/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"pm11/zpm11nftcreate/util/Notifications",
		"pm11/zpm11nftcreate/util/Util"
], (CONSTANTS, BaseController, JSONModel, Notifications, Util) => {
  "use strict";

  return BaseController.extend("pm11.zpm11nftcreate.controller.App", {
    _oAppModel: {}, // Application-Model
		_oDataHelper: {}, // instance of util.Notifications used to perform explicit backend calls
		_oUtil: {}, // Singleton for Utility-Methods
		_oMessagePopover: null,
		_oLastSavedInnerAppData: null,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * onInit:
		 * @public
		 */
		onInit: function() {
			var oAppModel;
			var fnSetAppNotBusy;
			var iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oAppModel = this._oAppModel = this.getModel(CONSTANTS.MODEL.APP_MODEL.NAME);
		//	this.setAppBusy();				

 			// enable/disable camera + gps-features + barcode + attachments		
			oAppModel.setProperty(CONSTANTS.MODEL.APP_MODEL.PROPERTIES.CAMERA_AVAILABLE, this.isFunctionAvailable("navigator.camera"));
			oAppModel.setProperty(CONSTANTS.MODEL.APP_MODEL.PROPERTIES.GPS_AVAILABLE, this.isFunctionAvailable("navigator.geolocation"));
			oAppModel.setProperty(CONSTANTS.MODEL.APP_MODEL.PROPERTIES.BARCODE_AVAILABLE, this.isFunctionAvailable(
				"cordova.plugins.barcodeScanner"));
			oAppModel.setProperty(CONSTANTS.MODEL.APP_MODEL.PROPERTIES.ATTACHMENTS_AVAILABLE, true);

			fnSetAppNotBusy = function() {
				this.setAppBusyComplex({
					setBusy: false,
					delay: iOriginalBusyDelay
				});					
			};

			// stop the busy indicator as soon as metadata was loaded
			this.getModel().metadataLoaded()
				.then((fnSetAppNotBusy).bind(this), (fnSetAppNotBusy).bind(this));

			// provide Utilities
			this.getView().loaded().then(function() {
				this._oDataHelper = new Notifications(this.getOwnerComponent(), this.getView());
			}.bind(this));
			this._oUtil = new Util();

			// Create Message Popover for Error Handling => new Message Handling Concept
			this._oMessagePopover = new sap.m.MessagePopover({
				items: {
					path: "message>/",
					template: new sap.m.MessagePopoverItem({
						description: "{message>description}",
						type: "{message>type}",
						title: "{message>message}"
					})
				}
			});
			this._oMessagePopover.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
			this.getOwnerComponent().setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");

		},
  });
});