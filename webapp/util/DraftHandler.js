/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/generic/app/transaction/DraftContext",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/ui/core/format/DateFormat",
	"../util/Constants",
	"sap/base/Log"
], function (Object, DraftContext, History, Filter, FilterOperator, Sorter, DateFormat, Constants, Log) {
	"use strict";

	return Object.extend("pm11.zpm11nftcreate.util.DraftHandler", {

		oi18nBundle: null,
		oContext: null,
		_sDiscardAction: null,
		oMetaModel: null,

		/**
		 * Instantiate DraftHandler, a view-specific utility class for managing draft user experience
		 * @param {sap.ui.generic.app.ApplicationController} oApplicationController ApplicationController instance that manages draft persistence
		 * @param {sap.ui.core.mvc.View} oView View that this DraftHandler is created for
		 * @constructor
		 */
		constructor: function (oApplicationController, oView) {
			this.oApplicationController = oApplicationController;
			this.oDraftContext = new DraftContext(oView.getModel());
			this.oMetaModel = oView.getModel().getMetaModel();
			this.oView = oView;
			this.oIndicator = null;
			this.sEntity = null;
			this.oi18nBundle = oView.getModel("i18n").getResourceBundle();
			this._aObsoleteMessages = [];
			this._oFieldWatchers = {};
			this.oView.getModel().attachPropertyChange(this.fnPropertyChanged, this);
			this.oView.getModel().attachBatchRequestSent(this._onBatchRequestSent, this);
			this.oView.getModel().attachMessageChange(this._onMessageChange, this);
			this.oView.getModel().attachBatchRequestCompleted(this._onBatchRequestCompleted, this);

			this._checkContext();
		},
		fnPropertyChanged: function (oEvent) {
			var oContext = oEvent.getParameter("context");
			// Ignore all cases which are non-draft
			if (!this.oDraftContext.hasDraft(oContext)) {
				return;
			}
			// for parameters of function imports special paths are introduced in the model, that are not known in the metamodel
			// as we don't need a merge call for changes to these properties, we can just ignore them
			if (!this.oMetaModel.getODataEntitySet(oContext.getPath().split("(")[0].substring(1))) {
				return;
			}
			var sPath = oEvent.getParameter("path");
			// delegate the draft saving to the ApplicationController
			this.oApplicationController.propertyChanged(sPath, oContext).then(function (oEv) {
				Log.debug(oEv);
			}).catch(this.fnErrorHandler);
		},
		fnErrorHandler: function (oError) {
			Log.error(oError);
		},
		_checkContext: function (bRefresh) {
			if (!this.oContext) {
				delete this.sEntityPath;
				this.oContext = this.oView.getBindingContext();
			} else if (!bRefresh) {
				return;
			}

			if (this.oContext) {
				this.sEntityPath = this.oContext.getPath();
				this.sEntityPath = this.sEntityPath.substr(1, this.sEntityPath.indexOf("(") - 1);
				this._sDiscardAction = this.oDraftContext.getODataDraftFunctionImportName(this.oContext, "DiscardAction");
			}
		},

		registerDraftIndicator: function (oIndicator) {
			this.oIndicator = oIndicator;
			this.oIndicator.clearDraftState();
		},

		/**
		 *	Discards current draft, after user confirmed. Confirmation prompt is not shown for dialogs.
		 *	@param {sap.ui.core.Element} oControl Related control for popover. Usually the "Cancel" button. 
		 *  @param {boolean} bCreateDraft Indicator whether the popover is triggered for a create or edit draft.
		 *  @returns {Promise}
		 */
		confirmDiscardDraft: function (oControl, bCreateDraft) {
			var that = this;

			return new Promise(function (resolve) {

				var oPopover = new sap.m.Popover({
					placement: sap.m.PlacementType.VerticalPreferedTop,
					showHeader: false,
					content: [
						new sap.ui.layout.VerticalLayout({
							content: [
								new sap.m.Text({
									text: "{i18n>ymsg.confirmDraftDeletion}",
									width: "16rem"
								}),
								new sap.m.Button({
									tooltip: "{i18n>xbut.discard}",
									text: "{i18n>xbut.discard}",
									width: "100%",
									press: resolve
								})
							]
						})
					],
					afterClose: function () {
						oControl.removeDependent(oPopover);
						oPopover.destroy();
					}
				}).addStyleClass("sapUiContentPadding");

				oControl.addDependent(oPopover);
				oPopover.openBy(oControl);
			}).then(function () {
				that.oView.setBusy(true);
				var oDraftDiscarded = that.discard(that.oContext);

				that.showDraftDiscardedMessage(bCreateDraft);

				oDraftDiscarded.finally(function () {
					that.oView.setBusy(false);
					// no more history -- attempt to leave app
					// leaving app should only happen after the draft was deleted.
					// otherwise, the DELETE request might be cancelled.
					if (sap.ushell && sap.ushell.Container) {
						var oHistory = History.getInstance();
						if (oHistory.getPreviousHash() !== undefined) {
							window.history.back(-1);
						} else {
							// navigate to My work Requestrs
							var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
							if (oCrossAppNavigator) {
								oCrossAppNavigator.toExternal({
									target: {
										shellHash: "#Shell-home"
									}
								});
							}
						}
					}
				});

			});
		},

		discard: function (oContext) {
			var that = this;

			this.oContext = oContext;
			this._checkContext(true);

			return this._loadRootEntity()
				.then(function (oContextToDiscard) {
					return that.oApplicationController.getTransactionController().deleteEntity(oContextToDiscard, null, true /*Lenient*/ );;
				});
		},
		discardDraft: function (oContextToDiscard, mParameters, bIsLenient) {
			var oContext, sPath;
			if (typeof oContextToDiscard === "string") {
				sPath = oContextToDiscard;
			} else if (typeof oContextToDiscard === "object" && oContextToDiscard instanceof sap.ui.model.Context) {
				oContext = oContextToDiscard;
				sPath = oContext.getPath();
			}
			mParameters = mParameters || {};
			jQuery.extend(mParameters, {
				batchGroupId: "Changes",
				changeSetId: "Changes",
				successMsg: "Changes were discarded",
				failedMsg: "Discarding of changes failed",
				forceSubmit: true
			});

			var sHandling = "lenient";
			mParameters.headers = {
				Prefer: "handling=" + sHandling
			};
			oContext = new sap.ui.model.Context(this.oView.getModel(), sPath);
			this.oContext = oContext;
			this._checkContext(true);
			return this._callDiscard(oContext, mParameters);
		},
		_callDiscard: function (oContext, mParameters) {
			var sFunctionImportName = this.oDraftContext.getODataDraftFunctionImportName(oContext, "DiscardAction"),
				oModel = this.oView.getModel();
			mParameters.functionImport = this.oMetaModel.getODataFunctionImport(sFunctionImportName.split("/")[1]);
			mParameters.urlParameters = {
				MaintenanceNotification: "",
				IsActiveEntity: false,
				DraftUUID: oContext.getProperty("DraftUUID")
			};
			return new Promise(function (resolve, reject) {
				var sFunctionImport;
				sFunctionImport = "/" + mParameters.functionImport.name;
				oModel.callFunction(sFunctionImport, {
					method: mParameters.functionImport.httpMethod,
					urlParameters: mParameters.urlParameters,
					success: resolve,
					error: reject,
					batchGroupId: mParameters.batchGroupId,
					changeSetId: mParameters.changeSetId,
					headers: mParameters.headers,
					expand: mParameters.expand
				});
			});
		},
		activateDraft: function (oContextToSave) {
			return this.oApplicationController.getTransactionController().getDraftController().activateDraftEntity(
				oContextToSave, true /*LenientSave*/ );
		},
		_loadRootEntity: function () {
			var that = this;
			return new Promise(function (resolve, reject) {
				resolve(that.oContext.getPath());
			});
		},

		showDraftDiscardedMessage: function (bCreateDraft) {
			sap.m.MessageToast.show(this.oi18nBundle.getText("xmsg.draftDiscarded"));

		},

		_onMessageChange: function (oEvent) {
			var aMessages = oEvent.getParameter("newMessages"),
				oModel = this.oView.getModel(),
				fnOnChange = function (sTarget, sOldValue, sMessageId) {
					if (this.oView.getModel().getProperty(sTarget) !== sOldValue) {
						if (this._oFieldWatchers[sMessageId]) {
							this._oFieldWatchers[sMessageId].destroy();
							delete this._oFieldWatchers[sMessageId];
						}

						var oMessageManager = sap.ui.getCore().getMessageManager(),
							aCurrMessages = oMessageManager.getMessageModel().getProperty("/");

						for (var j in aCurrMessages) {
							if (aCurrMessages[j] && aCurrMessages[j].getId() === sMessageId) {
								oMessageManager.removeMessages(aMessages[j]);
								break;
							}
						}
					}
				};

			if (aMessages.length > 0) {
				for (var i in aMessages) {
					var sTarget = aMessages[i].getTarget(),
						sMessageId = aMessages[i].getId();

					// Ensure that the message is for a specific field:
					if (jQuery.sap.endsWith(sTarget, "/")) {
						continue;
					}

					this._oFieldWatchers[sMessageId] = new sap.ui.model.Binding(oModel, sTarget);
					this._oFieldWatchers[sMessageId].attachChange(jQuery.proxy(fnOnChange, this, sTarget, oModel.getProperty(sTarget), sMessageId));
				}
			}
		},

		_onBatchRequestSent: function (oEvent) {
			var aRequests = oEvent.getParameter("requests");
			this._checkContext();

			if (!this.oContext) {
				return;
			}

			for (var i in aRequests) {
				if (aRequests[i].method === "MERGE" &&
					aRequests[i].url.indexOf(this.sEntityPath) !== -1) {

					if (this.oIndicator && this.oIndicator.getState() !== sap.m.DraftIndicatorState.Saving) {
						this.showDraftSaving();

					}
				}
			}

		},
		showDraftSaved: function () {
			this.oIndicator.showDraftSaved();
			this.oIndicator.setState(sap.m.DraftIndicatorState.Saved);
		},
		showDraftSaving: function () {
			this.oIndicator.showDraftSaving();
			this.oIndicator.setState(sap.m.DraftIndicatorState.Saving);
		},

		_onBatchRequestCompleted: function (oEvent) {
			var aRequests = oEvent.getParameter("requests"),
				oResponse = oEvent.getParameter("response");

			if (!this.oContext) {
				return;
			}

			for (var i in aRequests) {
				if (aRequests[i].method === "MERGE" &&
					aRequests[i].url.indexOf(this.sEntityPath) !== -1) {

					if (this._aObsoleteMessages.length > 0) {
						// remove messages marked as obsolete
						sap.ui.getCore().getMessageManager().removeMessages(this._aObsoleteMessages);
						this._aObsoleteMessages = [];
					}

					if (this.oIndicator) {
						if (oResponse.statusCode > 400) {
							this.oIndicator.clearDraftState();
						} else if (this.oIndicator.getState() !== sap.m.DraftIndicatorState.Saved) {
							this.showDraftSaved();
						}
					}

				}
			}
		},

		destroy: function () {
			try {
				this.oView.getModel().detachBatchRequestSent(this._onBatchRequestSent, this);
				this.oView.getModel().detachBatchRequestCompleted(this._onBarchRequestCompleted, this);
			} finally {
				delete this.oApplicationController;
				delete this.oDraftContext;
				delete this.oContext;
				delete this.oIndicator;
				delete this.oView;
			}
		},

		/*
		 * Requests the latest existing draft of the current user from the back-end.
		 * @param {string} sUser SAP user id of the current user.
		 * @returns {Promise}
		 */
		getLatestDraftOfUser: function () {
			var that = this;
			return new Promise(function (resolve, reject) {
				that.oView.getModel().read("/" + Constants.ENTITY.WORK_REQUEST_TP, {
					filters: [new Filter({
							path: "IsActiveEntity",
							operator: FilterOperator.EQ,
							value1: "false"
						}), new Filter({
							path: "HasActiveEntity",
							operator: FilterOperator.EQ,
							value1: "false"
						}),
						new Filter({
							path: "MaintenanceNotification",
							operator: FilterOperator.EQ,
							value1: ""
						}),
						new Filter({
							path: "MaintEvtIsCreatedByCurrentUser",
							operator: FilterOperator.EQ,
							value1: true
						})
					],
					sorters: [new Sorter("LastChangeDateTime", true)],
					urlParameters: {
						"$select": "DraftUUID,LastChangeDateTime",
						"$top": "1",
						"$skip": "0"
					},
					success: function (oData) {
						if (oData.results && oData.results.length > 0) {
							resolve({
								DraftUUID: oData.results[0].DraftUUID,
								LastChangeDateTime: oData.results[0].LastChangeDateTime
							});
						} else {
							reject();
						}
					},
					error: function () {
						reject();
					}
				});
			});
		},

		/*
		 * Triggers a Dialog asking the user whether he wants to resume or discard his latest existing draft.
		 * @param {date} oLastChangeDateTime The last changed timestamp of the latest draft of the current user.
		 * @returns {Promise}
		 */
		resumeDraftDialog: function (oLastChangeDateTime) {
			var that = this;
			return new Promise(function (resolve, reject) {
				var oDialog = new sap.m.Dialog({
					contentWidth: "25rem",
					type: sap.m.DialogType.Message,
					title: "{i18n>xtit.resumeDraft}",
					content: [
						new sap.ui.layout.VerticalLayout({
							content: [new sap.m.Text({
									text: that.oi18nBundle.getText("ymsg.resumeCreateDraft", [
										DateFormat.getDateTimeInstance().format(oLastChangeDateTime)
									])
								}).addStyleClass("sapUiSmallMarginBottom"),
								new sap.m.Text({
									text: "{i18n>ymsg.resumeOrDiscard}"
								})
							]
						})
					],
					escapeHandler: function (oPromise) {
						that.oView.setBusy(true);
						resolve();
						oDialog.close();
						oPromise.resolve();
					},
				// beginButton: new sap.m.Button({
				// 		id: "createWrButtonResumeDraft",
				// 		tooltip: "{i18n>xbut.resume}",
				// 		text: "{i18n>xbut.resume}",
				// 		press: function () {
				// 			that.oView.setBusy(true);
				// 			resolve();
				// 			oDialog.close();
				// 		}
				// 	}),
				// 	endButton: new sap.m.Button({
				// 		id: "createWrButtonDiscardDraft",
				// 		tooltip: "{i18n>xbut.discard}",
				// 		text: "{i18n>xbut.discard}",
				// 		press: function () {
				// 			that.oView.setBusy(true);
				// 			reject();
				// 			oDialog.close();
				// 		}
				// 	}),
				//	Multi Draft: Adding My Drafts,Create Draft, Resume, Cancel buttons in buttons control array
					buttons : [
                new sap.m.Button({
                    id: "createWrButtonMyDraft",
						tooltip: "{i18n>xbut.myDrafts}",
						text: "{i18n>xbut.myDrafts}",
						press: function () {
							that.oView.setBusy(true);
							resolve("Draft");
							oDialog.close();
						}
                
                  }).addStyleClass("sapUiNoMarginEnd").addStyleClass("sapUiNoMarginBegin"),
                  new sap.m.Button({
                    id: "createWrButtonCancel",
						tooltip: "{i18n>xbut.createNew}",
						text: "{i18n>xbut.createNew}",
						press: function () {
							that.oView.setBusy(true);
							resolve("CreateNew");
							oDialog.close();
						}
                
                  }).addStyleClass("sapUiNoMarginEnd").addStyleClass("sapUiNoMarginBegin"),
                new sap.m.Button({  id: "createWrButtonResumeDraft",
						tooltip: "{i18n>xbut.resume}",
						text: "{i18n>xbut.resume}",
						press: function () {
							that.oView.setBusy(true);
							resolve("Resume");
							oDialog.close();
						}
                }).addStyleClass("sapUiNoMarginEnd").addStyleClass("sapUiNoMarginBegin"),
                new sap.m.Button({
                   	id: "createWrButtonDiscardDraft",
						tooltip: "{i18n>xbut.discard}",
						text: "{i18n>xbut.discard}",
						press: function () {
							that.oView.setBusy(true);
						//	reject();
							resolve("Discart");
							oDialog.close();
						}
                }).addStyleClass("sapUiNoMarginEnd").addStyleClass("sapUiNoMarginBegin")
            ]
				});
				that.oView.addDependent(oDialog);
				oDialog.open();
			});
		}

	});

});