/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/core/format/DateFormat"], function (DateFormat) {
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
	};
});