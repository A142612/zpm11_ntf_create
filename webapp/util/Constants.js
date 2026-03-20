/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([], function () {
	"use strict";
	return Object.freeze({
		WORK_REQUEST_STATUS: {
			CURRENT: "3"
		},
		ENTITY: {
			TECHNICAL_OBJECT_FLAT: "C_TechObjFlatVH", //"C_TechObjFlatVH"
			TECHNICAL_OBJECT_FLAT_TYPE: "C_TechObjFlatVHType", //"C_TechObjFlatVHType"
			TECHNICAL_OBJECT_HIER: "C_TechObjCstmHierVH", //"C_TechObjHierVH"
			TECHNICAL_OBJECT_HIER_TYPE: "C_TechObjCstmHierVHType", //"C_TechObjHierVHType"
			WORK_REQUEST_TP: "xPM11x_MaintenanceNotification",
			WORK_REQUEST_TP_TYPE:"xPM11x_MaintenanceNotificationType",
			LONG_TEXT_TEMPLATE:"C_WorkReqTextTemplateVH"
		},
		GENERAL: {
		    MESSAGETOAST_DELAY: 5000,
		    MESSAGETOAST_CLOSE_ON_NAV: false,
		    BUSY_INDICATOR_DELAY: 1000,
		    COUNT_OPEN_NOTIFICATIONS: "open",
		    COUNT_HISTORY_NOTIFICATIONS: "history",
		    COUNT_ALL_NOTIFICATIONS: "",
		    // replace property for location data (GPS)
		    //	this is used in GeoMap to store the coordinates 
		    //  as soon as there is a dedeicated field to store the value in the entity 
		    LOCATION_GPS: "Location",
		    //LOCATION_GPS: "LocationGPS",
		    
		    NOTIFICATION_CHANGE_SET: "notification-change-set",
		    NOTIFICATION_BATCH_GROUP:"notification-batch-group"
		},
		ROUTES: {
			CREATE: "create",
			EDIT: "edit",
			DISPLAY: "display",
			LIST: "list",
			NavType:{ 
			    initial : "initial",
			    iAppState : "iAppState",
			    xAppState : "xAppState",
			    URLParams : "URLParams"
			}
		},
		EQUIPMENT: "EAMS_EQUI",
		FUNCTIONAL_LOCATION: "EAMS_FL",
		ENTITY_NAMESPACE:"cds_ui_maintworkrequestoverview",
		ATTACHMENT_SERVICE: {
			COMPONENT_NAME: "sap.se.mi.plm.lib.attachmentservice.attachment",
			OBJECT_TYPES: {
				NOTIFICATION: "PMQMEL"
			},
			TEMP_KEY: 123,
			MODE: {
				CREATE: "I",
				CHANGE: "C",
				DISPLAY: "D"
			},
			STATUS: {
				UPLOADCOMPLETED: "UPLOADCOMPLETED",
				RENAMECOMPLETED: "RENAMECOMPLETED"
			}
		},
		ATTACHMENTS:{
          ATTACHMENTMODE_DISPLAY : "D",
          ATTACHMENTMODE_CREATE :  "I",
          OBJECTTYPE_NOTIFICATION: "PMQMEL",
          OBJECTTYPE_FLOC: "IFLOT",
          OBJECTTYPE_EQUI: "EQUI"
        },
        
		MODEL: {
		    
		    ODATA:{
		        TECH_OBJECT_TYPE_EQUI: "EAMS_EQUI",
		        TECH_OBJECT_TYPE_FLOC: "EAMS_FL"
		    },
		    
			APP_MODEL: {
				NAME: "appProperties",
				PROPERTIES: {
				    IS_BUSY: "/busy",
				    IS_METADATA_LOADED: "/isMetadataLoaded",
					DELAY: "/delay",
					CAMERA_AVAILABLE: "/hasCamera",
					GPS_AVAILABLE: "/hasGPS",
					BARCODE_AVAILABLE: "/hasScanner",
					ATTACHMENTS_AVAILABLE: "/AttachmentsAvailable",
					IS_STARTUP_CREATE: "/isStartupCreate",
					IS_CREATE_MODE: "/isCreateMode" // Create : true | Edit: false
				}
			},

			DEVICE_MODEL: {
				NAME: "device",
				PROPERTIES: {
					IS_DESKTOP: "/system/desktop",
					IS_PHONE: "/system/phone"
					
				}
			},
			VIEW_PROP: {
				NAME: "viewProperties",
				PROPERTIES: {
					GENERAL: {
					    GPS_DATA_AVAILABLE: "/hasGPSData",
						CNT_CURRENT_NOTIFICATIONS: "/openNotifCount",
						CNT_HISTORY_NOTIFICATIONS: "/historyNotifCount",
						TECHNICAL_OBJECT_GIVEN: "/hasTechObject",
						TECHNICAL_OBJECT_VALID: "/techObjectValid",
						TEXTTEMPLATES_AVAILABLE: "/hasTemplates",
						VALID_USER_GIVEN: "/hasValidUser",
						DISPLAY_MAP_INPLACE: "/displayMapInplace",
						CHANGE_ALLOWED: "/changeAllowed",
						NAVTOEDIT_ALLOWED: "/navToEditAllowed",
						ATTACHMENTMODE: "C",
						USER_CAN_BE_NOTIFIED: "/UserCanBeNotified",
						ADDITIONAL_SEARCH_OPTIONS_ON:"/alsoFindViaOn"					
					},

					S0: {
						USER_ID: "/UserId"
					},
					S1: {

					},
					S2: {
						TITLE: "/title"
					},
					S3: {
						TITLE: "/title",
						TITLE_NOTES : "/NotesTitle",
						TITLE_CONTACTS : "/ContactsTitle"
					}

				}
			}
		}
		
	});
}, false);