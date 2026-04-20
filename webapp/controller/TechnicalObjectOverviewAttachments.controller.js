/*
 * Copyright (C) 2009-2021 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
		"pm11/zpm11nftcreate/controller/BaseController",
		"pm11/zpm11nftcreate/model/formatter",
		"pm11/zpm11nftcreate/util/Constants",
		"sap/m/MessageBox"
	], function(BaseController, formatter, CONSTANTS, MessageBox) {
	"use strict";

	return BaseController.extend("pm11.zpm11nftcreate.controller.TechnicalObjectOverviewAttachments", {

		formatter: formatter,

    	_objects: {
    		oModel : null
    	},

		_properties: {
			objectKey: "",
			objectType: "",
			documentPart: "",
			documentVersion: "",
			documentNumber: "",
			documentType: "",
			mode: "",
			visibleEdit: false,
			visibleDelete: false
		},

		//	_action is a constant object. Do not change any value while coding
		_ACTION: {
			DELETEATTACHMENT: "Delete",
			RENAMEATTACHMENT: "Rename",
			LISTATTACHMENT: "List",
			SAVEATTACHMENT: "Save",
			CANCELATTACHMENT: "Cancel",
			DRAFTATTACHMENT: "Draft",
			COUNTATTACHMENT: "Count"
		},
		
		_bAttachmentsRetrieved: false,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * onInit
		 * @public
		 */
		onInit: function() {
        
			this._objects.oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/CV_ATTACHMENT_SRV", true);
            this._setAttachmentModel({});
		},
		
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * onAttachmentClicked: opens the selected attachment
		 * @param {sap.ui.base.Event} oEvent
		 * @public
		 */
		onAttachmentClicked: function(oEvent) {
			var sMediaSrc = oEvent.getSource().getBindingContext().getObject().url;
			sap.m.URLHelper.redirect(sMediaSrc, true);
		},

		/* ===========================================================  */
		/* Utility                                      */
		/* ===========================================================  */
		/**
		 * refreshes the attachments
		 * @public
		 */		
        refresh:function(){
            
			var that = this;
			
			var sTechnObjectType = this.getView().data("technicalObjectType");
            this._properties.objectKey = this.getView().data("technicalObjectNumber");
            
			switch (sTechnObjectType) {
				case CONSTANTS.MODEL.ODATA.TECH_OBJECT_TYPE_EQUI:
					this._properties.objectType = CONSTANTS.ATTACHMENTS.OBJECTTYPE_EQUI;
					break;
				case CONSTANTS.MODEL.ODATA.TECH_OBJECT_TYPE_FLOC:
					this._properties.objectType = CONSTANTS.ATTACHMENTS.OBJECTTYPE_FLOC;
					break;
				default:
					this._properties.objectType = null;
					break;
			}            

			if ( this._properties.objectKey && this._properties.objectType ){
			    
    			this._objects.oModel.read(
    			    "/GetAllOriginals", null, this._prepareUrlParameters(), 
    			    false, 
    			    function(oData) {
        				that._setOriginal(oData);
        				that._bAttachmentsRetrieved = true;
        			}, 
        			function(e) {
        				that._bAttachmentsRetrieved = false;
        				that._showErrorMessage(JSON.parse(e.response.body).error.message.value, "");
        			}
        		);
			}
        },

		/* ===========================================================  */
		/* begin: private methods                                       */
		/* ===========================================================  */

		/**
		 * prepares URL parameters
		 * @private
		 * @return {string} URL parameter string
		 */
		_prepareUrlParameters: function() {
			var oK = "ObjectKey='" + this._properties.objectKey + "'";
			var oT = "ObjectType='" + this._properties.objectType + "'";

			return oK + "&" + oT;

		},

		/**
		 * set attachment model to view
		 * @private
		 */
		_setAttachmentModel : function(dataitem) {
				var oDataModel = new sap.ui.model.json.JSONModel({ Attachments : dataitem});
				this.getView().setModel(oDataModel); 
		},
	
		/**
		 * Takes data from result and sets data in model
		 * @private
		 * @param {object} OData result
		 */	
		_setOriginal : function(oResult) {
				if (oResult !== null) {
					var dataitem = [];
					var i = 0, length = oResult.results.length;
					for (i = 0; i < length; i++) {
						dataitem.push(this._mapResult(oResult.results[i]));
					}
					this._setAttachmentModel(dataitem);
				} 
		},	
	
		/**
		 * Takes data from File object and sets properties
		 * @private
		 * @param {object} oFile contains file properties
		 * @return {object} object with file properties
		 */			
		_mapResult : function(oFile) {
		  oFile.CreatedAt = Date(oFile.CreatedAt).toString().substr(0, 15); 
			var object = {
					"content_type" : oFile.__metadata.content_type,
					"CreatedBy" : oFile.FullName,
					"CreatedAt" : oFile.CreatedAt,                   // oFile.CreatedAt.toDateString(),
					"Filename" : oFile.Filename,
					"url" : oFile.__metadata.media_src,
					"size" : parseFloat(oFile.Filesize), 
					"FileId" : oFile.FileId,
					"ApplicationId" : oFile.ApplicationId,
					"Documentnumber" : oFile.Documentnumber,
					"Documenttype" : oFile.Documenttype,
					"Documentversion" : oFile.Documentversion,
					"Documentpart" : oFile.Documentpart
			};
			if(oFile.Documentnumber && this._properties.documentNumber === ""){
				this._properties.documentPart = oFile.Documentpart;
				this._properties.documentVersion = oFile.Documentversion;
				this._properties.documentNumber = oFile.Documentnumber;
				this._properties.documentType = oFile.Documenttype;			
			}
			return object;
		},	

		/**
		 * Displays error popup
		 * @private
		 * @param {string} Message test
		 * @param {string} Message details
		 */	
		_showErrorMessage: function(msgText, msgDetail) {
			MessageBox.show(msgText, {
				icon: sap.m.MessageBox.Icon.ERROR,
				details: msgDetail
			});
		}

	});

});