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
		}
	});
}, false);