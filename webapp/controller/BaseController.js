/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"sap/ui/core/routing/History",
	"pm11/zpm11nftcreate/util/Constants",
	"sap/m/MessageBox"
], function (Controller, MessagePopover, MessagePopoverItem, History, CONSTANTS, MessageBox) {
	"use strict";

	return Controller.extend("pm11.zpm11nftcreate.controller.BaseController", {

		_oLastSavedInnerAppData: {},
		_oError: {},

		/**
		 * returns the router instance
		 */
		getRouter: function () {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},
		/** 
		 * Event handler to open the message popover to display the messages in the message model
		 * @public
		 * @param oEvent
		 */
		onMessagesButtonPress: function (oEvent) {
			var oMessagesButton = oEvent.getSource();
			if (!this._messagePopover) {
				this._messagePopover = new MessagePopover({
					items: {
						path: "message>/",
						template: new MessagePopoverItem({
							description: "{message>description}",
							type: "{message>type}",
							title: "{message>message}"
						})
					}
				});
				oMessagesButton.addDependent(this._messagePopover);
			}
			this._messagePopover.toggle(oMessagesButton);
		},
		/** 
		 * clears the model changes and removes all messages
		 * @param oModel
		 */
		getCleanState: function (oModel) {
			oModel.resetChanges();
			sap.ui.getCore().getMessageManager().removeAllMessages();
		},
		/**
		 * @param  {String} sEntityName
		 * @returns {Promise} oPromise resolves the binding context for sEntityName
		 */
		parentBindingContextAvailable: function (sEntityName) {
			var that = this;

			return new Promise(function (resolve, reject) {
				var fnOnRequestCompleted = function () {
					var oBindingContext = this.getView().getParent().getBindingContext();

					if (!oBindingContext) {
						return;
					}

					if (jQuery.sap.startsWith(oBindingContext.getPath(), "/" + sEntityName)) {
						this.getOwnerComponent().getModel().detachRequestCompleted(fnOnRequestCompleted, this);
						resolve(this.getView().getParent().getBindingContext());
					}
				};

				if (that.getView().getParent().getBindingContext() === undefined) {
					try {
						var oModel = that.getOwnerComponent().getModel();
					} catch (e) {
						reject();
					}

					oModel.attachRequestCompleted(fnOnRequestCompleted, that);
				} else {
					// can resolve right away, no need to wait
					resolve(that.getView().getParent().getBindingContext());
				}
			});
		},

		/**
		 * Initialize the attachment service component
		 * @public
		 * @param {string} sMode - attachment service mode (Create, Edit, Display)
		 * @param {string} sComponentContainerId - Id of attachment component container
		 * @param {string} sComponentId - Id of attachment component
		 * @param {string} sObjectKey - DMS Object key 
		 * @param {function} fnOnUpload - Handle upload
		 * @return {sap.ui.core.ComponentContainer}
		 */
		initAttachmentComponent: function (oSettings, sContainerId) {
			var that = this;
			var oAttachmentComponentPromise = this.getOwnerComponent().createComponent({
				usage: "attachmentReuseComponent",
				id : this.createId("ASComponent"),
				settings: oSettings
			});
			return oAttachmentComponentPromise.then(function (oCreatedAttachmentComponent) {
				that.byId(sContainerId).setComponent(oCreatedAttachmentComponent);
				return oCreatedAttachmentComponent;
			});

		},
			

		/**
		 * Convenience method for accessing the event bus.
		 * @public
		 * @returns {sap.ui.core.EventBus} the event bus for this component
		 */
		getEventBus: function() {
			return this.getOwnerComponent().getEventBus();
		},

		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		//getRouter: function() {
		//	return sap.ui.core.UIComponent.getRouterFor(this);
	//	},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function(sName) {
			var oModel = this.getView().getModel(sName);
			if (!oModel) {
				oModel = this.getOwnerComponent().getModel(sName);
			}
			return oModel;
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function(oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function() {
			var oObject = this.getOwnerComponent() ? this.getOwnerComponent() : sap.ui.getCore();
			return oObject.getModel("i18n").getResourceBundle();
		},

		/**
		 * Getter for the central App-Controller of this Application.
		 *
		 * @public
		 * @returns {i2d.eam.pmnotification.create.controller.App} the appController
		 */
		getAppController: function() {
			return this.getOwnerComponent().oRootView.getController();
		},

		/**
		 * Getter for the central Utility for OData-Handling.
		 *
		 * @public
		 * @returns {i2d.eam.pmnotification.create.util.Notifications} the OData-Helper
		 */
		getODataHelper: function() {
			return this.getAppController().getODataHelper();
		},

		/**
		 * Getter for the central Utility Instance (launch Popovers etc.).
		 *
		 * @public
		 * @returns {i2d.eam.pmnotification.create.util.Util} the Utility-instance
		 */
		getUtil: function() {
			return this.getAppController().getUtil();
		},

		/**
		 * Getter for the Message Popover (displays messages from "central" message model).
		 *
		 * @public
		 * @returns {sap.m.MessagePopover} MessagePopover-Object
		 */
		getMessagePopover: function() {
			return this.getAppController().getMessagePopover();
		},

		/**
		 * Getter for retrieval of the Object via Binding context of the current view.
		 *
		 * @public
		 * @returns {} Current Object
		 */
		getObject: function() {
			return this.getView().getBindingContext() ? this.getView().getBindingContext().getObject() : null;
		},

		/**
		 * Navigates back in the browser history, if the entry was created by this app.
		 * If not, it navigates to a route passed to this function.
		 *
		 * @public
		 * @param {string} [sRoute] the name of the route if there is no history entry
		 * @param {object} [mData] the parameters of the route, if the route does not need parameters, it may be omitted.
		 * @param {boolean} [bReplace] defines if the hash should be replaced (no browser history entry) or set (browser history entry)
		 *
		 */
		navBack: function(sRoute, mData, bReplace) {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();
			var oCrossAppNavigator = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("CrossApplicationNavigation");

			if (typeof(sPreviousHash) !== "undefined") {
				// The history contains a previous entry
				history.go(-1);
			} else {
				if ((sRoute === "" || typeof(sRoute) === "undefined") && oCrossAppNavigator) {
					// Navigate back to FLP home
					oCrossAppNavigator.toExternal({
						target: {
							shellHash: "#"
						}
					});
				} else {
					// Otherwise we go backwards with a forward history
					if (typeof(bReplace) === "undefined") {
						bReplace = true;
					}
					this.navTo(sRoute, mData, bReplace);
				}
			}
		},

		/**
		 * Navigates to a route passed to this function.
		 *
		 * @public
		 * @param {string} sRoute the name of the route if there is no history entry
		 * @param {object} mData the parameters of the route
		 * @param {boolean} bReplace defines if the hash should be replaced (no browser history entry) or set (browser history entry)
		 */
		navTo: function(sRoute, mData, bReplace) {

			if (typeof bReplace === "undefined") {
				bReplace = false;
			}
			this.getRouter().navTo(sRoute, mData, bReplace);
		},

		/**
		 * central function to manipulate the App busy indicator
		 *
		 * @public
		 * @param {object} settings for busy indicator (delay and setBusy)
		 */
		setAppBusyComplex: function(oSettings) {

			this._setBusy(oSettings);

		},

		/**
		 * central function to manipulate the App busy indicator
		 *
		 * @public
		 * @param {object} settings for busy indicator (delay and setBusy)
		 */
		setAppBusy: function() {

			var oSettings = {
				setBusy: true
			};

			this._setBusy(oSettings);

		},

		/**
		 * central function to manipulate the App busy indicator
		 *
		 * @public
		 * @param {object} settings for busy indicator (delay and setBusy)
		 */
		setAppUnBusy: function() {

			var oSettings = {
				setBusy: false,
				delay: 0
			};

			this._setBusy(oSettings);

		},

		/**
		 * central function to manipulate the busy indicator
		 *
		 * @private
		 * @param {object} oSettings settings for busy indicator (delay and setNotBusy)
		 */
		_setBusy: function(oSettings) {

			var oModel = this.getModel(CONSTANTS.MODEL.APP_MODEL.NAME);
			var iDelay = CONSTANTS.GENERAL.BUSY_INDICATOR_DELAY,
				bSetBusy = true;

			if (oSettings) {
				iDelay = oSettings.delay || iDelay;
				bSetBusy = typeof(oSettings.setBusy) === "undefined" ? bSetBusy : oSettings.setBusy;
			}

			oModel.setProperty(CONSTANTS.MODEL.APP_MODEL.PROPERTIES.IS_BUSY, bSetBusy);
			oModel.setProperty(CONSTANTS.MODEL.APP_MODEL.PROPERTIES.DELAY, iDelay);

		},

		/**
		 * Checks whether a given namespace exists.
		 *
		 * @public
		 * @param {string} [sPluginName] the namespace to be checked
		 * @return {boolean} namespace exits?
		 */
		isFunctionAvailable: function(sPluginName) {

			try {
				return (typeof this._namespaceExists(sPluginName) !== "undefined");
			} catch (e) {
				return false;
			}
		},

		/**
		 * evaluates the given PluginName (namespace) and returns the object if available
		 * @param {string} [sPluginName]
		 * @return {object} object for given namespace
		 * @public
		 */
		getPlugin: function(sPluginName) {
			try {
				return this._namespaceExists(sPluginName);
			} catch (e) {
				return null;
			}
		},

		/**
		 * Checks if there arwe already pending changes for another Notification
		 *
		 * @param {string}   notificationNumber
		 * @return {boolean} there are other changes
		 * @public
		 */
		hasPendingChangesForOtherNotification: function(mParams) {
			var oChanges;
			var bHasPendingChanges = false;

			if (this.getModel().hasPendingChanges()) {
				if (mParams) {
					// check by paths
					if (mParams.oPaths) {

						var oPaths = mParams.oPaths;
						if (typeof oPaths === "undefined") {
							bHasPendingChanges = true;
						} else {
							oChanges = this.getModel().getPendingChanges();

							for (var sChangedEntityPath in oChanges) {

								bHasPendingChanges = (typeof oPaths[sChangedEntityPath] === "undefined") ? true : false;
								if (bHasPendingChanges) {
									break;
								}
							}
						}

						// check with objectkey
					} else if (mParams.sObjectKey) {
						var sCurrentObjectKey = mParams.sObjectKey;

						if (typeof sCurrentObjectKey === "undefined" || sCurrentObjectKey === "") {
							bHasPendingChanges = true;
						} else {
							oChanges = this.getModel().getPendingChanges();

							for (var sChangedEntityPath2 in oChanges) {
								var sObjectKey = "";

								if (/\'(.*?)\'/.test(sChangedEntityPath2)) {
									sObjectKey = /\'(.*?)\'/.exec(sChangedEntityPath2)[1];
								}

								if (sObjectKey !== sCurrentObjectKey) {
									bHasPendingChanges = true;
									break;
								}
							}
						}
					} else {
						bHasPendingChanges = true;
					}
				} else {
					bHasPendingChanges = true;
				}
			}
			return bHasPendingChanges;
		},

		/**
		 * Retrieves an property of an object given as string:
		 * e.g. var sPos = this.objectByString(oEventSpotChanged, "mParameters.data.Data.Merge.N[0].E[0].P"); // sPos = oEventSpotChanged.mParameters.data.Data.Merge.N[0].E[0].P
		 *
		 * @param {object} [o] the object
		 * @param {string} [s] the property to retrieve
		 * @return {object} the property if found
		 * @public
		 */
		objectByString: function(o, s) {
			s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
			s = s.replace(/^\./, ''); // strip a leading dot
			var a = s.split('.');
			for (var i = 0, n = a.length; i < n; ++i) {
				var k = a[i];
				if (k in o) {
					o = o[k];
				} else {
					return null;
				}
			}
			return o;
		},

		/**
		 * Checks whether the given userID is valid
		 * @param {string} [sUserID] User ID to be checked
		 * @return {boolean} user is valid?
		 * @public
		 */
		isUserIDValid: function(sUserID) {

			return (typeof sUserID !== "undefined" && sUserID !== "") ? true : false;
		},

		/**
		 * evaluates the given namespace and returns the object if available
		 * @param {string} [namespace]
		 * @return {object} object for the given namespace
		 * @private
		 */
		_namespaceExists: function(namespace) {
			var tokens = namespace.split(".");
			return tokens.reduce(function(prev, curr) {
				return (typeof prev === "undefined") ? prev : prev[curr];
			}, window);
		},

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function(mParams) {
			var sMailReceiver = null;
			var bImmediateHashReplace;

			if (mParams && typeof mParams.sReceiver === "string") {
				sMailReceiver = mParams.sReceiver;
			}

			if (mParams && typeof mParams.bImmediateHashReplace === "boolean") {
				bImmediateHashReplace = mParams.bImmediateHashReplace;
			}

			var fnSendMail = function() {
				var sSubject, sBody;
				var sNotificationNumber = (this.getObject() && this.getObject().NotificationNumber) ? this.getObject().NotificationNumber : "";
				var sShortText = (this.getObject() && this.getObject().ShortText) ? this.getObject().ShortText : "";

				// add the notification number if available
				if (sNotificationNumber !== "") {
					sSubject = this.getResourceBundle().getText("xtit.shareSendEmailObjectSubjectNotification", [sNotificationNumber]);
					sBody = this.getResourceBundle().getText("ymsg.shareSendEmailObjectMessageNotification", [sNotificationNumber, sShortText]);
				} else {
					sSubject = this.getResourceBundle().getText("xtit.shareSendEmailObjectSubjectNoNotification", [sShortText]);
					sBody = this.getResourceBundle().getText("ymsg.shareSendEmailObjectMessageNoNotification", [sShortText]);
				}

				// ==> add the technical object type
				sBody = sBody + "\r\n";
				if (this.getObject().TechnicalObjectNumber) {
					sBody = sBody + (this.getObject().TechnicalObjectType === "EAMS_EQUI" ? this.getResourceBundle().getText("xtit.equipment") : this
						.getResourceBundle().getText("xtit.floc"));
					sBody = sBody + ": " + this.getObject().TechnicalObjectNumber + " (" + this.getObject().TechnicalObjectDescription + ") \r\n";
				}

				// ==> add the notification type
				if (this.getObject().NotificationType) {
					sBody = sBody + this.getResourceBundle().getText("xfld.notificationType");

					// in create/edit mode the type-description has to be retrieved from the  NotificationTypeSet whereas display requires the description from the notificationheader because the set is not retrieved
					if (this.getModel().getObject("/NotificationTypeSet('" + this.getObject().NotificationType + "')")) {
						sBody = sBody + ": " + this.getModel().getObject("/NotificationTypeSet('" + this.getObject().NotificationType + "')").Description +
							"(" + this.getObject().NotificationType + ") \r\n";
					} else {
						sBody = sBody + ": " + this.getObject().NotificationTypeText + " (" + this.getObject().NotificationType + ") \r\n";
					}
				}

				// add the location
				if (this.getObject().Location) {
					sBody = sBody + this.getResourceBundle().getText("xfld.location");
					sBody = sBody + ": " + this.getObject().Location + " \r\n";
				}

				// add the effect
				if (this.getObject().Effect && this.getObject().Effect !== "") {
					sBody = sBody + this.getResourceBundle().getText("xfld.effect");

					// in create/edit mode the effect-text has to be retrieved from the  MalfunctionEffectSet whereas display requires the text from the notificationheader because the set is not retrieved
					if (this.getModel().getObject("/MalfunctionEffectSet('" + this.getObject().Effect + "')")) {
						sBody = sBody + ": " + this.getModel().getObject("/MalfunctionEffectSet('" + this.getObject().Effect + "')").EffectText + "(" +
							this.getObject().Effect + ") \r\n";
					} else {
						sBody = sBody + ": " + this.getObject().EffectText + " (" + this.getObject().Effect + ") \r\n";
					}
				}

				sBody = sBody + "\r\n" + location.href + "\r\n";

				sap.m.URLHelper.triggerEmail(
					sMailReceiver,
					sSubject,
					sBody
				);
			}.bind(this);

			if (this.getCurrentAppState) {
				var oStoreAppStatePromise = this.storeCurrentAppState((this.getCurrentAppState).bind(this), bImmediateHashReplace);

				oStoreAppStatePromise.fail(function() {
					fnSendMail();
				});

				oStoreAppStatePromise.done(function() {
					fnSendMail();
				});

			} else {
				fnSendMail();
			}

		},

		/* ===========================================================  */
		/* AppState-Handling                                            */
		/* ===========================================================  */

		/**
		 * Initiation of variables for inner AppState handling
		 * called whenever before AppState will be applied to view  
		 * @public
		 */
		initVars: function() {
			this.IAPP_STATE = "sap-iapp-state";
			this._oLastSavedInnerAppData = {
				sAppStateKey: "",
				oAppData: {},
				iCacheHit: 0,
				iCacheMiss: 0
			};
			this._rIAppStateOld = new RegExp("/" + this.IAPP_STATE + "=([^/?]+)");
			this._rIAppStateOldAtStart = new RegExp("^" + this.IAPP_STATE + "=([^/?]+)");
			this._rIAppStateNew = new RegExp("[\?&]" + this.IAPP_STATE + "=([^&]+)");

			if (!this._oCrossAppNavService && sap.ushell.Container) {
				this._oCrossAppNavService = sap.ushell.Container.getService("CrossApplicationNavigation");
			}
			this._oComponent = this.getOwnerComponent();
			this._bAppStateInitialized = true;
		},

		/**
		 * Invalidates the app state (after bookmark button was pressed)  
		 * @public
		 */
		invalidateAppStateForFurtherUse: function() {
			if (this._oAppState) {
				this._oAppState = null;
			}
		},

		/**
		 * Changes the URL according to the current app state and stores the app state for later retrieval.
		 * @public
		 * @return {object}  promise object for Application State
		 */
		storeCurrentAppState: function(fnGetCurrentAppState, bImmediateHashReplace) {

			// initialize needed vars for appState-Handling
			if (!this._bAppStateInitialized) {
				this.initVars();
			}

			// retrieve the current state from the implementing controller    
			var oAppStatePromise = this._storeInnerAppState(fnGetCurrentAppState(), bImmediateHashReplace);
			oAppStatePromise.fail(function() {
				this.handleError();
			}.bind(this));
			return oAppStatePromise;
		},

		/**
		 * Parses the incoming URL and gives back a promise. The inner app state is returned in the resolved promise. 
		 * @returns {object} a Promise object to observe when all actions of the function have finished. On success the extracted app state,
		 * URL parameters and the type of navigation are returned. On error an error object of type {@link sap.fin.central.lib.error.Error},
		 * URL parameters (if available) and the type of navigation are returned. The navigation type is an enumeration type of kind
		 * {@link sap.fin.central.lib.nav.NavType} (possible values are initial, URLParams, xAppState, and iAppState).
		 * @public
		 */
		parseNavigation: function() {

			var sAppHash = this.getRouter().oHashChanger.getHash();
			/* use .getHash() here instead of .getAppHash() to also be able dealing with
			 * environments where only SAPUI5 is loaded and the UShell is not initialized properly.
			 */
			var sIAppState = this._getInnerAppStateKey(sAppHash);

			var oMyDeferred = jQuery.Deferred();

			if (sIAppState) {
				// inner app state is available in the AppHash; extract the parameter value
				this._loadAppState(sIAppState, oMyDeferred);

			} else {
				oMyDeferred.resolve({}, {}, CONSTANTS.ROUTES.NavType.initial);
			}

			return oMyDeferred.promise();
		},

		/**
		 * shows MessageBox with data from object _oError
		 * @public
		 */
		handleError: function() {

			MessageBox.show(
				this._oError.sMessage, {
					icon: this._oError.sIcon,
					title: this.getResourceBundle().getText("xtit.error"),
					// details: this._oError.sErrorCode,
					styleClass: this._oComponent.getCompactCozyClass(),
					actions: [MessageBox.Action.CLOSE]
				}
			);
		},

		/**
		 * Changes the URL according to the current inner app state and stores the app state for later retrieval.
		 * @private
		 * @return {object}  promise object for resolving when AppState stored
		 */
		_storeInnerAppState: function(mInnerAppData, bImmediateHashReplace) {

			if (typeof bImmediateHashReplace !== "boolean") {
				bImmediateHashReplace = true; //default
			}
			var that = this;
			var oMyDeferred = jQuery.Deferred();

			//replace hash and change URL based on new AppState Key
			var fnReplaceHash = function(sAppStateKey) {
				var sAppHashOld = that.getRouter().oHashChanger.getHash();
				var sAppHashNew = that._replaceInnerAppStateKey(sAppHashOld, sAppStateKey);
				that.getRouter().oHashChanger.replaceHash(sAppHashNew);
			};

			//check if we already saved the same data
			var sAppStateKeyCached = this._oLastSavedInnerAppData.sAppStateKey;
			var bInnerAppDataEqual = (JSON.stringify(mInnerAppData) === JSON.stringify(this._oLastSavedInnerAppData.oAppData));
			if (bInnerAppDataEqual && sAppStateKeyCached) {
				// passed inner app state found in cache
				//this._oLastSavedInnerAppData.iCacheHit++;

				//replace inner app hash with cached appStateKey in url (just in case the app has changed the hash in meantime)
				fnReplaceHash(sAppStateKeyCached);
				oMyDeferred.resolve(sAppStateKeyCached);
				return oMyDeferred.promise();
			}

			// passed inner app state not found in cache
			//this._oLastSavedInnerAppData.iCacheMiss++;

			var fnOnAfterSave = function(sAppStateKey) {

				//replace inner app hash with new appStateKey in url
				if (!bImmediateHashReplace) {
					fnReplaceHash(sAppStateKey);
				}

				//remember last saved state
				that._oLastSavedInnerAppData.oAppData = mInnerAppData;
				that._oLastSavedInnerAppData.sAppStateKey = sAppStateKey;
				oMyDeferred.resolve(sAppStateKey);
			};

			var fnOnError = function() {
				oMyDeferred.reject();
			};

			if (this._oCrossAppNavService) {
				var sAppStateKeyAfterSave = this._saveAppState(mInnerAppData, fnOnAfterSave, fnOnError);
			}

			/* Note that _saveAppState may return 'undefined' in case that the parsing
			 * has failed. In this case, we should not trigger the replacement of the App Hash
			 * with the generated key, as the container was not written before.
			 * Note as well that the error handling has already happened before by
			 * making the oMyDeferred promise fail (see fnOnError above).
			 */
			if (typeof sAppStateKeyAfterSave !== "undefined" && sAppStateKeyAfterSave !== "") {
				//replace inner app hash with new appStateKey in url
				//note: we do not wait for the save to be completed: this asynchronously behaviour is necessary if
				//this method is called e.g. in a onLinkPressed event with no possibility to wait for the promise resolution
				if (bImmediateHashReplace) {
					fnReplaceHash(sAppStateKeyAfterSave);
				}
			}

			return oMyDeferred.promise();
		},

		/**
		 * Saves app state and processes success and error functions after successful save
		 * @param {object} oAppData App data to be saved
		 * @param {function} fnOnAfterSave function to be executed after saving app state
		 * @param {function} fnOnError function to be executed after error saving app state
		 * @returns {string} app state key 
		 * @private
		 */
		_saveAppState: function(oAppData, fnOnAfterSave, fnOnError) {

			if (!this._oAppState) {
				this._oAppState = this._oCrossAppNavService.createEmptyAppState(this.getOwnerComponent());
			}
			var sAppStateKey = this._oAppState.getKey();
			var oAppDataForSave = {};

			for (var sAttribut in oAppData) {
				oAppDataForSave[sAttribut] = oAppData[sAttribut];
			}

			this._oAppState.setData(oAppDataForSave);
			var oSavePromise = this._oAppState.save();

			if (fnOnAfterSave) {
				oSavePromise.done(function() {
					fnOnAfterSave(sAppStateKey);
				});
			}

			if (fnOnError) {
				var that = this;
				oSavePromise.fail(function() {
					//error handling
					that._createTechnicalError(this.getResourceBundle().getText("ymsg.errorSaveAppState"), "AppStateSave.failed");
					fnOnError();
				});
			}
			return sAppStateKey;
		},

		/**
		 * replaces App State Key in Hash with new App State Key
		 * @param {string} sAppHash App Hash
		 * @param {string} sAppStateKey App state key
		 * @returns {string} new App Hash with new App State Key 
		 * @private
		 */
		_replaceInnerAppStateKey: function(sAppHash, sAppStateKey) {
			var sNewIAppState = this.IAPP_STATE + "=" + sAppStateKey;

			/*
			 * generate sap-iapp-states with the new way
			 */
			if (!sAppHash) {
				// there's no sAppHash key yet
				return "?" + sNewIAppState;
			}

			var fnAppendToQueryParameter = function(sAppHashLocal) {
				// there is an AppHash available, but it does not contain a sap-iapp-state parameter yet - we need to append one

				// new approach: we need to check, if a set of query parameters is already available
				if (sAppHashLocal.indexOf("?") !== -1) {
					// there are already query parameters available - append it as another parameter
					return sAppHashLocal + "&" + sNewIAppState;
				}
				// there are no a query parameters available yet; create a set with a single parameter
				return sAppHashLocal + "?" + sNewIAppState;
			};

			if (!this._getInnerAppStateKey(sAppHash)) {
				return fnAppendToQueryParameter(sAppHash);
			}
			// There is an AppHash available and there is already an sap-iapp-state in the AppHash

			if (this._rIAppStateNew.test(sAppHash)) {
				// the new approach is being used
				return sAppHash.replace(this._rIAppStateNew, function(sNeedle) {
					return sNeedle.replace(/=.*/ig, "=" + sAppStateKey);
				});
			}

			// we need to remove the old AppHash entirely and replace it with a new one.

			var fnReplaceOldApproach = function(rOldApproach, sAppHashLocal) {
				sAppHashLocal = sAppHashLocal.replace(rOldApproach, "");
				return fnAppendToQueryParameter(sAppHashLocal);
			};

			if (this._rIAppStateOld.test(sAppHash)) {
				return fnReplaceOldApproach(this._rIAppStateOld, sAppHash);
			}

			if (this._rIAppStateOldAtStart.test(sAppHash)) {
				return fnReplaceOldApproach(this._rIAppStateOldAtStart, sAppHash);
			}

			jQuery.sap.assert(false, "internal inconsistency: Approach of sap-iapp-state not known, but _getInnerAppStateKey returned it");
			return "";
		},

		/**
		 * retrieves the parameter value of the sap-iapp-state (the internal apps) from the AppHash string.
		 * It automatically takes care about compatibility between the old and the new approach of
		 * the sap-iapp-state. Precedence is that the new approach is favoured against the old approach.
		 * @param {string} sAppHash the AppHash, which may contain a sap-iapp-state parameter (both old and/or new approach)
		 * @return {string} the value of sap-iapp-state (i.e. the name of the container to retrieve the parameters), 
		 * or <code>undefined</code> in case that no sap-iapp-state was found in <code>sAppHash</code>.
		 * @private
		 */
		_getInnerAppStateKey: function(sAppHash) {

			// trivial case: no app hash available at all.
			if (!sAppHash) {
				return;
			}

			/* new approach: separated via question mark / part of the query parameter of the AppHash */
			var aMatches = this._rIAppStateNew.exec(sAppHash);

			/* old approach: spearated via slashes / i.e. part of the route itself */
			if (aMatches === null) {
				aMatches = this._rIAppStateOld.exec(sAppHash);
			}

			/* old approach: special case: if there is no deep route/key defined, the sap-iapp-state may be at the beginning
			 * of the string, without any separation with the slashes
			 */
			if (aMatches === null) {
				aMatches = this._rIAppStateOldAtStart.exec(sAppHash);
			}

			if (aMatches === null) {
				// there is no (valid) sap-iapp-state in the App Hash
				return;
			}

			/*eslint-disable */
			return aMatches[1];
			/*eslint-enable */
		},

		/**
		 * loads app state based on app state key
		 * @param {string} sAppStateKey the App state key
		 * @param {object} oDeferred object for promise handling in calling function
		 * @private
		 */
		_loadAppState: function(sAppStateKey, oDeferred) {

			if (!this._oCrossAppNavService) {
				oDeferred.resolve({}, {}, CONSTANTS.ROUTES.NavType.initial);
			}
			var oAppStatePromise = this._oCrossAppNavService.getAppState(this._oComponent, sAppStateKey);
			var that = this;

			oAppStatePromise.done(function(oAppState) {

				var oAppData = {};
				var oAppDataLoaded = oAppState.getData();

				if (typeof oAppDataLoaded === "undefined") {
					that._createTechnicalError(this.getResourceBundle().getText("ymsg.errorLoadAppState"), "getDataFromAppState.failed");
					oDeferred.reject({}, CONSTANTS.ROUTES.NavType.iAppState);
				} else {
					for (var sAttribut in oAppDataLoaded) {
						oAppData[sAttribut] = oAppDataLoaded[sAttribut];
					}
				}

				//resolve is called on passed Deferred object to trigger a call of the done method, if implemented
				//the done method will receive the loaded appState and the navigation type as parameters
				oDeferred.resolve(oAppData, {}, CONSTANTS.ROUTES.NavType.iAppState);
			});
			oAppStatePromise.fail(function() {
				that._createTechnicalError(this.getResourceBundle().getText("ymsg.errorLoadAppState"), "getAppState.failed");
				oDeferred.reject({}, CONSTANTS.ROUTES.NavType.iAppState);
			});
		},

		/**
		 * creates technical error object, which can be used to show a MessageBox
		 * @param {string} sErrorCode the error code, possible values see below
		 * @private
		 */
		_createTechnicalError: function(sMessage, sErrorCode) {

			this._oError.sMessage = sMessage;
			this._oError.sIcon = MessageBox.Icon.ERROR;
			this._oError.sErrorCode = sErrorCode;

		},
		/**
		 * Initiates attachment component
		 * @param {object}  Attachment Component
		 * @param {object}  Attachment mode (display, edit), Attachment object type, Attachment object key
		 * @param {string} Container Id where to put Attachment Component
		 * @return {object} Attachment component
		 * @private
		 */
		 
		_initAttachmentComponent: function(oAttachmentComponent, oSettings, sContainerId) {
			if (!oAttachmentComponent) {
				var that = this;
				var oAttachmentComponentPromise = this.getOwnerComponent().createComponent({
					usage: "attachmentReuseComponent",
					settings: oSettings
				});
				return oAttachmentComponentPromise.then(function(oCreatedAttachmentComponent) {
					that.byId(sContainerId).setComponent(oCreatedAttachmentComponent);
					return oCreatedAttachmentComponent;
				});
			} else {
				oAttachmentComponent.setMode(oSettings.mode);
				oAttachmentComponent.setObjectKey(oSettings.objectKey);
				oAttachmentComponent.setObjectType(oSettings.objectType);
				oAttachmentComponent.refresh(oSettings.mode, oSettings.objectType, oSettings.objectKey);
				return Promise.resolve(oAttachmentComponent);
			}

		}
	});
});