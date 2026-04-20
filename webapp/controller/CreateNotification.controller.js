sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"pm11/zpm11nftcreate/model/formatter",
	"sap/ui/core/message/Message",
	"sap/ui/core/library",
    "./BaseController",
    "pm11/zpm11nftcreate/util/Constants",
    "sap/ui/generic/app/ApplicationController",
    "pm11/zpm11nftcreate/util/DraftHandler",
	"pm11/zpm11nftcreate/controls/TechnicalObjectValueHelp",
	"pm11/zpm11nftcreate/util/Util",
	"sap/ui/model/odata/v2/ODataModel"
], (Controller, MessageToast, JSONModel, Filter, FilterOperator, formatter, Message, Library, BaseController, Constants, ApplicationController, DraftHandler,TechnicalObjectValueHelp, Util, ODataModel) => {
    "use strict";

    return BaseController.extend("pm11.zpm11nftcreate.controller.CreateNotification", {
        // formatter
		formatter: formatter,
		// shortcut for sap.ui.core.MessageType
		messageType: Library.MessageType,
		// technical object value help
		_oTechnicalObjectValueHelp: null,
		// fiori lpd user id
		_sCurUserId: "",
		// fiori lpd user name
		_sCurUserName: "",
		// current failure mode group
		_failureModeGroup: "",
		_sActivityDraftUUID: "",
		_sMaintNotifDetectionCodeGroup: "",
		_sMaintNotifDetectionCode: "",
		_sNewDetectionMethodText: "",
		// local json model
		_oLocalViewModel: null,
		// faikure mode smartfield
		_oFailureModeField: null,
		// failure mode group smartfield
		_oFailureModeCodeGroupField: null,
		// failure mode internal combobox
		_oFailureModeComboBox: null,
		// error counts for internally generated messages
		_fieldsWithErrors: 0,
		// application controller instance
		_oApplicationController: null,
		// draft handler utillity
		_oDraftHandler: null,

		// CatalogProfile Field Binding
		_oCatalogProfileBinding: null,
		// Event Prioritization Dialog
		_oEPMDialog: null,
		// flag to check if event prioritization was used
		_isEPMSelected: false,
		_NotificationConsequencePersistenceHelper: null,
		bPendingReadTeamplates: false,
		// Multi Draft:Create Global variable for create new Draft	
		bcreateNew : false,
		bNewDraft: false,
		bdigDraftBtn: false,
		bNotificationTypeChanged: false,
		oUserDefaults: null,
        onInit() {

            var oRouter = this.getRouter();
            this.oModel = this.getOwnerComponent().getModel();
			var oI18n = this.getOwnerComponent().getModel("i18n");
			var oResourceBundle = oI18n.getResourceBundle();
			this._i18n = oResourceBundle.getText.bind(oResourceBundle);

			this._setupTechnicalObjectValueHelp();

			this._setupLongTextField();
			// initalise event to adding counter to long text field
			this._setupLongTextFieldCount();

            oRouter.getRoute("RouteCreateNotification").attachMatched(this.onCreateWorkRequestMatched, this);
            oRouter.getRoute("draft").attachMatched(this.onDraftRouteMatched, this);

			// set message model
			var oMessageManager = sap.ui.getCore().getMessageManager();
			this.getView().setModel(oMessageManager.getMessageModel(), "message");
			//Register the view by the message manager
			oMessageManager.registerObject(this.getView(), true);
        },
		/** 
		 * function is called to fire the attachChange event for long text
		 */
		_setupLongTextFieldCount: function () {
			this.getView().byId("createWrNotifLongText").attachChange(this._onLongTextChanged.bind(this));
		},
		/**
		 * helper function to set the growing property for longtext field
		 */
		_setupLongTextField: function () {
			// Long text set growing property
			this.getView().byId("createWrNotifLongText").attachInnerControlsCreated(function (oEvent) {
				var aTextArea = oEvent.getSource().getInnerControls().filter(function (oControl) {
					return oControl instanceof sap.m.TextArea;
				});
				if (!aTextArea || !aTextArea.length) {
					return;
				}

				aTextArea[0].setGrowingMaxLines(7);
				aTextArea[0].setGrowing(true);
			});
		},
		/** 
		 * function is called to add the exceeded text to the long text field 
		 * @param oEvent
		 */
		_onLongTextChanged: function (oEvent) {
			var aTextArea = oEvent.getSource().getInnerControls().filter(function (oControl) {
				return oControl instanceof sap.m.TextArea;
			});
			if (!aTextArea || !aTextArea.length) {
				return;
			}

			var oMetaModel = this.oModel.getMetaModel(),
				sEntityType = oMetaModel && oMetaModel.getODataEntityType(Constants.ENTITY_NAMESPACE + "." + Constants.ENTITY.WORK_REQUEST_TP_TYPE),
				iMaxLength = oMetaModel && oMetaModel.getODataProperty(sEntityType, "MaintNotifLongTextForEdit") && oMetaModel.getODataProperty(
					sEntityType, "MaintNotifLongTextForEdit").maxLength;
			aTextArea[0].setShowExceededText(true);
			aTextArea[0].setMaxLength(parseInt(iMaxLength));
		},
		/** 
		 * event handle for action sheet list item press action
		 * @param oEvent
		 */
		addTemplateToDescription: function (oEvent) {
			var oDocuText = oEvent.getSource().getBindingContext().getProperty("MaintNotificationLongText");
			this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/MaintNotifLongTextForEdit",
				oDocuText);
		},
		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 */
		onExit: function () {
			if (this._oTechnicalObjectValueHelp) {
				this._oTechnicalObjectValueHelp.destroy();
			}
			if (this._oEPMDialog) {
				this._oEPMDialog.destroy();
			}
			if (this._oCatalogProfileBinding) {
				this._oCatalogProfileBinding.destroy();
			}
			if (this._oMaintNotificationCatalogBinding) {
				this._oMaintNotificationCatalogBinding.destroy();
			}
			if (this._oDetectionCodeBinding) {
				this._oDetectionCodeBinding.destroy();
			}
			if (this._oDraftHandler) {
				this._oDraftHandler.destroy();
			}

		},
        onCreateWorkRequestMatched: function (oEvent) {
			var that = this;
			this._setup();
		//	this.digDraftBt = false;
			//Multi Draft: Adding Condition for based on createNew property
				if (!this.getView().getBindingContext() || this.bcreateNew) {
			// promise chain for draft handling
			//if (!this.getView().getBindingContext()) {
				//this.getView().setBusy(true);
				this.oModel.metadataLoaded().then(function () {		
						return that._createNewDraft();
				}).then(function (sDraftUUID) {
                 //   that.getRouter().navTo("draft", {
                  //      DraftUUID: encodeURIComponent(sDraftUUID)
                  //  }, true);
				  	that.loadDraft({
						DraftUUID: sDraftUUID
					});
				  
                });
			}
		},
        _createNewDraft: function () {
			this.bNewDraft = true;
			var oDefaultParams = {
				ReporterFullName: this._sCurUserName,
                NotificationType: 'M2'
			};
			/*var aNotificationType = this._oStartupParameters['NotificationType'];
			oDefaultParams['NotificationType'] = Array.isArray(aNotificationType) ? aNotificationType[0] : aNotificationType;
			for (var key in this._oStartupParameters) {
				var sValue = this._oStartupParameters[key];
				switch (key) {
				case "NotificationType":
				case "TechnicalObject":
				case "TechnicalObjectLabel":
				case "TechObjIsEquipOrFuncnlLoc":
				case "MaintenancePlant":
					oDefaultParams[key] = Array.isArray(sValue) ? sValue[0] : sValue;
					break;
				}
			}*/
			var that = this;
			return this._oApplicationController.getTransactionController().getDraftController().createNewDraftEntity(
					Constants.ENTITY.WORK_REQUEST_TP, "/" + Constants.ENTITY.WORK_REQUEST_TP ,  oDefaultParams, true)
				.then(function (oResponse) {
					//that._hidePlaceHolder();
					return Promise.resolve(oResponse.data.DraftUUID);

				});
		},
        onDraftRouteMatched: function (oEvent) {
			var that = this;
			this._setup();
			var sDraftUUID = decodeURIComponent(oEvent.getParameter("arguments").DraftUUID);
			// Multi Draft
				if (!this.getView().getBindingContext() || this.bcreateNew) {
		//	if (!this.getView().getBindingContext()) {
				this.getView().setBusy(true);
				this.oModel.metadataLoaded().then(function () {
					//that._setupTitleField();
					//manually set WR template
					that.loadDraft({
						DraftUUID: sDraftUUID
					});
				});
				
				//.then(function () {

					// set default values
				//	that._setDefaultValues.call(that);
				//});
			}
		},
		loadDraft: function (oResponse) {
			var that = this;
			that.sEntityPath = that.oModel.createKey("/" + Constants.ENTITY.WORK_REQUEST_TP, {
				DraftUUID: oResponse.DraftUUID,
				MaintenanceNotification: "",
				IsActiveEntity: false
			});
			// attach Model Events
			that.oModel.attachRequestSent(that.onRequestSent, that);

			that._oDraftHandler.registerDraftIndicator(that.getView().byId("createWrDraftIndicator"), that.sEntityPath);

			
			this.getView().bindElement({
				path: that.sEntityPath,
				events: {
					 dataRequested: function () {
     
                         },
					dataReceived: function (oDataReceivedEvent) {
    					//that._hidePlaceHolder();
						if (!oDataReceivedEvent.getParameter("data")) {
							// no data (possibly a 'not found' error)
							this._oStartupParameters.DraftUUID = "";
							this.getRouter().navTo("RouteCreateWorkRequest", {}, true);
							sap.ui.getCore().getMessageManager().removeAllMessages();
						} else {
							// set default values
							this._setDefaultValues();
							var sPath = this.getView().getBindingContext().getPath();
							var oModel = this.getView().getModel();
							if(sPath && oModel){
								oModel.setProperty(sPath + "/NotificationType", "");
							}
							this._createActivityDraft(oDataReceivedEvent.getParameter("data").DraftUUID);
                            this.getView().setBusy(false);
						}
					}.bind(this)
				}
			});

			this._setDefaultValues();
							var sPath = this.getView().getBindingContext().getPath();
							var oModel = this.getView().getModel();
							if(sPath && oModel){
								oModel.setProperty(sPath + "/NotificationType", "");
								//	this._createActivityDraft(oModel.getProperty(sPath + "/DraftUUID"));
							}
						
                            this.getView().setBusy(false);
		},

       _createActivityDraft: function (sDraftUUID) {
		  var that = this;
		  var oDefaultParams = {
				 MaintNotificationActivity: "0010",
				 MaintNotifActivityCodeCatalog: "A",
			};
		 this._oApplicationController.getTransactionController().getDraftController().createNewDraftEntity(
					Constants.ENTITY.WORK_REQUEST_TP, "/" + Constants.ENTITY.WORK_REQUEST_TP + "(MaintenanceNotification='',DraftUUID=guid'" + sDraftUUID + "',IsActiveEntity=false)/to_Activity",  oDefaultParams, true, {sRootExpand: true})
				.then(function (oResponse) {
					//that._hidePlaceHolder();
					//return Promise.resolve(oResponse.data.DraftUUID);
					that._sActivityDraftUUID = oResponse.data.DraftUUID;
					  var oHBox = that.byId("activityHBox"); 
					   that.loadFragment({
                name: "pm11.zpm11nftcreate.view.fragments.Activity" // Path to file
            }).then(function(oFragment) {
                // Add the fragment to the HBox
                var sEntityPath = "/xPM11x_MaintenanceNotifActy(MaintNotificationActivity='10',MaintenanceNotification='',DraftUUID=guid'" + oResponse.data.DraftUUID +"',IsActiveEntity=false)";
   
                oFragment.bindObject({path: sEntityPath});
                 oHBox.addItem(oFragment);
			});
				});
	   },

        _setDefaultValues: function () {
			var that = this;
			// set default values if new draft was created
			if (!this.getView().getBindingContext()) {
				return;
			}

			this._afterViewBoundToDraft();
		//	this._evaluateNotifProcessingContext();
			//MUlti Draft Changes for checking npc value		
			/*	if (this.oModel.getProperty(this.getView().getBindingContext().getPath() + "/MaintNotifProcessingContext") === "01") {
							this._oLocalViewModel.setProperty("/emergencyNotification", true);
							// this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/MaintenancePlanningPlant", "");
							// this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/MainWorkCenter", "");
						//	this._setUserDefaults();
						} else {
							this._oLocalViewModel.setProperty("/emergencyNotification", false);
							//this._setUserDefaults(true);
						} */

		/*	var oCtx = this.getView().getBindingContext();
			// create property binding for catalog profile
			this._oCatalogProfileBinding = this.oModel.bindProperty(
				oCtx.getPath() + "/CatalogProfile",
				oCtx
			);
			// attach property change handler
			this._oCatalogProfileBinding.attachChange(this._onCatalogProfileChanged.bind(this));
			// create property binding for catalog profile
			this._oNotificationTypeBinding = this.oModel.bindProperty(
				oCtx.getPath() + "/NotificationType",
				oCtx
			);
			this._oNotificationTypeBinding.attachChange(function (oEvent) {
				this.bNotificationTypeChanged = true;
			}.bind(this)); */

			// reported By user defaults to created by user
			 if (!this.getView().getBindingContext().getProperty("ReportedByUser")) {
				this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/ReportedByUser",
			 		this.getView().getBindingContext().getProperty("CreatedByUser"));
		    }

			// if (this.getView().getBindingContext().getProperty("MaintNotifProcessingContext") === "01") {
			// 	this._oLocalViewModel.setProperty("/emergencyNotification", true);
			// } else {
			// 	this._oLocalViewModel.setProperty("/emergencyNotification", false);
			// }

			/*if (this.getView().getBindingContext().getProperty("MaintNotificationCodeGroup") === "") {
				this.oFailureModePromise.then(function (data) {
					that._oFailureModeComboBox.setEnabled(false);
					that._oFailureModeComboBox.setEditable(false);
				});
			} else {
				this._failureModeGroup = this.getView().getBindingContext().getProperty("MaintNotificationCodeGroup");
			} */
		},
		/**
		 * Function called to set the user default values to the actual fields.
		 * @param bUnset {boolean}
		 * In case bUnset is set to true, it means the value of user default fields needs to be reset to empty
		 */
		_setUserDefaults: function (bUnset) {
			//setup values for user defaults
			if (this.oUserDefaults) {
				var that = this;
				Object.keys(this.oUserDefaults).forEach(function (sFieldName) {
					if (sFieldName === "NotificationType") {
						return;
					}
					that.oModel.setProperty(that.getView().getBindingContext() + "/" + sFieldName, (bUnset ? "" : that.oUserDefaults[sFieldName]));
				});
			}
		},
		onRequestSent: function () {
			// this._onFailureModeCodeGroupLoaded();
		},
		/**
		 *  event call back for element change event of view 
		 * 	called after view is bound to the draft entity set
		 */
		_afterViewBoundToDraft: function () {
			var that = this;
			// attachment key
			if (!this.getView().getBindingContext().getProperty("MaintWorkRequestAttchKey")) {
				this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/MaintWorkRequestAttchKey",
					this.getView().getBindingContext().getProperty("DraftUUID"));
				this._oApplicationController.propertyChanged("MaintWorkRequestAttchKey", this.getView().getBindingContext());
			}
			// initialize the attachment component
			that.initAttachmentComponent({
					mode: Constants.ATTACHMENT_SERVICE.MODE.CREATE,
					objectType: Constants.ATTACHMENT_SERVICE.OBJECT_TYPES.NOTIFICATION,
					objectKey: that.getView().getBindingContext().getProperty("MaintWorkRequestAttchKey")
				},
				"workRequestCreateAttachSrvCompContCreate"); // attachment component id
				if(	this._oLocalViewModel.getProperty("/sMultiDraft") === true)
				{
				this.sViewId = this.getView().getId();	
          	    var oAttach = that.byId(
						this.sViewId + "--workRequestCreateAttachSrvCompContCreate"
					);
					//remove draft attachments
					if (oAttach) {
						oAttach.getComponentInstance().getApplicationState(function (bResp) {
							//bResp true means there are changes to the attachments
							if (bResp) {
								//will delete all attachments in draft stage
								oAttach.getComponentInstance().refresh(Constants.ATTACHMENT_SERVICE.MODE.CREATE, Constants.ATTACHMENT_SERVICE.OBJECT_TYPES.NOTIFICATION,that.getView().getBindingContext().getProperty("MaintWorkRequestAttchKey"));
						       
							}
						});
					}
				}
			this._oLocalViewModel.setProperty("/sMultiDraft", false); 
			this._getISPMConfiguration();
			this._getPM11TaskListConfiguration();
			that.getView().setBusy(false);
			this._getLongTextTemplates().then(
				function (aTemplates) {
					return that._setLongtextTemplates(aTemplates);
				}
			).then(function () {

				var aTemplates = that._oLongTextTemplateModel.getProperty("/templates");
				if (aTemplates.length === 1) {
					// if (that.bNewDraft) {
					// 	var sSelectedKey = aTemplates[0].WorkRequestTextTemplate.toUpperCase();
					// 	that.oModel.setProperty(that.getView().getBindingContext().getPath() + "/WorkRequestTextTemplate",
					// 		sSelectedKey);
					// 	that.oModel.setProperty(that.getView().getBindingContext().getPath() + "/MaintNotifLongTextForEdit",
					// 		aTemplates[0].MaintNotificationLongText);
					// 	that._oApplicationController.propertyChanged("MaintNotifLongTextForEdit", that.getView().getBindingContext());
					// }
					var sSelectedTemplate = that.getView().getBindingContext().getProperty("WorkRequestTextTemplate");
					that._oLongTextTemplateModel.setProperty("/enabled", !sSelectedTemplate);
				} else if (aTemplates.length > 1) {
					that._oLongTextTemplateModel.setProperty("/enabled", true);
				}}

			).catch(function () {});
			// set the number of work request count
		//	this._setCurrentWorkRequestCount();

		},
		onNotificationTypeChanged: function (oEvent) {
			var sPath = this.getView().getBindingContext().getPath();
			var sNotificationType = oEvent.getSource().getValue();
           if(sNotificationType !== ""){
			switch (sNotificationType) {
			case "M1": 
			this._oLocalViewModel.setProperty("/referenceNotificationType",'M1'); 

			break;
			case "M2":
				 this._oLocalViewModel.setProperty("/referenceNotificationType",'M2');
			break;
			default:
			 this.oModel.read("/xPM11xI_NotifTypeMapping('" + sNotificationType + "')", {
			success: function (oData) {
				if (oData && oData.StandardNotificationType && oData.StandardNotificationType !== "") {
			  this._oLocalViewModel.setProperty("/referenceNotificationType",oData.StandardNotificationType); 
			}	
		}.bind(this)});
		 }
		}
		},

       _getISPMConfiguration: function () {
		  var that = this;

          this.oModel.read("/xPM11xI_CheckISPMTable", {
			success: function (oData) {
				if (oData && oData.results && oData.results.length > 0) {
			  that._oLocalViewModel.setProperty("/isISPMConfigured",true); 
		//	 that.getModel("viewProperties").setProperty("/isISPMConfigured",true); 
			}	
		}});
	   },

	    _getPM11TaskListConfiguration: function () {
		  var that = this;

          this.oModel.read("/xPM11xI_CheckPM11TaskList", {
			success: function (oData) {
				if (oData && oData.results && oData.results.length > 0) {
			  that._oLocalViewModel.setProperty("/isPM11TaskListConfigured",true); 
		//	 that.getModel("viewProperties").setProperty("/isISPMConfigured",true); 
			}	
		}});
	   },

		/** 
		 * get templates from backend
		 * @constructor 
		 * @returns oPromise resolved when data is returned
		 */
		_getLongTextTemplates: function () {
			var that = this;
			var oWorkRequest = this.getView().getBindingContext(),
				aFilters = [];
			this.bPendingReadTeamplates = true;
			if (oWorkRequest) {
				aFilters = [new Filter({
						path: "NotificationType",
						operator: FilterOperator.EQ,
						value1: oWorkRequest.getProperty("NotificationType")
					}),
					new Filter({
						path: "TechnicalObject",
						operator: FilterOperator.EQ,
						value1: oWorkRequest.getProperty("TechnicalObject")
					}), new Filter({
						path: "TechObjIsEquipOrFuncnlLoc",
						operator: FilterOperator.EQ,
						value1: oWorkRequest.getProperty("TechObjIsEquipOrFuncnlLoc")
					}),
					new Filter({
						path: "MaintenancePlant",
						operator: FilterOperator.EQ,
						value1: oWorkRequest.getProperty("MaintenancePlant")
					})
				];
			}
			return new Promise(function (resolve, reject) {
				that._oLongTextTemplateModel.setProperty("/busy", true);
				that.oModel.read("/" + Constants.ENTITY.LONG_TEXT_TEMPLATE, {
					filters: aFilters,
					success: function (oResult) {
						that.bPendingReadTeamplates = false;
						that._oLongTextTemplateModel.setProperty("/busy", false);
						return resolve(oResult.results);
					},
					error: function (oError) {
						that._oLongTextTemplateModel.setProperty("/busy", false);
						reject(oError);
					}
				});
			});
		},
		/** 
		 * 
		 * @constructor 
		 * @param aTemplates
		 * @param bSetDefault set the default template if only one long text
		 * @returns
		 */
		_setLongtextTemplates: function (aTemplates, bSetDefault) {
			if (!aTemplates) {
				return;
			}
			this._oLongTextTemplateModel.setProperty("/templates", aTemplates);
			if (aTemplates.length > 1) {
				this._oLongTextTemplateModel.setProperty("/enabled", true);
			} else {
			// 	var sSelectedKey = aTemplates[0].WorkRequestTextTemplate.toUpperCase();
			// 	this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/WorkRequestTextTemplate", sSelectedKey);
			// 	this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/MaintNotifLongTextForEdit", aTemplates[0].MaintNotificationLongText);
			// 	this._oApplicationController.propertyChanged("MaintNotifLongTextForEdit", this.getView().getBindingContext());
				this._oLongTextTemplateModel.setProperty("/enabled", false);
			}
		},
		onLongtextTemplateChanged: function (oEvent) {
			var oContext = oEvent.getSource().getSelectedItem().getBindingContext("longTextTemplates");
			this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/MaintNotifLongTextForEdit",
				oContext.getProperty("MaintNotificationLongText"));
		},

		/**
		 *  @param  {Object} oEvent 
		 *  Event handler for long text change event
		 */
		onLongTextChanged: function () {},

		/**
		 * helper function to set the bind a custom value help with technical object smart field
		 *  
		 */
		_setupTechnicalObjectValueHelp: function () {
			var oTechnicalObjectSmartfield = this.getView().byId("createWrSmartFieldTechObj");
			oTechnicalObjectSmartfield.attachEvent("innerControlsCreated", function () {
				var aControls = oTechnicalObjectSmartfield.getInnerControls();
				if (aControls.length > 0 && aControls[0] instanceof sap.m.Input) {
					var oTechnicalObjectInput = aControls[0];

					// Enable Value Help in inner control
					oTechnicalObjectInput.setShowValueHelp(true);
					// Ensure that the Technical Object Value Help is always
					// enabled and that this behavior cannot be reset
					oTechnicalObjectInput.setShowValueHelp = function () {
						this.setProperty("showValueHelp", true);
					}.bind(oTechnicalObjectInput);
				}
				// attach suggestion item selected event callback
				if (oTechnicalObjectInput) {
					 oTechnicalObjectInput.attachSuggestionItemSelected(function (oEvent) {
					 	if (oEvent.getParameter("selectedRow")) {
					 		// remove message if item is selected
					 		//this._removeMessage("TechnicalObjectLabel");
							var oSelectedItemContext = oEvent.getParameter("selectedRow").getBindingContext();
							var oSelectedTechnicalObject = oSelectedItemContext.getObject();
							if (oSelectedTechnicalObject&&oSelectedTechnicalObject.TechObjIsEquipOrFuncnlLoc === "EAMS_EQUI") {
								var aFilters = [new Filter({ 
									path: "Equipment",
									operator: FilterOperator.EQ,
									value1: oSelectedTechnicalObject.TechnicalObjectLabel
								})];
								this.oModel.read("/" + Constants.ENTITY.TECHNICAL_OBJECT_FLAT, {
									filters: aFilters,
									success: function (oResult) {
										if (oResult && oResult.results && oResult.results.length > 0) {
											var oEquipmentToFloc = oResult.results[0];
											this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectLabel",
												oEquipmentToFloc.SuperiorFLOCEquipment);
											this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectName",
												oEquipmentToFloc.SuperiorFLOCEquipmentName);
										} else {
											this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectLabel", "");
											this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectName", "");
										}
							}.bind(this)});

							 }
						}
			  	},  this);

					// }.bind(this));
					// attach valuehelp request event and open the _oTechnicalObjectValueHelp
					oTechnicalObjectInput.attachValueHelpRequest(function () {
						if (!this._oTechnicalObjectValueHelp) {
							this._oTechnicalObjectValueHelp = new TechnicalObjectValueHelp({
								entitySetFlat: Constants.ENTITY.TECHNICAL_OBJECT_FLAT,
								entityTypeFlat: Constants.ENTITY.TECHNICAL_OBJECT_FLAT_TYPE,
								entitySetHierarchy: Constants.ENTITY.TECHNICAL_OBJECT_HIER,
								entityTypeHierarchy: Constants.ENTITY.TECHNICAL_OBJECT_HIER_TYPE,
								triggeringView: this.getView(),
								hierarchyNodeLevel: this.getView().getBindingContext().getProperty("HierarchyNodeLevel")
							});
						}
						// on Technical object selected set the other field in the model
						this._oTechnicalObjectValueHelp.attachTechnicalObjectSelected(function (oEvent) {
							this._removeMessage("TechnicalObjectLabel");
							// set count of current work requests to 0
							// this._oLocalViewModel.setProperty("/currentWorkRequests", 0);
							var oSelectedTechnicalObject = oEvent.getParameters();
							// hierarchy node level for hierarchy view 
							this._oTechnicalObjectValueHelp.setHierarchyNodeLevel(oSelectedTechnicalObject.HierarchyNodeLevel);
							// Technical Object Label Field 
							this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/TechnicalObjectLabel",
								oSelectedTechnicalObject.TechnicalObjectLabel);
							// Technical Object Type (EAMS_EQUI / EAMS_FL) Field 
							this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/TechObjIsEquipOrFuncnlLoc",
								oSelectedTechnicalObject.TechObjIsEquipOrFuncnlLoc);
							// assetLocation field (location Id)	
							//if (oSelectedTechnicalObject.TechObjIsEquipOrFuncnlLoc !== 'EAMS_EQUI' || oSelectedTechnicalObject.TechObjInstallationLocation === '') {
							this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/AssetLocation",
								oSelectedTechnicalObject.AssetLocation);
							// }
							// assetLocation Name (location name)
							if (oSelectedTechnicalObject.TechObjIsEquipOrFuncnlLoc === 'EAMS_EQUI' && oSelectedTechnicalObject.TechObjInstallationLocation && oSelectedTechnicalObject.TechObjInstallationLocation !== '') {
                                 this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectLabel",
								oSelectedTechnicalObject.SuperiorFLOCEquipment);
								 this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectName",
								oSelectedTechnicalObject.SuperiorFLOCEquipmentName);
							 }else if (oSelectedTechnicalObject.TechObjIsEquipOrFuncnlLoc === 'EAMS_EQUI' && oSelectedTechnicalObject.HierarchyNodeUniqueID && oSelectedTechnicalObject.HierarchyNodeUniqueID !== '') {
							  var aFilters = [new Filter({ 
									path: "Equipment",
									operator: FilterOperator.EQ,
									value1: oSelectedTechnicalObject.HierarchyNodeUniqueID
								})];
								this.oModel.read("/" + Constants.ENTITY.TECHNICAL_OBJECT_FLAT, {
									filters: aFilters,
									success: function (oResult) {
										if (oResult && oResult.results && oResult.results.length > 0) {
											var oEquipmentToFloc = oResult.results[0];
											this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectLabel",
												oEquipmentToFloc.SuperiorFLOCEquipment);
											this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectName",
												oEquipmentToFloc.SuperiorFLOCEquipmentName);
										} else {
											this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectLabel", "");
											this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/SuperiorTechnicalObjectName", "");
										}
							}.bind(this)});

							}
							 
							 else{
							this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/LocationName",
								oSelectedTechnicalObject.LocationName);}
							this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/TechnicalObjectDescription",
								oSelectedTechnicalObject.TechnicalObjectDescription);

							// set current work requests
							this.oModel.firePropertyChange({
								path: "TechnicalObjectLabel",
								context: this.getView().getBindingContext()
							});

						}, this);
						var sValue = oTechnicalObjectInput.getValue();
						var oWorkRequest = this.getView().getBindingContext().getObject();
						if (sValue !== "" && oWorkRequest.TechnicalObject !== "" && (oWorkRequest.TechObjIsEquipOrFuncnlLoc === Constants.FUNCTIONAL_LOCATION ||
								oWorkRequest.TechObjIsEquipOrFuncnlLoc === Constants.EQUIPMENT)) {
							// if technical object is already selected in vh control then show hierarchy vew
							this._toggleHierarchy();
						} else {
							// otherwise set search String to the entered text
							this._toggleHierarchy({
								TechnicalObjectLabel: sValue,
								TechnicalObject: "",
								TechObjIsEquipOrFuncnlLoc: ""
							});
						}
						// open the dialog
						this._oTechnicalObjectValueHelp.open();
					}.bind(this));
				}

			}.bind(this));
		},

		/**
		 * event handler for technical object changed event
		 * @param  {Object} oEvent
		 */
		onTechnicalObjectChanged: function (oEvent) {
			var sNewValue = oEvent.getParameter("newValue");
			// if newvalue is empty then technical object is still valid
			if (!sNewValue) {
				// if newvalue is empty then technical object is still valid
				this._clearTechnicalObjectContext(sNewValue);
				this._removeMessage("TechnicalObjectLabel");
			}
			var oMessageManager = sap.ui.getCore().getMessageManager();
			var aMessages = oMessageManager.getMessageModel().getData();
			aMessages = this._getTargettedMessages(aMessages);
			aMessages = this._removeTechnicalMessages(aMessages);
			//this._setCurrentWorkRequestCount();
			// this.getView().triggerValidateFieldGroup();
		},

		/**
		 * helper method to clear the technical object context
		 * clear AssetLocation , LocationName , currentWorkRequests , TechnicalObject, TechObjIsEquipOrFuncnlLoc
		 * toggle the hierarchy view
		 */
		_clearTechnicalObjectContext: function (sNewValue) {
			this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/AssetLocation",
				"");
			this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/LocationName",
				"");
			this._oLocalViewModel.setProperty("/currentWorkRequests", "");
			this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/TechnicalObject", "");
			this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/TechObjIsEquipOrFuncnlLoc", "");

			// this._toggleHierarchy(sNewValue);
		},

		/**
		 * event handler for bar code scanner
		 * @param  {Object} oEvent
		 * 
		 */
		onScanSuccess: function (oEvent) {
			var oTechObjSmartField = this.getView().byId("createWrSmartFieldTechObj");
			var oTechObj = oEvent.getParameter("text");
			if (oTechObj && oTechObjSmartField) {
				this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/TechnicalObjectLabel",
					oTechObj);
				this._clearTechnicalObjectContext("");
				sap.ui.getCore().byId("sapNdcBarcodeScannerDialog").close();
				oTechObjSmartField.focus();
				this.oModel.firePropertyChange({
								path: "TechnicalObjectLabel",
								context: this.getView().getBindingContext()
							});
			 
			}

		},

		/**
		 * event handler for Cancel button press event
		 */
		onPressCancel: function (oEvent) {
			// show discard draft popover
			this._oDraftHandler.confirmDiscardDraft(oEvent.getSource(), true);
		},

		/*
		 * 
		 * toggles to heirarchy view of technical object vh 
		 * @param oValue map of technicalObject fields
		 * @private
		 */
		_toggleHierarchy: function (oTechnicalObject) {
			var oMap = oTechnicalObject ? oTechnicalObject : this.getView().getBindingContext().getObject();
			if (this._oTechnicalObjectValueHelp) {
				this._oTechnicalObjectValueHelp.setSearchString(oMap.TechnicalObjectLabel);
				this._oTechnicalObjectValueHelp.setTechnicalObjectLabel(oMap.TechnicalObjectLabel);
				this._oTechnicalObjectValueHelp.setTechnicalObject(oMap.TechnicalObject);
				this._oTechnicalObjectValueHelp.setTechObjIsEquipOrFuncnlLoc(oMap.TechObjIsEquipOrFuncnlLoc);
				this._oTechnicalObjectValueHelp.setIsValidTechnicalObject((oMap.TechnicalObject &&
					oMap.TechObjIsEquipOrFuncnlLoc) ? true : false);
				this._oTechnicalObjectValueHelp.setHierarchyNodeLevel(oMap.HierarchyNodeLevel);
			}
		},
		/**
		 * removes ui generated error messages
		 * @param  {String} sField the filed on which message needs to be removed
		 * 
		 */
		_removeMessage: function (sField, sType) {
			var sTarget = this.getView().getBindingContext().getPath() + "/" + sField;
			var sMessageType = sType || this.messageType.Error;
			var aMessages = sap.ui.getCore().getMessageManager()
				.getMessageModel().getData().filter(function (mItem) {
					return mItem.target === sTarget && mItem.type === sMessageType;
				});
			sap.ui.getCore().getMessageManager().removeMessages(aMessages);
			if (this._fieldsWithErrors > 0) {
				this._fieldsWithErrors -= 1;
			}
		},
		onPressMyDraft: function(oEvent){
					var oParams = {},
						sMessage=this._i18n("xmsg.savingDraftMsg");
					//	oParams.DraftContext = false;
						this.bcreateNew = false;
					if(!this.bdigDraftBtn){
					MessageToast.show(sMessage, {
					closeOnBrowserNavigation: false
					});
					}
					var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
						if (oCrossAppNavigator) {
							oCrossAppNavigator.toExternal({
								target: {
									semanticObject: "MaintenanceNotification",
								   action: "list_simple"
								}
								//params: oParams
							});
						}
				
			},

		/**
		 * event handler for save button press event
		 */
		onPressSave: function () {
			if (!this._checkBeforeSave()) {
				return;
			}
			// remove messages coming from server side
			sap.ui.getCore().getMessageManager().removeAllMessages();
			this.getView().setBusy(true);
        this._activateDraft();
        
		},
		_activateDraft: function () {
			var sPath = this.getView().getBindingContext().getPath();
			var oModel = this.getView().getModel();
		//	var sDraftUUID =  oModel.getProperty(sPath + "/DraftUUID");
			if(sPath && oModel){
				this._sMaintNotifDetectionCodeGroup = oModel.getProperty(sPath + "/NewDetectionGroup");
				
				if(this._sMaintNotifDetectionCodeGroup !== ""){
					oModel.setProperty(sPath + "/NewDetectionGroup", "");
					oModel.setProperty(sPath + "/MaintNotifDetectionCatalog", "");
					// set detection code to empty if detection code group is empty			   
			}
			 this._sMaintNotifDetectionCode = oModel.getProperty(sPath + "/MaintNotifProcessSubPhaseCode");
					if(this._sMaintNotifDetectionCode !== ""){
						oModel.setProperty(sPath + "/MaintNotifProcessSubPhaseCode", "");}
			 this._sNewDetectionMethodText = oModel.getProperty(sPath + "/NewDetectionMethodText");
					if(this._sNewDetectionMethodText !== ""){
						oModel.setProperty(sPath + "/NewDetectionMethodText", "");}
			}
			var oActivateDraft = this._oApplicationController.getTransactionController().getDraftController().activateDraftEntity(this.getView().getBindingContext(), true);

			oActivateDraft.then(function (oResponse) {
				// call back for success full save
				this._onSuccessSave(oResponse);
				this.getView().setBusy(false);
			}.bind(this)).catch(function () {
				this.getView().setBusy(false);
			}.bind(this));
		},
		/** 
		 * 
		 * @constructor 
		 * @returns array of messages with target not null
		 */
		_getTargettedMessages: function (aMessages) {
			var aTargetMessages = [],
				oMessage;

			for (var i = 0; i < aMessages.length; i++) {
				oMessage = aMessages[i];
				if (oMessage.getTarget() && oMessage.getType() === this.messageType.Error) {
					aTargetMessages.push(oMessage);
				}
			}
			return aTargetMessages;
		},
		_removeTechnicalMessages: function (aMessages) {
			var aTechnicalMessages = [];
			var sPath = this.getView().getBindingContext().getPath();
			aMessages = aMessages.reduce(function (acc, oMessage) {
				if (oMessage.getTechnical() || oMessage.getTarget() === sPath) {
					aTechnicalMessages.push(oMessage);
				} else {
					acc.push(oMessage);
				}
				return acc;
			}, []);
			sap.ui.getCore().getMessageManager().removeMessages(aTechnicalMessages);
			return aMessages;
		},
		_checkBeforeSave: function () {
			// Check smart fields for client errors before saving (mandatory fields, wrong input types) 
			this.getView().byId("createWrSmartFormTechnical").check();
			//this.getView().byId("createWrSmartFormGeneral").check();
			if (this.getView().byId("createWrPanelGeneral").getVisible()) {
			this._checkGenearlFormErrors(); 
		}
			this.getView().byId("createWrSmartFormResponsibilities").check();

			var oMessageManager = sap.ui.getCore().getMessageManager();
			var aMessages = oMessageManager.getMessageModel().getData();
			aMessages = this._getTargettedMessages(aMessages);
			aMessages = this._removeTechnicalMessages(aMessages);
			if (aMessages && aMessages.length) {
				return false;
			}
			return true;
		},
		/*
		 * Function called to create a message leveraged by the Message manager
		 * @params sField {String} field to be validated in odata model
		 * @params sMessage {String} i18n String object reference for the error message
		 * @params messageType {sap.ui.core.Library.MessageType} message type (Success, Error etc.)
		 * 
		 */
		_createMessage: function (sField, sMessage, messageType) {
			var sTarget = this.getView().getBindingContext().getPath() + "/" + sField;
			var aMessages = sap.ui.getCore().getMessageManager()
				.getMessageModel().getData().filter(function (mItem) {
					return mItem.target === sTarget;
				});

			if (!aMessages.length) {
				var oMessage = new Message({
					message: sMessage,
					type: messageType,
					target: sTarget,
					processor: this.getView().getModel(),
					persistent: false,
					technical: false
				});
				sap.ui.getCore().getMessageManager().addMessages(oMessage);
				if (messageType === this.messageType.Error) {
					this._fieldsWithErrors += 1;
				}
			}
		},
		_checkGenearlFormErrors: function () {

			var oFailureModeCodeGroupField = this.byId("createWrSmartFieldFailureModeGroup");
			if (oFailureModeCodeGroupField&&oFailureModeCodeGroupField.getMandatory()) {
	    	var oFailureModeCodeGroupComboBox = oFailureModeCodeGroupField.getInnerControls()[0];
			if (oFailureModeCodeGroupComboBox.getSelectedKey() === "") {
			//	oFailureModeCodeGroupComboBox.setValueState("Error");
			//	oFailureModeCodeGroupComboBox.setValueStateText(this._i18n("xmsg.failureModeGroupMandatory"));
				this._createMessage("MaintNotificationCodeGroup", this._i18n("xmsg.failureModeGroupMandatory"), this.messageType.Error);
			}
		}

		var oFailureModeCodeField = this.byId("createWrSmartFieldFailureMode");
			if (oFailureModeCodeField&&oFailureModeCodeField.getMandatory()) {
	    	var oFailureModeCodeComboBox = oFailureModeCodeField.getInnerControls()[0];
			if (oFailureModeCodeComboBox.getSelectedKey() === "") {
				this._createMessage("MaintNotificationCode", this._i18n("xmsg.failureModeMandatory"), this.messageType.Error);
			}
		}

		var oMalEffectField = this.byId("createWrSmartFieldMalEffect");
			if (oMalEffectField&&oMalEffectField.getMandatory()) {
	    	var oMalEffectComboBox = oMalEffectField.getInnerControls()[0];
			if (oMalEffectComboBox.getSelectedKey() === "") {
				this._createMessage("MalfunctionEffect", this._i18n("xmsg.malEffectMandatory"), this.messageType.Error);
			}
		}

		var oDetectionCodeGroupField = this.byId("createWrSmartFieldDetectionCodeGroup1");
			if (oDetectionCodeGroupField&&oDetectionCodeGroupField.getMandatory()) {
	    	var oDetectionCodeGroupComboBox = oDetectionCodeGroupField.getInnerControls()[0];
			if (oDetectionCodeGroupComboBox.getSelectedKey() === "") {
				this._createMessage("NewDetectionGroup", this._i18n("xmsg.detectionCodeGroupMandatory"), this.messageType.Error);
			}
		}

		var oDetectionCodeField = this.byId("createWrSmartFieldDetectionCode1");
			if (oDetectionCodeField&&oDetectionCodeField.getMandatory()) {
	    	var oDetectionCodeComboBox = oDetectionCodeField.getInnerControls()[0];
			if (oDetectionCodeComboBox.getSelectedKey() === "") {
				this._createMessage("MaintNotifProcessSubPhaseCode", this._i18n("xmsg.detectionCodeMandatory"), this.messageType.Error);
			}
		}
		},

		onFailureModeGroupChanged: function (oEvent) {
			// clear failure mode code if failure mode code group is changed
			//this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/MaintNotificationCode", "");
		   var oField = oEvent.getSource();
		   var oComboBox = oEvent.getSource().getInnerControls()[0];
		   if (oComboBox.getSelectedKey() === "") {
				this._createMessage("MaintNotificationCodeGroup", this._i18n("xmsg.failureModeGroupMandatory"), this.messageType.Error);
			} else {
				this._removeMessage("MaintNotificationCodeGroup");
			}
		},
		onFailureModeChanged: function (oEvent) {
			var oComboBox = oEvent.getSource().getInnerControls()[0];
		   if (oComboBox.getSelectedKey() === "") {
				this._createMessage("MaintNotificationCode", this._i18n("xmsg.failureModeMandatory"), this.messageType.Error);
			} else {
				this._removeMessage("MaintNotificationCode");
			}
		},
		onEffectChanged: function (oEvent) {
			var oComboBox = oEvent.getSource().getInnerControls()[0];
		   if (oComboBox.getSelectedKey() === "") {
				this._createMessage("MalfunctionEffect", this._i18n("xmsg.malEffectMandatory"), this.messageType.Error);
			} else {
				this._removeMessage("MalfunctionEffect");
			}
		},
		onDetectionCodeGroupChanged: function (oEvent) {
			var oComboBox = oEvent.getSource().getInnerControls()[0];
		   if (oComboBox.getSelectedKey() === "") {
				this._createMessage("NewDetectionGroup", this._i18n("xmsg.detectionCodeGroupMandatory"), this.messageType.Error);
			} else {
				this._removeMessage("NewDetectionGroup");
			}
		},
		onDetectionCodeChanged: function (oEvent) {
			var oComboBox = oEvent.getSource().getInnerControls()[0];
		   if (oComboBox.getSelectedKey() === "") {
				this._createMessage("MaintNotifProcessSubPhaseCode", this._i18n("xmsg.detectionCodeMandatory"), this.messageType.Error);
			} else {
				this._removeMessage("MaintNotifProcessSubPhaseCode");
			}
		},


		/** 
		 * checks if message header has sap-message and returns the message text
		 * @constructor 
		 * @param oResponse response from activate draft
		 * @returns sMessage
		 */
		_getMessageText: function (oResponse) {
			var oMessageHeader = null;
			var sMessage = this._i18n("xmsg.workRequestCreated");
			if (oResponse &&
				oResponse.response &&
				oResponse.response.headers && oResponse.response.headers && oResponse.response.headers["sap-message"]) {
				oMessageHeader = JSON.parse(oResponse.response.headers["sap-message"]);
				sMessage = oMessageHeader.message;
			}

			return sMessage;
		},
		/**
		 * callback after succesful work request save
		 */
		_onSuccessSave: function (oResponse) {
			var sMessage = this._getMessageText(oResponse);

			MessageToast.show(sMessage, {
				closeOnBrowserNavigation: false
			});
			var sNotifId = oResponse && oResponse.data && oResponse.data.MaintenanceNotification;
             var that = this;
			if (sNotifId) {
				if( this._sMaintNotifDetectionCodeGroup !== "" || this._sMaintNotifDetectionCode !== "" || this._sNewDetectionMethodText !== ""){
						var oDefaultParams =  {MaintNotificationActivity: "0010",
							  MaintenanceNotification: sNotifId,
							  MaintenanceNotificationItem: "",
							  MaintNotifActivitySortNumber: "",
							  MaintNotifActyTxt: this._sNewDetectionMethodText,
							   MaintNotifActivityCodeCatalog: "A",
				              MaintNotifActivityCodeGroup: this._sMaintNotifDetectionCodeGroup,
							  MaintNotificationActivityCode: this._sMaintNotifDetectionCode};
			// create activity draft for the activated notification
			this.getView().getModel().create("/xPM11x_MAINTNOTIFACTIVITY", oDefaultParams, {
				success: function () {
					// activity draft created successfully
					that._navigateToWorkRequestList();
				}.bind(this),
				error: function (oResponse) {
					// error creating activity draft
					var sMessage = this._getMessageText(oResponse);

			MessageToast.show(sMessage, {
				closeOnBrowserNavigation: false
			});
				}.bind(this)
			});
		}else{				this._navigateToWorkRequestList();}
			}
			
			
		},
		_navigateToWorkRequestList: function () { 

         sap.ushell.Container.getService("Personalization").getContainer("NotificationParams")
				.fail(function () {
					Log.error("Loading personalization data failed.");
				})
				.done(function (oContainer) {
					var oParamValues = oContainer.getItemValue("params");
					if (oParamValues && oParamValues.ObjId) {
						oParamValues.Notification = sNotifId;
						oContainer.setItemValue("params", oParamValues);
						oContainer.save(); // validity = 0 = transient, no roundtrip  
					}
				}.bind(this));
			if (sap.ushell && sap.ushell.Container) {

				if (this._oStartupParameters && this._oStartupParameters.preferredMode && this._oStartupParameters.preferredMode[0] === "create") {
					window.history.back(-1);
				} else {
					var oParams = {};
					
						//generic notif created 
						oParams.ProcessingContext = false;
					
					var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
					if (oCrossAppNavigator) {
						oCrossAppNavigator.toExternal({
							target: {
								semanticObject: "MaintenanceNotification",
								action: "list_simple"
							}
							//params: oParams
						});
					}
				}
			}

		},

        _setup: function () {
			if (!this._oApplicationController) {
				this._oApplicationController = new ApplicationController(this.oModel, this.getView());
				this._oApplicationController.attachEvent("beforeSideEffectExecution", this._onSideEffectsExecuted, this);
			}
			/*if (!this.NotificationConsequencePersistenceHelper) {
				this._NotificationConsequencePersistenceHelper = new NotificationConsequencePersistenceHelper(this.getView());
			} */
			if (!this._oDraftHandler) {
				this._oDraftHandler = new DraftHandler(this._oApplicationController, this.getView());
			}
			// get flp username and userid
			if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("UserInfo")) {
				this._sCurUserName = sap.ushell.Container.getService("UserInfo").getUser().getFullName();
				this._sCurUserId = sap.ushell.Container.getService("UserInfo").getUser().getId();
			}
			if (!this._oLocalViewModel) {
				this._oLocalViewModel = new JSONModel();
				this._oLocalViewModel.setProperty("/currentWorkRequests", 0);
				this._oLocalViewModel.setProperty("/createdByUserName", this._sCurUserName);
				this._oLocalViewModel.setProperty("/NotificationCreationDate", "");
				this._oLocalViewModel.setProperty("/MalfunctionStartDate", "");
				this._oLocalViewModel.setProperty("/emergencyNotification", false);
				this._oLocalViewModel.setProperty("/sMultiDraft", false);
				this._oLocalViewModel.setProperty("/isISPMConfigured", false);
				this._oLocalViewModel.setProperty("/isPM11TaskListConfigured", false);
				this.getView().setModel(this._oLocalViewModel, "viewProperties");
			}
			if (!this._oLongTextTemplateModel) {
				this._oLongTextTemplateModel = new JSONModel();
				this._oLongTextTemplateModel.setProperty("/busy", false);
				this._oLongTextTemplateModel.setProperty("/enabled", true);
				this.getView().setModel(this._oLongTextTemplateModel, "longTextTemplates");
			}


			// initialize the Technical object valuehelp
			this._fieldsWithErrors = 0;
			// initialize epm selection boolean
			this._isEPMSelected = false;
		},
		/** 
		 * event handler for event before side effect execution 
		 * @constructor 
		 * @param oEvent 
		 */
		_onSideEffectsExecuted: function (oEvent) {
			var oProperties = this._getPropertiesMap(["TechnicalObject", "TechObjIsEquipOrFuncnlLoc", "NotificationType", "MaintenancePlant"]);
			// check if notification type was changed
			var sNotifType = this.oModel.getProperty(this.getView().getBindingContext().getPath() + "/NotificationType");
		/*	if (this.bNotificationTypeChanged) {
				oProperties["NotificationType"] = "";
				this.bNotificationTypeChanged = false;
				this.getView().byId("createWrPriorityField").setEditable(true);
			} else if (!sNotifType) {
				this.getView().byId("createWrPriorityField").setEditable(false);
			}*/
			oEvent.getParameter("promise").then(function () {
				/*if (this._propertiesChanged(["TechnicalObject", "TechObjIsEquipOrFuncnlLoc", "NotificationType", "MaintenancePlant"],
						oProperties)) {
					this._getLongTextTemplates().then(this._setLongtextTemplates.bind(this));
				}*/
				if (this._propertiesChanged(["TechnicalObject", "TechObjIsEquipOrFuncnlLoc"], oProperties)) {
					this._setCurrentWorkRequestCount();
				}
			}.bind(this));
		},
		/** 
		 * creates a map for array of properties from current binding context
		 * @constructor 
		 * @param aProperties
		 * @returns
		 */
		_getPropertiesMap: function (aProperties) {
			var oMap = {};
			for (var i in aProperties) {
				oMap[aProperties[i]] = this.getView().getBindingContext().getProperty(aProperties[i]);
			}
			return oMap;
		},
		/** 
		 * checks if current context property values are different from oOldMap
		 * @constructor 
		 * @param aProperties
		 * @param oOldMap
		 * @returns
		 */
		_propertiesChanged: function (aProperties, oOldMap) {
			for (var i in aProperties) {
				if (this.getView().getBindingContext().getProperty(aProperties[i]) !== oOldMap[aProperties[i]]) {
					return true;
				}
			}
			return false;
		},
		/**
		 * helper function to get the count of current work requests for the given
		 *  TechnicalObject , TechnicalObjectType 
		 *  only considers active entity and processingphase <= Constants.WORK_REQUEST_STATUS.CURRENT
		 */
		_setCurrentWorkRequestCount: function () {
			var that = this;
			if (!this.getView().getBindingContext()) {
				return;
			}
			var oWorkRequest = this.getView().getBindingContext().getObject();
			if  (oWorkRequest.TechnicalObject !== "" && oWorkRequest.TechObjIsEquipOrFuncnlLoc !== "") {
				/**
				 * Performance Improvement
				 * private function to return field name for technical object filter
				 * 
				 */
				var _techObjIsFLorEqui = function(){
						if (oWorkRequest.TechObjIsEquipOrFuncnlLoc === Constants.FUNCTIONAL_LOCATION){
							return "FunctionalLocation";
						} else if (oWorkRequest.TechObjIsEquipOrFuncnlLoc === Constants.EQUIPMENT){
							return "Equipment";
						}
				};
				var aFilters = [new Filter({
						path: "IsActiveEntity",
						operator: FilterOperator.EQ,
						value1: "true"
					}),
					new Filter({
						path: _techObjIsFLorEqui(),
						operator: FilterOperator.EQ,
						value1: oWorkRequest.TechnicalObject
					}),
					new Filter({
						path: "NotifProcessingPhase",
						operator: FilterOperator.LE,
						value1: Constants.WORK_REQUEST_STATUS.CURRENT
					})
				];
				// FunctionalLocationName,Equipment
				new Promise(function (resolve) {
					that.oModel.read("/" + Constants.ENTITY.WORK_REQUEST_TP + "/$count", {
						filters: aFilters,
						success: function (sCount) {
							return resolve(sCount);
						}
					});
				}).then(function (sCount) {
					that._oLocalViewModel.setProperty("/currentWorkRequests", sCount);
				});
			} else {
				that._oLocalViewModel.setProperty("/currentWorkRequests", 0);
			}
		
		},
		/**
		 * event handler for current work requests link in message bar
		 */
		onShowCurrentWorkRequests: function (oEvent) {
			 var oNotification = this.getView().getBindingContext().getObject();
			// navigate to current work requests view 
			//this.getRouter().navTo("showCurrentWorkRequests", {}, true /*no history*/ );
		//	var aFilters = AppController().buildFilterForNotifications(oNotification, Constants.GENERAL.COUNT_ALL_NOTIFICATIONS);
		//that._sTechnicalObject = that._oWorkRequest.TechnicalObject;
				//	that._sTechObjIsEquipOrFuncnlLoc = that._oWorkRequest.TechObjIsEquipOrFuncnlLoc;
		
		  var _techObjIsFLorEqui = function(){
						if ( oNotification.TechObjIsEquipOrFuncnlLoc === Constants.FUNCTIONAL_LOCATION){
							return "FunctionalLocation";
						} else if ( oNotification.TechObjIsEquipOrFuncnlLoc === Constants.EQUIPMENT){
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
							value1: oNotification.TechnicalObject
						// }), new Filter({
						// 	path: "TechObjIsEquipOrFuncnlLoc",
						// 	operator: FilterOperator.EQ,
						// 	value1: that._sTechObjIsEquipOrFuncnlLoc
						}),
						new Filter({
							path: "NotifProcessingPhase",
							operator: FilterOperator.LE,
							value1: Constants.WORK_REQUEST_STATUS.CURRENT
						})];
			var _oUtil = new Util();
			this.oCurrentNotifPopover = _oUtil.launchPopoverCurrentNotifications(oNotification, aFilters, oEvent.getSource(), this.getView());
		},

		onShowRecommendedTaskList: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext();
			var sTechnicalObject = oContext.getProperty("TechnicalObject");
			var sFailureMode = oContext.getProperty("MaintNotificationCode") || "";

			if (!sTechnicalObject && !sFailureMode) {
				MessageToast.show(this._i18n("xmsg.technicalObjectAndFailureModeEmpty"));
			} else {
				this._showRecommendedTaskList();
			}
		},
		onMNotificationItemPress: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext();
			var sMaintenanceNotification = oContext.getProperty("MaintenanceNotification");
			 var oPopover = this.getView().byId("RespPopoverCurrentNotifs");
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

        
			}		
		},	
		_showRecommendedTaskList: function () {
			if (!this._pRecommendedTaskList) {
				this._pRecommendedTaskList = this.loadFragment(
					{ name: "pm11.zpm11nftcreate.view.fragments.RecommendedTaskList" }
				).then(function (oDialog) {
					this.byId("idTaskListSmartTable").setRequestAtLeastFields("MaintRecmdnTypeDescription,LongText");
					this.getView().addDependent(oDialog);
					this._oRecommendedTaskList = oDialog;
					this._oRecommendedTaskListTable = this.byId("idTaskListResponsiveTable");
				}.bind(this));
			}

			this._pRecommendedTaskList.then(function () {
				this._oLocalViewModel.setProperty("/bEnableRecommendedSelection", false);
				this._oRecommendedTaskListTable.removeSelections();
				var oRecmdnsCtx = this._getTaskListRecommendationsContext();
				this._oRecommendedTaskListTable.setBindingContext(oRecmdnsCtx);
				this._oRecommendedTaskList.open();
			}.bind(this));
		},
		_getTaskListRecommendationsContext: function () {
			var oContext = this.getView().getBindingContext();
			var sTechnicalObject = oContext.getProperty("TechnicalObject");
			var sMaintNotificationCodeGroup = oContext.getProperty("MaintNotificationCodeGroup") || "";
			var sFailureMode = oContext.getProperty("MaintNotificationCode") || "";
			var sCatalogProfile = oContext.getProperty("CatalogProfile");
			var sTechObjIsEquipOrFuncnlLoc = oContext.getProperty("TechObjIsEquipOrFuncnlLoc");
			var sTableContextPath = this.oModel.createKey('/C_MaintWrkReqRecmddTskList', {
				P_TechnicalObject: sTechnicalObject,
				P_TechObjIsEquipOrFuncnlLoc: sTechObjIsEquipOrFuncnlLoc,
				P_CatalogProfile: sCatalogProfile,
				P_MaintRecmdnFailureModeGroup: sMaintNotificationCodeGroup,
				P_MaintRecmdnFailureMode: sFailureMode,
			});
			return new Context(this.oModel, sTableContextPath);
		},
			onPressCloseRecommendedTaskList: function () {
			this._oRecommendedTaskList.close();
		},


		onTaskListValueHelpRequest: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext();
			var sObject = oContext.getObject();
			var sTechnicalObject;
			if (sObject) {
				if (sObject.TechObjIsEquipOrFuncnlLoc !== Constants.EQUIPMENT) {
				  sTechnicalObject = sObject.TechnicalObjectLabel;
				}else {
                   sTechnicalObject = sObject.SuperiorTechnicalObjectLabel;
				}
		  }
			var oModel = this.getView().getModel();
			if (sTechnicalObject) {
			//	var sPath = encodeURIComponent("/xPM11xC_TaskListHierachy(p_technicalobject='" + sTechnicalObject + "')");
			var sPath = "/xPM11xC_TaskListHierachy(p_technicalobject='" + sTechnicalObject + "')/Set";
			
				if (!this._oPM11TaskListDialog) {
                sap.ui.core.Fragment.load({
                    name: "pm11.zpm11nftcreate.view.fragments.PM11TaskList",
                    controller: this
                }).then(function (oDialog) {
                    this._oPM11TaskListDialog = oDialog;
                  //  oDialog.setModel(tasklistmodel);
				  sap.ui.getCore().byId("treeTable").bindRows({
                           path: sPath,
                             parameters : {
                     countMode: 'Inline',
					 collapseRecursive: true,
					  numberOfExpandedLevels: 10,
                   treeAnnotationProperties : {
                      hierarchyLevelFor : 'HierarchyLevel',
                      hierarchyNodeFor : 'ObjectID',
                      hierarchyParentNodeFor : 'ParentObjectID',
                      hierarchyDrillStateFor : 'DrillState'
                        }
                           }});
                    this.getView().addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
              //  this._oPM11TaskListDialog.setModel(tasklistmodel);
			   sap.ui.getCore().byId("treeTable").bindRows({
                           path: sPath,
                             parameters : {
                     countMode: 'Inline',
					 collapseRecursive: true,
					  numberOfExpandedLevels: 10,
                   treeAnnotationProperties : {
                      hierarchyLevelFor : 'HierarchyLevel',
                      hierarchyNodeFor : 'ObjectID',
                      hierarchyParentNodeFor : 'ParentObjectID',
                      hierarchyDrillStateFor : 'DrillState'
                        }
                           }});
                this._oPM11TaskListDialog.open();
            }			
			}
		},

		onPressClosePM11TaskList: function () {
			this._oPM11TaskListDialog.close();
		},

		onPressSumbitPM11TaskList: function () {
			var selectedIndex = sap.ui.getCore().byId("treeTable").getSelectedIndex();
			if (selectedIndex !== -1) {
				var oSelectedContext = sap.ui.getCore().byId("treeTable").getContextByIndex(selectedIndex);
				var oSelectedItem = oSelectedContext.getObject();
				if (oSelectedItem && oSelectedItem.ObjectType && oSelectedItem.ObjectType !== "T") {
					MessageToast.show(this._i18n("xmsg.pleaseSelectTaskList"));
					return;
				}
				var sSelectedTaskList = oSelectedItem.ObjectID;
				sSelectedTaskList = sSelectedTaskList.replaceAll("-", "/");
				var sTaskListPath = this.getView().getBindingContext().getPath() + "/TaskList";
				this.oModel.setProperty(sTaskListPath, sSelectedTaskList);
				//this.oModel.submitChanges();
				this._oPM11TaskListDialog.close();
			}else{
				MessageToast.show(this._i18n("xmsg.pleaseSelectTaskList"));
			}
		},

		onSelectionChangeTaskListTable: function () {
			this._oLocalViewModel.setProperty("/bEnableRecommendedSelection", true);
		},
		onPressSumbitSelectionTaskList: function () {
			var sSelectedTaskList = this._oRecommendedTaskListTable.getSelectedItem().getBindingContext().getProperty("TaskList");
			var sTaskListPath = this.getView().getBindingContext().getPath() + "/TaskList";
			this.oModel.setProperty(sTaskListPath, sSelectedTaskList);
			this.oModel.submitChanges();
			this._oRecommendedTaskList.close();
		},
		_handleRecommendationsVisibility: function () {
			var oMetaModel = this.oModel.getMetaModel();
			oMetaModel.loaded().then(function () {
				if (!oMetaModel.getODataEntitySet(Constants.ENTITY.TASK_LIST_SET)) {
					var oRecmdTaskListBtn = this.byId("createWrButtonRecommendedTaskList");
					if (oRecmdTaskListBtn) {
						oRecmdTaskListBtn.destroy();
					}
				}
				if (!oMetaModel.getODataEntitySet(Constants.ENTITY.FAILURE_SET)) {
					var oRecmdFailureModeBtn = this.byId("createWrButtonRecommendedFailureMode");
					if (oRecmdFailureModeBtn) {
						oRecmdFailureModeBtn.destroy();
					}
					var oRecmdFailureEffectBtn = this.byId("createWrButtonRecommendedFailureEffect");
					if (oRecmdFailureEffectBtn) {
						oRecmdFailureEffectBtn.destroy();
					}
				}
			}.bind(this));
		},
		

    });
});