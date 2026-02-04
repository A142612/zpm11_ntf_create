/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/base/ManagedObject",
	"sap/base/Log",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (
	ManagedObject,
	Log,
	Filter,
	FilterOperator
) {
	"use strict";

	return ManagedObject.extend("${project.artifactId}.util.NotificationConsequencePersistenceHelper", {
		metadata: {
			properties: {
				oView: {
					type: "object"
				}
			},
			events: {
				saved: {

				}
			}
		},
		oView: null,
		oModel: null,
		ConsequenceCategoryMap: {},
		sNotificationType: null,
		oPriorityMap: {},
		Constants: {
			GroupIdChanges: "Changes",
			ENTITY_SET: "C_MaintNotifEventPrioznTP",
			FIELDS: {
				PLANT: "Plant",
				PRIORITY_TYPE: "MaintPriorityType",
				NOTIFICATION_TYPE: "NotificationType",
				MAINTEVENTPRIOZNPROFILELABEL: "MaintEventPrioznProfileLabel",
				MAINTEVENTPRIOZNPRFL: "MaintEvtPrioritizationProfile",
				CONSEQUENCE_GROUP: "MaintEventConsequenceGroup",
				CONSEQUENCE_CATEGORY_CODE: "MaintEventCnsqncCategoryCode",
				CONSEQUENCE_CATEGORY_TITLE: "MaintEventCnsqncCategoryTitle",
				CONSEQUENCE_CATEGORY_SUB_TITLE: "MaintEvtCnsqncCategorySubTitle",
				CONSEQUENCE_CATEGORY_POSITION: "MaintEvtCnsqncCatPositionValue",
				CONSEQUENCE_CODE: "MaintEventConsequenceCode",
				CONSEQUENCE_TEXT: "MaintEvtConsequenceDescription",
				CONSEQUENCE_POSITION: "MaintEventCnsqncPositionValue",
				LIKELIHOOD_CODE: "MaintEventLikelihoodCode",
				LIKELIHOOD_TEXT: "MaintEvtLikelihoodDescription",
				LIKELIHOOD_POSITION: "MaintEvtLklihdPositionValue",
				MAINTPRIORITY: "MaintPriority",
				MAINTPRIORITYDESC: "MaintPriorityDesc",
				MAINTPRIORITYTYPE: "MaintPriorityType",
				LACD_DATE: "LACD_DATE",
				SELECTED_VALUES: "SELECTED_VALUES",
				LEADING_VALUES: "LEADING_VALUES",
				MAINTEVENTCONSEQUENCEISLEADING: "MaintEventConsequenceIsLeading"
			}
		},
		constructor: function (oView) {
			this.oView = oView;
			this.oModel = oView.getModel();
			return ManagedObject.call(this);
		},
		getSelectedConsequences: function () {
			var that = this;
			var sPath = this.oView.getBindingContext().getPath();

			return new Promise(function (resolve) {
				that.oModel.read(sPath + "/to_EventPrio", {
					success: function (aConsequences) {
						return resolve(aConsequences.results);
					}
				});
			}).then(function (aConsequences) {
				that.ConsequenceCategoryMap = aConsequences.reduce(function (acc, oItem) {
					acc[oItem.MaintEventCnsqncCategoryCode] = {
						MaintEventCnsqncCategoryCode: oItem.MaintEventCnsqncCategoryCode,
						MaintEventLikelihoodCode: oItem.MaintEventLikelihoodCode,
						MaintEventConsequenceCode: oItem.MaintEventConsequenceCode,
						donotDeleteFlag: false,
						DraftUUID: oItem.DraftUUID
					};
					return acc;
				}, {});
				return aConsequences;
			});
		},
		getPriorityColorCodeMap: function (sNotificationType) {
			var that = this;
			if (sNotificationType !== this.sNotificationType) {
				return new Promise(function (resolve) {
					that.oModel.read("/I_PMNotificationPriority", {
						filters: [new Filter({
							path: that.Constants.FIELDS.PRIORITY_TYPE,
							operator: FilterOperator.EQ,
							value1: sNotificationType
						})],
						success: function (oPriority) {
							var oPriorityMap = {};
							if (oPriority && oPriority.results) {
								oPriorityMap = oPriority.results.reduce(function (acc, oItem) {
									acc[oItem.MaintPriority] = {
										MaintPriorityType: oItem.MaintPriorityType,
										MaintPriorityColorCode: oItem.MaintPriorityColorCode,
										MaintPriorityDesc: oItem.MaintPriority_Text
									};
									return acc;
								}, {});
								that.sNotificationType = sNotificationType;
								that.oPriorityMap = oPriorityMap;
								return resolve(oPriorityMap);
							} else {
								that.sNotificationType = sNotificationType;
								that.oPriorityMap = {};
								return resolve({});
							}
						}
					});
				});
			} else {
				return Promise.resolve(that.oPriorityMap);
			}
		},
		saveEventPrioritisationDraftItem: function (aSelectedItems) {
			var that = this,
				sPath = this.oView.getBindingContext().getPath();
			var aMappedConsequences = this._mapNotificationConsequencs(aSelectedItems);
			if (Object.keys(this.ConsequenceCategoryMap).length === 0) {
				// no item in draft table
				if (aMappedConsequences.length > 0) {
					// create all
					aMappedConsequences.forEach(function (oItem) {
						that._createConsequence(oItem, sPath);
					});
				}
			} else {
				if (aMappedConsequences.length === 0) {
					Object.values(that.ConsequenceCategoryMap).forEach(function (oItem) {
						//delete all
						var sSelectedCategoryCode = oItem[that.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE];
						var sDeletepath = that._getChildEntityPath(oItem, that.ConsequenceCategoryMap[sSelectedCategoryCode]);
						that._deleteConsequence(sDeletepath).then(function () {
							that.fireEvent("saved");
						});
					});
				} else {
					aMappedConsequences.forEach(function (oItem) {
						var sSelectedCategoryCode = oItem[that.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE];
						if (that.ConsequenceCategoryMap.hasOwnProperty(sSelectedCategoryCode)) {
							var sUpdatePath = that._getChildEntityPath(oItem, that.ConsequenceCategoryMap[sSelectedCategoryCode]);
							that._updateConsequence(oItem, sUpdatePath).then(function () {
								that.fireEvent("saved");
							});
							that.ConsequenceCategoryMap[sSelectedCategoryCode].donotDeleteFlag = true;
						} else {
							that._createConsequence(oItem, sPath).then(function () {
								that.fireEvent("saved");
							});
						}
					});
					Object.values(that.ConsequenceCategoryMap).forEach(function (oItem) {
						if (!oItem.donotDeleteFlag) {
							//delete
							var sSelectedCategoryCode = oItem[that.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE];
							var sDeletepath = that._getChildEntityPath(oItem, that.ConsequenceCategoryMap[sSelectedCategoryCode]);
							that._deleteConsequence(sDeletepath).then(function () {
								that.fireEvent("saved");
							});
						}
					});
				}
			}

		},
		_mapNotificationConsequencs: function (aSelectedItems) {
			var that = this;
			var oMappedItems = aSelectedItems.map(function (oItem) {
				var oMappedItem = {};
				oMappedItem[that.Constants.FIELDS.MAINTEVENTPRIOZNPRFL] = oItem[that.Constants.FIELDS.MAINTEVENTPRIOZNPRFL.toUpperCase()];
				oMappedItem[that.Constants.FIELDS.CONSEQUENCE_GROUP] = oItem[that.Constants.FIELDS.CONSEQUENCE_GROUP.toUpperCase()];
				oMappedItem[that.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE] = oItem[that.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE.toUpperCase()];
				oMappedItem[that.Constants.FIELDS.CONSEQUENCE_CODE] = oItem[that.Constants.FIELDS.CONSEQUENCE_CODE.toUpperCase()];
				oMappedItem[that.Constants.FIELDS.LIKELIHOOD_CODE] = oItem[that.Constants.FIELDS.LIKELIHOOD_CODE.toUpperCase()];
				oMappedItem[that.Constants.FIELDS.MAINTEVENTCONSEQUENCEISLEADING] = oItem[that.Constants.FIELDS.MAINTEVENTCONSEQUENCEISLEADING.toUpperCase()];
				return oMappedItem;
			});
			return oMappedItems;
		},
		_createConsequence: function (oConsequence, sPath) {
			var that = this;
			oConsequence.MaintenanceNotification = this.oView.getBindingContext().getProperty("MaintenanceNotification");
			return new Promise(function (resolve, reject) {
				that.oModel.create(sPath + "/to_EventPrio", oConsequence, {
					groupId: that.Constants.GroupIdChanges,
					changeSetId: that.Constants.GroupIdChanges,
					success: resolve,
					error: reject
				});
			});

		},
		_updateConsequence: function (oConsequence, sPath) {
			var that = this;
			oConsequence.MaintenanceNotification = this.oView.getBindingContext().getProperty("MaintenanceNotification");
			return new Promise(function (resolve, reject) {
				that.oModel.update(sPath, oConsequence, {
					groupId: that.Constants.GroupIdChanges,
					changeSetId: that.Constants.GroupIdChanges,
					success: resolve,
					error: reject
				});
			});
		},
		_deleteConsequence: function (sPath) {
			var that = this;
			return new Promise(function (resolve, reject) {
				that.oModel.remove(sPath, {
					groupId: that.Constants.GroupIdChanges,
					changeSetId: that.Constants.GroupIdChanges,
					success: resolve,
					error: reject
				});
			});
		},
		_getChildEntityPath: function (oItem, oldItem) {
			var sMaintenanceNotification = this.oView.getBindingContext().getProperty("MaintenanceNotification");
			return this.oModel.createKey("/" + this.Constants.ENTITY_SET, {
				DraftUUID: oldItem.DraftUUID,
				MaintEventCnsqncCategoryCode: oItem[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE],
				MaintenanceNotification: sMaintenanceNotification,
				IsActiveEntity: false
			});
		}
	});
});