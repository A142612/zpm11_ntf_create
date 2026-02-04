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
], (Controller, MessageToast, JSONModel, Filter, FilterOperator, formatter, Message, Library, BaseController, Constants, ApplicationController, DraftHandler) => {
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
		_sManufacturerPartTypeName: "",
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
            oRouter.getRoute("RouteCreateNotification").attachMatched(this.onCreateWorkRequestMatched, this);
            oRouter.getRoute("draft").attachMatched(this.onDraftRouteMatched, this);



            // initialize the attachment component
		/*	this.initAttachmentComponent({
					mode: Constants.ATTACHMENT_SERVICE.MODE.CREATE,
					objectType: Constants.ATTACHMENT_SERVICE.OBJECT_TYPES.NOTIFICATION,
					objectKey: Constants.ATTACHMENT_SERVICE.TEMP_KEY
				},
				"workRequestCreateAttachSrvCompContCreate");*/ // attachment component id
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
			// if (!this.getView().getBindingContext().getProperty("ReportedByUser")) {
			// 	this.oModel.setProperty(this.getView().getBindingContext().getPath() + "/ReportedByUser",
			// 		this.getView().getBindingContext().getProperty("CreatedByUser"));
			// }

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
		/*	that.initAttachmentComponent({
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
			this._oLocalViewModel.setProperty("/sMultiDraft", false); */
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
		 * event handler for save button press event
		 */
		onPressSave: function () {
			//if (!this._checkBeforeSave()) {
			//	return;
			//}
			// remove messages coming from server side
			sap.ui.getCore().getMessageManager().removeAllMessages();
			this.getView().setBusy(true);
       /*  if (this._sActivityDraftUUID !== "") {
			var sEntityPath = "/xPM11x_MaintenanceNotifActy(MaintNotificationActivity='10',MaintenanceNotification='',DraftUUID=guid'" + this._sActivityDraftUUID +"',IsActiveEntity=false)";
	    	var actPath = "(MaintNotificationActivity='10',MaintenanceNotification='',DraftUUID=guid'" + this._sActivityDraftUUID +"',IsActiveEntity=false)";
			var activityData = this.getView().getModel().getData(sEntityPath);
			var sPath = this.getView().getBindingContext().getPath();
			var oModel = this.getView().getModel();
			var sDraftUUID =  oModel.getProperty(sPath + "/DraftUUID");
			sPath = "/" + Constants.ENTITY.WORK_REQUEST_TP + "(MaintenanceNotification='',DraftUUID=guid'" + sDraftUUID + "',IsActiveEntity=false)";


			if (activityData && activityData.MaintNotifActivityCodeGroup === '' && activityData.MaintNotificationActivityCode === '' && activityData.MaintNotifActyTxt ==='' ) {
				this.getView().getModel().remove(sEntityPath, {
					success: function () {
						// successfully deleted activity draft
						 this._activateDraft();
					}.bind(this),
					error: function () {
						// error deleting activity draft
					}
				});
				return ;
				var activityContext = this.getView().getModel().getContext(sEntityPath);
				activityContext.delete();

			//	this._oDraftHandler.discardDraft(sPath, {expand: sEntityPath}).then(function(){ this._activateDraft();	}.bind(this));
				//return;
				//this._oDraftHandler.discard(activityContext);
			}
	} */
        this._activateDraft();
          /*  var sPath = this.getView().getBindingContext().getPath();
			var oModel = this.getView().getModel();
			var sDraftUUID =  oModel.getProperty(sPath + "/DraftUUID");
			if(sPath && oModel){
				this._sMaintNotifDetectionCodeGroup = oModel.getProperty(sPath + "/MaintNotifDetectionCodeGroup");
				
				if(this._sMaintNotifDetectionCodeGroup !== ""){
					oModel.setProperty(sPath + "/MaintNotifDetectionCodeGroup", "");
					oModel.setProperty(sPath + "/MaintNotifDetectionCatalog", "");
					// set detection code to empty if detection code group is empty
					
				   
			}
			 this._sMaintNotifDetectionCode = oModel.getProperty(sPath + "/MaintNotifDetectionCode");
					if(this._sMaintNotifDetectionCode !== ""){
						oModel.setProperty(sPath + "/MaintNotifDetectionCode", "");}}
						var oNotifActivities =  [{MaintNotificationActivity: "0010",
							  MaintenanceNotification: "",
							  MaintenanceNotificationItem: "",
							  MaintNotifActivitySortNumber: "",
							  MaintNotifActyTxt: "",
				              MaintNotifActivityCodeGroup: this._sMaintNotifDetectionCodeGroup,
							  MaintNotificationActivityCode: this._sMaintNotifDetectionCode

						}];
						
			      oModel.setProperty(sPath + "/to_Activity", oNotifActivities);*/
		/*	var that = this;
		  var oDefaultParams = {
				 MaintNotificationActivity: "0010",
				 MaintenanceNotification: "",
				 MaintenanceNotificationItem: "",
				 MaintNotifActivitySortNumber: "",
				 MaintNotifActyTxt: "sdf dsfd",
				 MaintNotifActivityCodeCatalog: "A",
				MaintNotifActivityCodeGroup: this._sMaintNotifDetectionCodeGroup,
				 MaintNotificationActivityCode: this._sMaintNotifDetectionCode
			};*/
		// this._oApplicationController.getTransactionController().getDraftController().createNewDraftEntity(
			//		Constants.ENTITY.WORK_REQUEST_TP, "/" + Constants.ENTITY.WORK_REQUEST_TP + "(MaintenanceNotification='',DraftUUID=guid'" + sDraftUUID + "',IsActiveEntity=false)/to_Activity",  oDefaultParams, true, {sRootExpand: true})
			//	.then(function (oResponse) {
					//that._hidePlaceHolder();
					//return Promise.resolve(oResponse.data.DraftUUID);
				//	that._sActivityDraftUUID = oResponse.data.DraftUUID;
					// fire the activate action of draft
			//var oActivateDraft = that._oDraftHandler.activateDraft(that.getView()
			//	.getBindingContext(), true /*LenientSave*/ );
			//var oPrepareDraft = that._oApplicationController.getTransactionController().getDraftController().saveAndPrepareDraftEntity(
				//that.getView().getBindingContext(), {});
			//oPrepareDraft.then(function () {

			
			//	});

			//});
			
		},
		_activateDraft: function () {
			var sPath = this.getView().getBindingContext().getPath();
			var oModel = this.getView().getModel();
		//	var sDraftUUID =  oModel.getProperty(sPath + "/DraftUUID");
			if(sPath && oModel){
				this._sMaintNotifDetectionCodeGroup = oModel.getProperty(sPath + "/MaintNotifDetectionCodeGroup");
				
				if(this._sMaintNotifDetectionCodeGroup !== ""){
					oModel.setProperty(sPath + "/MaintNotifDetectionCodeGroup", "");
					oModel.setProperty(sPath + "/MaintNotifDetectionCatalog", "");
					// set detection code to empty if detection code group is empty			   
			}
			 this._sMaintNotifDetectionCode = oModel.getProperty(sPath + "/MaintNotifProcessSubPhaseCode");
					if(this._sMaintNotifDetectionCode !== ""){
						oModel.setProperty(sPath + "/MaintNotifProcessSubPhaseCode", "");}
			 this._sManufacturerPartTypeName = oModel.getProperty(sPath + "/ManufacturerPartTypeName");
					if(this._sManufacturerPartTypeName !== ""){
						oModel.setProperty(sPath + "/ManufacturerPartTypeName", "");}
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
		_checkBeforeSave: function () {
			// Check smart fields for client errors before saving (mandatory fields, wrong input types) 
			this.getView().byId("createWrSmartFormTechnical").check();
			this.getView().byId("createWrSmartFormGeneral").check();
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
				if( this._sMaintNotifDetectionCodeGroup !== "" || this._sMaintNotifDetectionCode !== "" || this._sManufacturerPartTypeName !== ""){
						var oDefaultParams =  {MaintNotificationActivity: "0010",
							  MaintenanceNotification: sNotifId,
							  MaintenanceNotificationItem: "",
							  MaintNotifActivitySortNumber: "",
							  MaintNotifActyTxt: this._sManufacturerPartTypeName,
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
		}
			}
			
		//	this._oApplicationController.getTransactionController().getDraftController().saveAndPrepareDraftEntity(this.getView().getBindingContext(), oDefaultParams, '/to_Activity' ).then(function(oResp){
         //    that._oApplicationController.getTransactionController().getDraftController().activateDraftEntity(
			//	that.getView().getBindingContext(), true, '/to_Activity' );

			//});
			
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
								semanticObject: "MaintenanceWorkRequest",
								action: "manage"
							},
							params: oParams
						});
					}
				}
			}

		},

        _setup: function () {
			if (!this._oApplicationController) {
				this._oApplicationController = new ApplicationController(this.oModel, this.getView());
				//this._oApplicationController.attachEvent("beforeSideEffectExecution", this._onSideEffectsExecuted, this);
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
				this.getView().setModel(this._oLocalViewModel, "viewProperties");
			}
			if (!this._oLongTextTemplateModel) {
				this._oLongTextTemplateModel = new JSONModel();
				this._oLongTextTemplateModel.setProperty("/busy", false);
				this._oLongTextTemplateModel.setProperty("/enabled", true);
				this.getView().setModel(this._oLongTextTemplateModel, "longTextTemplates");
			}

			// count for custom generated messages
			// initialize EPM dialog
			/*if (!this._oEPMDialog) {
				var that = this;
				this._oEPMDialog = new EventPrioritizationDialog();
				this._oEPMDialog.attachEvent("apply", function (oEvent) {
					// get prioritization profile
					// open EPM 
					that._oDraftHandler.showDraftSaving();
					this._NotificationConsequencePersistenceHelper.saveEventPrioritisationDraftItem(oEvent.getParameter("selectedItems"));
					this._NotificationConsequencePersistenceHelper.attachEvent("saved", function () {
						that._oDraftHandler.showDraftSaved();
					});
					this._removeMessage("MaintPriority", this.messageType.Warning);
					this._isEPMSelected = true;
					var oDateInstance = DateFormat.getDateInstance({
						UTC: true
					});
					var oDateTimeInstance = DateFormat.getDateTimeInstance({});
					this.oModel.setProperty(this.getView().getBindingContext() + "/MaintPriority", oEvent.getParameter("priority"));
					// this.oModel.setProperty(this.getView().getBindingContext() + "/MaintPriorityType", oEvent.getParameter("priorityType"));
					this.oModel.setProperty(this.getView().getBindingContext() + "/LatestAcceptableCompletionDate",
						oDateInstance.parse(oEvent.getParameter("lacdDate")));
					this.oModel.setProperty(this.getView().getBindingContext() + "/MaintNotifRqdStartDateTime",
						oDateTimeInstance.parse(oEvent.getParameter("requiredStartDate") + "T" + oEvent.getParameter("requiredStartTime")));
					this.oModel.setProperty(this.getView().getBindingContext() + "/MaintNotifRqdEndDateTime",
						oDateTimeInstance.parse(oEvent.getParameter("requiredEndDate") + "T" + oEvent.getParameter("requiredEndTime")));
					this.oModel.firePropertyChange({
						path: "MaintPriority",
						context: this.getView().getBindingContext()
					});
					this.byId("createWrPriorityField").setBindingContext(null);
					setTimeout(function () {
						this.byId("createWrPriorityField").setBindingContext();
					}.bind(this), 100);
				}.bind(this));
				//to get access to the global model
				this.getView().addDependent(this._oEPMDialog);
			} */

			// initialize the Technical object valuehelp
			this._fieldsWithErrors = 0;
			// initialize epm selection boolean
			this._isEPMSelected = false;
		},
    });
});