/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
        "pm11/zpm11nftcreate/util/Constants",
		"sap/ui/base/Object",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/IconPool"

	], function(CONSTANTS, Object, JSONModel, IconPool) {
	"use strict";

	return Object.extend("pm11.zpm11nftcreate.util.Util", {

		_aDialogs: [],
		_iCounter : 1,
        
		/**
		 * Constructor
		 * @public
		 */
		constructor: function() {

    		this._aDialogs = [];
    		
		},
		
		/**
		 * creates a fragment with dialog, oParent is the parent controller
		 * @public
		 * @param {object}  oParent is the parent controller
		 * @param {string} name of the fragment
		 */		
		getFragmentDialog: function(oParent, sDialogFragmentName) {

			var sUniqueId = sDialogFragmentName + oParent.getView().getId();

			sDialogFragmentName = "pm11.zpm11nftcreate.view.fragments." + sDialogFragmentName;

			if (!this._aDialogs[sUniqueId]) {
				this._aDialogs[sUniqueId] = sap.ui.xmlfragment(sUniqueId,sDialogFragmentName, oParent);
				this._aDialogs[sUniqueId].sUniqueId = sUniqueId;
				oParent.getView().addDependent(this._aDialogs[sUniqueId]);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", oParent.getView(), this._aDialogs[sUniqueId]);
			}

			return this._aDialogs[sUniqueId];

		},
        
		/**
		* This function launches a Popover with a List of Notifications created for the 
        * given technical object. 
		 * @public
		 * @param {object}  oNotification current notification
		 * @param {array} aFilterList for filtering notifications
		 * @param {object} oSource Source control object
		 * @param {object} oParentView parent view
		 * @return {object} popover
		 */	    	
		launchPopoverCurrentNotifications: function(oNotification, aFilterList, oSource, oParentView) {

		//	var oDataHelper = oParentView.getController().getOwnerComponent().oRootView.getController().getODataHelper();
			var fnBeforeOpen = function(sId) {
				// filter notifications
				var oNotificationList = sap.ui.core.Fragment.byId(sId, "ListCurrentNotifications");
				oNotificationList.getBinding("items").filter(aFilterList, sap.ui.model.FilterType.Application);
	
				// count notifications
		//		oDataHelper.countHistoryNotifications(oNotification, oParentView.getController().getModel(CONSTANTS.MODEL.VIEW_PROP.NAME), oParentView.getModel());					
			};

			var oPopover = this._launchPopover({
					sFragmentName : "CurrentNotifications",
					oParentView : oParentView,
					oModel : oSource.getModel(),
					fnBeforeOpen : fnBeforeOpen,
					oSourceInt		: oSource,
					bDelayedOpen : false });

			return oPopover;
		},

		/**
		* This function launches a Popover with an overview for the 
        * given technical object.  
		* @public
		* @param {string}  sTechnObjectNumber 
		* @param {string} sTechnObjectNumberWithZeros
		* @param {string} sTechnObjectType
		* @param {object} oSource Source control object
		* @param {object} oParentView parent view
		* @return {object} popover
		*/	    	    	
		launchPopoverTechnicalObjectOverview: function(sTechnObjectNumber, sTechnObjectNumberWithZeros, sTechnObjectType, oSource, oParentView) {

            var sIcon = "";
        	var sCollection;

            if(!sTechnObjectNumberWithZeros){
                sTechnObjectNumberWithZeros = sTechnObjectNumber;
            }

            // set icon depending on technical objecttype
            switch (sTechnObjectType) {
				case CONSTANTS.MODEL.ODATA.TECH_OBJECT_TYPE_EQUI:
					sIcon = "icon-equipment";   
					sCollection = "BusinessSuiteInAppSymbols";
					break;
				case CONSTANTS.MODEL.ODATA.TECH_OBJECT_TYPE_FLOC:
					sIcon = "functional-location";  
					break;
				default:
					sIcon = "machine";
					break;
			}                  
            
            // create a local model in order to prevent that errors are shown 
            //in the messages indicator if no thumbnail was found ...
			var oModel = oParentView.getModel();
			var oLocalModel = new sap.ui.model.odata.v2.ODataModel({
				serviceUrl: oModel.sServiceUrl
			});

   			// remove the listener for the messages from this local model
    		sap.ui.getCore().getMessageManager().unregisterMessageProcessor(oLocalModel);			
			
            var oThumbModel = new sap.ui.model.json.JSONModel( );
            oThumbModel.setProperty("/url", IconPool.getIconURI(sIcon, sCollection));
            
            // replace the icon if a thumbnail was found
            var fnThumbnailFound = function(oResponse) {
                var sPath = oResponse.__metadata.media_src;
                oThumbModel.setProperty("/url", sPath);

            };
            // ==> check if a thumbnail exists in the backend                
			var oDataHelper = oParentView.getController().getOwnerComponent().oRootView.getController().getODataHelper();
			var sThumbnailPath = oDataHelper.getPathForTechnicalObjectThumbnailSet(sTechnObjectNumberWithZeros,sTechnObjectType);
			oLocalModel.read(sThumbnailPath ,{ success: fnThumbnailFound});
			
			var fnBeforeOpen = function(sId, oPopover) {
	            oPopover.setModel(oThumbModel,"thumbnail");
				// ==> care for attachments
				oPopover.refreshAttachments = function() {
	                // set the technicalObjectNumber as well as the ObjectType as custom data to the view
	                var oAttachmentsView = sap.ui.core.Fragment.byId(sId, "pmNotifViewTechnicalObjectOverviewAttachmentsSimple");
	                oAttachmentsView.data("technicalObjectNumber",sTechnObjectNumberWithZeros);
	                oAttachmentsView.data("technicalObjectType",sTechnObjectType);
	                oAttachmentsView.getController().refresh();
				};
	            
	            // initialize/refresh the attachments
	            oPopover.refreshAttachments();				
			};			
			// ==> create the popover
			var sContextPath = oDataHelper.getPathForTechnicalObjectSet(sTechnObjectNumber, sTechnObjectType);
			var oPopover = this._launchPopover({
					sFragmentName : "TechnicalObjectOverview",
					oParentView : oParentView,
					oModel : oSource.getModel(),
					fnBeforeOpen : fnBeforeOpen,
					sContextPath : sContextPath,
					oSourceInt		: oSource,
					bDelayedOpen : false });

            return oPopover;
                
		},

		/**
		* This function launches a Popover with details for the given User.
		* @public
		* @param {string}  sUserId 
		* @param {object}  oSource Source control object
		* @param {object}  oParentView parent view
		* @return {object} popover
		*/	    	    	    	
		launchPopoverEmployeeQuickView: function(sUserId, oSource, oParentView) {
			var oDataHelper = oParentView.getController().getOwnerComponent().oRootView.getController().getODataHelper();

			var fnBeforeOpen = function(sId, oPopover) {
				var oElementTypes = {
					phone: sap.m.QuickViewGroupElementType.phone,
					mobile: sap.m.QuickViewGroupElementType.mobile,
					email: sap.m.QuickViewGroupElementType.email
				};
				// set model for elementtypes
				oPopover.setModel(new JSONModel(oElementTypes), "elementType");		
			};			
		
			// In case of the "Contacts" list, the binding will be against the 'Contact' entity. No further data has to be requested from backend.	
			var sContextPath = oSource.getBindingContext().getPath();
			if(sContextPath.indexOf("/ContactSet(") !==0) {
					// In all other cases, we send another request for the PMUserDetails entity. This entity only supports user IDs, not personnel records!
					sContextPath = oDataHelper.getPathForUserId(sUserId);
			}
			
			var oPopover = this._launchPopover({
					sFragmentName : "EmployeeQuickView",
					oParentView : oParentView,
					oModel : oSource.getModel(),
					fnBeforeOpen : fnBeforeOpen,
					sContextPath : sContextPath,
					oSourceInt   : oSource,
					bDelayedOpen : true });			
			
			return oPopover;
		},

		/**
		* launches the popover
		* @public
		* @param {object}  several parameters to influence popover 
		*	var o = {
				sFragmentName : "",
				oParentView : {},
				oModel : {},
				fnBeforeOpen : {},
				sContextPath : "",
				oSourceInt		: {},
				bDelayedOpen : boolean,   //only true when ContextPath for ElementBinding given
		};
		* @return {object} popover
		*/	    		
		_launchPopover: function(oParams){
			
			var oPopover = {};
			
			// SAP Note 3383249 owner component fix
			// It would worth checking if it exists at all
			oParams.oParentView.getController().getOwnerComponent().runAsOwner(function() {			
			//
			
			var sId = this.getUniqueId();
			var openPopover = function() {
				if (typeof oParams.fnBeforeOpen !== "undefined") {
					oParams.fnBeforeOpen(sId, oPopover);
				}
				// delay because addDependent will do a async rerendering and the popover will immediately close without it
				jQuery.sap.delayedCall(0, oParams.oParentView.getController(), function() {
					oPopover.openBy(oParams.oSourceInt);
				});
			};
			
			// sTechObject represents the prefix for the fragment
			oPopover = sap.ui.xmlfragment( sId,
				"pm11.zpm11nftcreate.view.fragments." + oParams.sFragmentName,
				oParams.oParentView.getController());

			// set ODataModel -> trigger fetch of User details
			oPopover.setModel(oParams.oModel);
			if (typeof oParams.sContextPath === "string" && oParams.sContextPath.length > 0 ) {
				oPopover.bindElement(oParams.sContextPath);
			}

			if(typeof oParams.bDelayedOpen === "undefined" || oParams.bDelayedOpen === true ){
	
				// async data-fetch -> attach to data received in order to open the quickview when data was fetched
				var oBinding = oPopover.getElementBinding();
				oBinding.attachDataReceived(openPopover, oPopover);
				//check if binding already available
				if (oBinding && oBinding.getBoundContext()) {
					openPopover();
				}				
			} else {
				openPopover();
			}

			oParams.oParentView.addDependent(oPopover);

			// SAP Note 3383249 owner component fix
			// Closing runAsOwner here
			}.bind(this));
			// 

			return oPopover;

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
		
		getUniqueId: function () {
			var oDate = new Date(),
				sMS = oDate.getMilliseconds() + "",
				sUniqueKey = "id" + ++oDate + sMS + (++this._iCounter === 10000 ? (this._iCounter = 1) : this._iCounter);
			return sUniqueKey;
		}		

	});

});