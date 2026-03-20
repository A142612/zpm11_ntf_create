/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/m/Text","sap/ui/core/format/DateFormat"], function (Text, DateFormat) {
	"use strict";
	return {
		showCurrentWorkRequestsMessage: function (nCount) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			if (nCount > 1) {
				return oResourceBundle.getText("xmsg.openNotifications.Multiple", nCount);
			} else {
				return oResourceBundle.getText("xmsg.openNotifications.Single", nCount);
			}

		},
		/*
		 * Function called to return Location Name and Location Id concatenated to display in the Location field
		 * Expected result: sDescription (sId)
		 * @param sDescription {String}
		 * @param sId {String}
		 * @param sDependantField {String} 
		 * */
		_concatIdAndDescription: function (sDescription, sId, sDependantField) {
			if (sDependantField === "") {
				return "";
			}
			if (sDescription && sDescription.trim()) {
				return sDescription + ((sId) ? " (" + sId + ")" : "");
			} else if (sId && sId.trim()) {
				return sId;
			} else {
				return "";
			}
		},
		formatDateTimeToString: function (oDate, oTime) {
			var tzOffset = new Date(0).getTimezoneOffset() * 60 * 1000;
			var sDateTime = "";
			var dateTimeFormatter = DateFormat.getDateTimeInstance({
				style: "medium"
			});
			if (oDate) {
				if (oTime && oTime.ms) {
					oTime = new Date(oTime.ms + tzOffset);
					oDate.setHours(oTime.getHours());
					oDate.setMinutes(oTime.getMinutes());
					oDate.setSeconds(oTime.getSeconds());
				}
				sDateTime = dateTimeFormatter.format(oDate);
			}
			return sDateTime;
		},
		formatWorkRequestStatus: function (sStatus) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			var sCurStatus = sStatus;
			switch (sStatus) {
			case "1":
				sCurStatus = oResourceBundle.getText("xtxt.status.Submitted");
				break;
			case "3":
				sCurStatus = oResourceBundle.getText("xtxt.status.Accepted");
				break;
			case "4":
				sCurStatus = oResourceBundle.getText("xtxt.status.Completed");
				break;
			default:
				sCurStatus = "";
				break;
			}
			return sCurStatus;
		},
		// Display the button type according to the message with the highest severity
		// The priority of the message types are as follows: Error > Warning > Success > Info
		buttonTypeFormatter: function () {
			var sHighestSeverity,
				oMessageManager = sap.ui.getCore().getMessageManager(),
				aMessages = oMessageManager.getMessageModel().getData();
			aMessages.forEach(function (sMessage) {
				switch (sMessage.type) {
				case "Error":
					sHighestSeverity = "Negative";
					break;
				case "Warning":
					sHighestSeverity = sHighestSeverity !== "Negative" ? "Critical" : sHighestSeverity;
					break;
				case "Success":
					sHighestSeverity = sHighestSeverity !== "Negative" && sHighestSeverity !== "Critical" ? "Success" : sHighestSeverity;
					break;
				default:
					sHighestSeverity = !sHighestSeverity ? "Neutral" : sHighestSeverity;
					break;
				}
			});

			return sHighestSeverity;
		},

		// Set the button icon according to the message with the highest severity
		buttonIconFormatter: function () {
			var sIcon,
				oMessageManager = sap.ui.getCore().getMessageManager(),
				aMessages = oMessageManager.getMessageModel().getData();

			aMessages.forEach(function (sMessage) {
				switch (sMessage.type) {
				case "Error":
					sIcon = "sap-icon://message-error";
					break;
				case "Warning":
					sIcon = sIcon !== "sap-icon://message-error" ? "sap-icon://message-warning" : sIcon;
					break;
				case "Success":
					sIcon = "sap-icon://message-error" && sIcon !== "sap-icon://message-warning" ? "sap-icon://message-success" : sIcon;
					break;
				default:
					sIcon = !sIcon ? "sap-icon://message-information" : sIcon;
					break;
				}
			});

			return sIcon;
		},
		/**
		 * formatter for Link to Current Notifications
		 * @param {string} sCount Amount of open notifications 
		 * @return {string} link text
		 * @public
		 */
		formatCurrentNotificationLink: function(sCount) {

			var oBundle = this.getModel("i18n").getResourceBundle();
			var sLinkText = oBundle.getText("xlnk.currentNotifications", [sCount]);
			return sLinkText;

		},

		/**
		 * formatter for DateMonitor: Convert to tooltip
		 * @param {string} sDateMonitor 
		 * @return {string} tooltip text
		 * @public
		 */	
		formatDateMonitorTooltip: function(sDateMonitor) {
			// Set Tooltip for Date Monitor Icon
			var sTooltip = "";
			var oBundle = this.getModel("i18n").getResourceBundle();

			switch (sDateMonitor) {
				case "I":
					// inactive LED
					sTooltip = oBundle.getText("xtol.inactive");
					break;
				case "G":
					// green LED
					sTooltip = oBundle.getText("xtol.startDateNotReached");
					break;
				case "Y":
					// yellow LED
					sTooltip = oBundle.getText("xtol.endDateNotReached");
					break;
				case "R":
					// red LED
					sTooltip = oBundle.getText("xtol.endDateReached");
                    break;
                default: break;
			}
			return sTooltip;
		},

		/**
		 * formatter for DateMonitor: Convert to icon
		 * @param {string} sDateMonitor 
		 * @return {string} icon 
		 * @public
		 */	
		formatDateMonitorToIcon: function(sDateMonitor) {

			if (!this.getModel("device").getProperty("/system/phone")) {
				// display icon only at phone
				return "";
			}

			switch (sDateMonitor) {
				case "I":
					// inactive LED
					return sap.ui.core.IconPool.getIconURI("status-inactive");
				case "G":
					// green LED
					return sap.ui.core.IconPool.getIconURI("status-positive");
				case "Y":
					// yellow LED
					return sap.ui.core.IconPool.getIconURI("status-in-process");
				case "R":
					// red LED
					return sap.ui.core.IconPool.getIconURI("status-negative");

				default:
					return sap.ui.core.IconPool.getIconURI("status-inactive");
			}
		},

		/**
		 * formatter for DateMonitor: Convert to icon
		 * @param {string} sDateMonitor 
		 * @return {string} icon 
		 * @public
		 */	
		formatDateMonitorToIconNoSizeCheck: function(sDateMonitor) {

			switch (sDateMonitor) {
				case "I":
					// inactive LED
					return sap.ui.core.IconPool.getIconURI("status-inactive");
				case "G":
					// green LED
					return sap.ui.core.IconPool.getIconURI("status-positive");
				case "Y":
					// yellow LED
					return sap.ui.core.IconPool.getIconURI("status-in-process");
				case "R":
					// red LED
					return sap.ui.core.IconPool.getIconURI("status-negative");

				default:
					return sap.ui.core.IconPool.getIconURI("status-inactive");
			}
		},

		/**
		 * formatter for DateMonitor: Convert icon color
		 * @param {string} sDateMonitor 
		 * @return {string} icon color
		 * @public
		 */	
		formatDateMonitorToIconColor: function(sDateMonitor) {

			switch (sDateMonitor) {
				case "I":
					return sap.ui.core.IconColor.Default;
				case "G":
					return sap.ui.core.IconColor.Positive;
				case "Y":
					// "yellow"
					return sap.ui.core.IconColor.Critical;
				case "R":
					return sap.ui.core.IconColor.Negative;

				default:
					return sap.ui.core.IconColor.Default;
			}
		},

		/**
		 * formatter for DateMonitor: Convert to text
		 * @param {string} sDateMonitor 
		 * @return {string} text value
		 * @public
		 */	
		formatDateMonitorToText: function(sDateMonitor) {

			var oBundle = this.getModel("i18n").getResourceBundle();
			if (this.getModel("device").getProperty("/system/phone")) {
				// display no text at phone
				return "";
			}

			switch (sDateMonitor) {
				case "I":
					return oBundle.getText("xsel.dateMonitorStatusInactice");
				case "G":
					return oBundle.getText("xsel.dateMonitorStatusStartDateNotReached");
				case "Y":
					return oBundle.getText("xsel.dateMonitorStatusEndDateNotReached");
				case "R":
					return oBundle.getText("xsel.dateMonitorStatusOverdue");

				default:
					return oBundle.getText("xsel.dateMonitorStatusInactice");
			}
		},

		/**
		 * formatter for DateMonitor: Convert to State value
		 * @param {string} sDateMonitor 
		 * @return {string} State value
		 * @public
		 */	
		formatDateMonitorToState: function(sDateMonitor) {

			switch (sDateMonitor) {
				case "I":
					return sap.ui.core.ValueState.Warning;
				case "G":
					return sap.ui.core.ValueState.Success;
				case "Y":
					return sap.ui.core.ValueState.Warning;
				case "R":
					return sap.ui.core.ValueState.Error;

				default:
					return sap.ui.core.ValueState.None;
			}
		},

		/**
		 * formatter for Timestamp field
		 * @param {string} sDate Date field as Timestamp
		 * @return {string} readable Date and Time
		 * @public
		 */	
		formatDateTimeToString: function(oDateTime) {

			if (oDateTime !== null) {
				if (typeof oDateTime === "string") {

					oDateTime = oDateTime.replace("/Date(", "").replace(")/", "");
					oDateTime = parseInt(oDateTime, 10); // number ms
					oDateTime = new Date(oDateTime);

				}

				var dateTimeFormatter = DateFormat.getDateTimeInstance({
					style: "medium"
				});
				if (oDateTime) {
					return dateTimeFormatter.format(oDateTime);
				}
			}
		},

		/**
		 * checks if oValue contains any value
		 * @param {object} oValue: string or boolean
		 * @return {boolean} true when field contains value
		 * @public
		 */	
		checkForValidValue: function(oValue) {

			if (oValue === null || typeof oValue === "undefined" || oValue === "" ) {
				return false;
			} else {
				return (typeof oValue === "boolean") ? oValue : true;
			}
		},
		
		/**
		 * formatter for Attachment icon
		 * @param {string} sMimeType
		 * @return {string} Icon
		 * @public
		 */		
		formatAttachmentIcon: function(sMimeType) {
			var myIconMap = {}; // Create empty map
			myIconMap["application/msword"] = "sap-icon://doc-attachment";
			myIconMap["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] = "sap-icon://doc-attachment";
			myIconMap["application/rtf"] = "sap-icon://doc-attachment";
			myIconMap["application/pdf"] = "sap-icon://pdf-attachment";
			myIconMap["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] = "sap-icon://excel-attachment";
			myIconMap["application/msexcel"] = "sap-icon://excel-attachment";
			myIconMap["application/vnd.ms-powerpoint"] = "sap-icon://ppt-attachment";
			myIconMap["application/vnd.openxmlformats-officedocument.presentationml.presentation"] = "sap-icon://ppt-attachment";
			myIconMap["application/vnd.openxmlformats-officedocument.presentationml.slideshow"] = "sap-icon://ppt-attachment";
			myIconMap["application/mspowerpoint"] = "sap-icon://ppt-attachment";
			myIconMap["application/xml"] = "sap-icon://attachment-html";
			myIconMap["application/xhtml+xml"] = "sap-icon://attachment-html";
			myIconMap["application/x-httpd-php"] = "sap-icon://attachment-html";
			myIconMap["application/x-javascript"] = "sap-icon://attachment-html";
			myIconMap["application/gzip"] = "sap-icon://attachment-zip-file";
			myIconMap["application/x-rar-compressed"] = "sap-icon://attachment-zip-file";
			myIconMap["application/x-tar"] = "sap-icon://attachment-zip-file";
			myIconMap["application/zip"] = "sap-icon://attachment-zip-file";
			myIconMap["audio/voxware"] = "sap-icon://attachment-audio";
			myIconMap["audio/x-aiff"] = "sap-icon://attachment-audio";
			myIconMap["audio/x-midi"] = "sap-icon://attachment-audio";
			myIconMap["audio/x-mpeg"] = "sap-icon://attachment-audio";
			myIconMap["audio/x-pn-realaudio"] = "sap-icon://attachment-audio";
			myIconMap["audio/x-pn-realaudio-plugin"] = "sap-icon://attachment-audio";
			myIconMap["audio/x-qt-stream"] = "sap-icon://attachment-audio";
			myIconMap["audio/x-wav"] = "sap-icon://attachment-audio";
			myIconMap["image/png"] = "sap-icon://attachment-photo";
			myIconMap["image/tiff"] = "sap-icon://attachment-photo";
			myIconMap["image/bmp"] = "sap-icon://attachment-photo";
			myIconMap["image/jpeg"] = "sap-icon://attachment-photo";
			myIconMap["image/jpg"] = "sap-icon://attachment-photo";
			myIconMap["image/gif"] = "sap-icon://attachment-photo";
			myIconMap["text/plain"] = "sap-icon://attachment-text-file";
			myIconMap["text/comma-separated-values"] = "sap-icon://attachment-text-file";
			myIconMap["text/css"] = "sap-icon://attachment-text-file";
			myIconMap["text/html"] = "sap-icon://attachment-text-file";
			myIconMap["text/javascript"] = "sap-icon://attachment-text-file";
			myIconMap["text/plain"] = "sap-icon://attachment-text-file";
			myIconMap["text/richtext"] = "sap-icon://attachment-text-file";
			myIconMap["text/rtf"] = "sap-icon://attachment-text-file";
			myIconMap["text/tab-separated-values"] = "sap-icon://attachment-text-file";
			myIconMap["text/xml"] = "sap-icon://attachment-text-file";
			myIconMap["video/mpeg"] = "sap-icon://attachment-video";
			myIconMap["video/quicktime"] = "sap-icon://attachment-video";
			myIconMap["video/x-msvideo"] = "sap-icon://attachment-video";
			myIconMap["application/x-shockwave-flash"] = "sap-icon://attachment-video";

			return myIconMap[sMimeType] ? myIconMap[sMimeType] : "sap-icon://document";

		},

/**--------------------------------------------------------------------------------*/
         /**
		 * formatter for Object number and Description as string
		 * @param {string} sNumber
		 * @param {string} sDescription 
		 * @return {string} sNumber + ' ( ' + sDescription + ' )'
		 * @public
		 */		
		formatNumberDescriptionAsText: function( sNumber, sDescription ){
			var sreturn = "";
			if ( !sDescription === true ){
				if (!sNumber === true ) { sreturn = ""; }
				else					{ sreturn = sNumber;}	}
			else {
				if (!sNumber === true ) { sreturn = sDescription; }
				else					{ sreturn = sNumber + " (" + sDescription  + ")"; }
				}	
			return sreturn;
			},
	
/**--------------------------------------------------------------------------------*/
         /**
		 * formatter for Description and Object number as string
		 * @param {string} sDescription 
		 * @param {string} sNumber
		 * @return {string} sDescription + ' ( ' + sNumber + ' )'
		 * @public
		 */		
		formatDescriptionNumberAsText: function( sDescription, sNumber ){
			var sreturn = "";
			
			if ( !sDescription === true ){
				if (!sNumber === true ) { sreturn = ""; }
				else					{ sreturn = sNumber;}	}
			else {
				if (!sNumber === true ) { sreturn = sDescription; }
				else					{ sreturn = sDescription + " (" + sNumber + ")"; }
				}
			return sreturn;
			}
	};
});