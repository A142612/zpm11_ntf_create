/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem"
], function (Controller, MessagePopover, MessagePopoverItem) {
	"use strict";

	return Controller.extend("pm11.zpm11nftcreate.controller.BaseController", {

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

		}
	});
});