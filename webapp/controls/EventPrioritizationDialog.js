/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
		"sap/ui/core/XMLComposite",
		"sap/base/Log",
		"sap/ui/model/json/JSONModel",
		"sap/m/Tokenizer",
		"sap/m/Token",
		"sap/ui/core/ValueState",
		"sap/ui/core/theming/Parameters",
		"sap/ui/model/odata/v4/ODataModel",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator"
	], function (XMLComposite, Log, JSONModel, Tokenizer, Token, ValueState, Parameters, ODataModel, Filter, FilterOperator) {
		var EventPrioritizationDialog = XMLComposite.extend("pm11.zpm11nftcreate.controls.EventPrioritizationDialog", {
			metadata: {
				properties: {
					label: "string",
					value: "string",
					busy: {
						type: "boolean",
						defaultValue: false
					},
					url: {
						type: "string",
						defaultValue: "/sap/opu/odata4/sap/ui_prioritization_profile/srvd/sap/ui_prioritization_profile/0001/"
					},
					priorityColorCodeMap: {
						type: "object",
						defaultValue: {}
					},
					isCustomizingAvailablePromise: {
						type: "object"
					},
					selectedItemsPromise: {
						type: "object",
						defaultValue: Promise.resolve([])
					},
					priorityMapPromise: {
						type: "object",
						defaultValue: Promise.resolve({})
					},
					selectedItems: {
						type: "array",
						defaultValue: []
					},
					epmEnabled: {
						type: "boolean",
						defaultValue: true
					},
					EntityName: {
						type: "string",
						defaultValue: "MaintEvtPrioznPrfl"
					},
					FunctionImportName: {
						type: "string",
						defaultValue: "SAP__self.CalculateMaintEventPriority"
					},
					NotificationType: {
						type: "string",
						defaultValue: "M1"
					},
					Plant: {
						type: "string",
						defaultValue: "1710"
					},
					EventPrioritizationProfile: "string",
					bReload: {
						type: "boolean",
						defaultValue: false
					}
				},
				events: {
					cancel: {},
					apply: {
						parameters: {
							priority: "string",
							priorityDesc: "string",
							priorityType: "string",
							EventPrioritizationProfile: "string",
							selectedItems: "array",
							lacdDate: "string",
							requiredStartTime: "string",
							requiredEndTime: "string"
						}
					}
				}
			},
			Constants: {
				STATUS: {
					SUCCESS: "success"
				},
				CRITICALITY: {
					"3": ValueState.Success,
					"2": ValueState.Warning,
					"1": ValueState.Error,
					"0": ValueState.None
				},
				INITIALTEMPLATE: {
					maintPriority: "",
					maintPriorityDesc: "",
					lacdDate: "",
					leadingLikelihood: "",
					leadingLikelihoodText: "",
					leadingConsequenceText: "",
					leadingConsequence: "",
					leadingConsequenceCategory: "",
					leadingConsequenceCategoryText: "",
					selectedItems: [],
					list: []
				},
				OPERATORS: {
					AND: "and",
					EQ: "eq"
				},
				FIELDS: {
					PLANT: "Plant",
					NOTIFICATION_TYPE: "NotificationType",
					MAINWORKCENTER: "MainWorkCenter",
					MAINWORKCENTERPLANT: "MainWorkCenterPlant",
					MAINTPLANNINGPLANT:	"MaintPlanningPlant",
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
					REQUIRED_START_DATE: "REQUIRED_START_DATE",
					REQUIRED_END_DATE: "REQUIRED_END_DATE",
					REQUIRED_START_TIME: "REQUIRED_START_TIME",
					REQUIRED_END_TIME: "REQUIRED_END_TIME",
					MAINTEVENTCONSEQUENCEISLEADING: "MaintEventConsequenceIsLeading"
				}
			},
			sRequiredStartDate: null,
			sRequiredEndDate: null,
			sRequiredStartTime: null,
			sRequiredEndTime: null,
			priorityType: null,

			init: function () {
				var oModel = new JSONModel(Object.create(this.Constants.INITIALTEMPLATE));
				this.setModel(oModel, "epmModel");

			},

			_onTokenUpdate: function (oEvent) {
				var aTokens;

				if (oEvent.getParameter("type") === Tokenizer.TokenUpdateType.Removed) {
					aTokens = oEvent.getParameter("removedTokens");
					// remove selection get path of list item and set selected index = -1
					this.removeTokensFromModel(aTokens);
					this.getCalculatedFields();

				}
			},
			removeTokensFromModel: function (aTokens) {
				// get all CONSEQUENCE_CATEGORY_TITLE keys
				aTokens = aTokens.map(function (oItem) {
					return oItem.getBindingContext("epmModel").getProperty("consequenceKey");
				});
				// remove from model
				var aSelectedItems = this.getModel("epmModel").getProperty("/selectedItems");
				var aList = this.getModel("epmModel").getProperty("/list");
				aList = aList.map(function (oListItem) {
					if (aTokens.indexOf(oListItem.consequenceKey) !== -1) {
						if (oListItem.severities[oListItem.selectedConsequence]) {
							oListItem.severities[oListItem.selectedConsequence].selected = false;
						}
						if (oListItem.likelihood[oListItem.selectedLikelihood]) {
							oListItem.likelihood[oListItem.selectedLikelihood].selected = false;
						}
						oListItem.selectedConsequence = -1;
						oListItem.selectedLikelihood = -1;
					}
					return oListItem;
				});

				aSelectedItems = aSelectedItems.filter(function (oItem) {
					return aTokens.indexOf(oItem.consequenceKey) === -1;
				});
				if (aSelectedItems.length === 0) {
					this.getModel("epmModel").setProperty("/assesButtonEnabled", false);
				}
				this.getModel("epmModel").setProperty("/list", aList);
				this.getModel("epmModel").setProperty("/selectedItems", aSelectedItems);
			},
			enableAssessButton: function (aSelectedItems) {
				return aSelectedItems.length > 0;
			},
			clearAssessmentResult: function () {
				this.getModel("epmModel").setProperty("/maintPriority", "");
				this.getModel("epmModel").setProperty("/maintPriorityDesc", "");
				this.getModel("epmModel").setProperty("/lacdDate", "");
				this.getModel("epmModel").setProperty("/leadingLikelihood", "");
				this.getModel("epmModel").setProperty("/leadingLikelihoodText", "");
				this.getModel("epmModel").setProperty("/leadingConsequenceText", "");
				this.getModel("epmModel").setProperty("/leadingConsequence", "");
				this.getModel("epmModel").setProperty("/leadingConsequenceCategory", "");
				this.getModel("epmModel").setProperty("/leadingConsequenceCategoryText", "");
			},
			onConsequenceChanged: function (oEvent) {
				var oCtx = oEvent.getSource().getBindingContext("epmModel");

				if (oCtx.getProperty("selectedLikelihood") !== -1 && oCtx.getProperty("selectedConsequence") !== -1) {
					// add token
					this.addTokenToMultiInput(oCtx);
					this.getCalculatedFields();

				}
			},
			onLikelihoodChnaged: function (oEvent) {
				var oCtx = oEvent.getSource().getBindingContext("epmModel");
				if (oCtx.getProperty("selectedLikelihood") !== -1 && oCtx.getProperty("selectedConsequence") !== -1) {
					// add token
					this.addTokenToMultiInput(oCtx);
					this.getCalculatedFields();
				}
			},
			getPriorityForConsequenceLikelihood: function (nConsequenceCategory, nSelectedConsequenceIndex, nSelectedLikelihoodIndex) {
				if (nSelectedLikelihoodIndex !== -1 && nSelectedConsequenceIndex !== -1) {
					var oPriority = this.getPriorityForConsequenceLikelihoodIndex(nConsequenceCategory, nSelectedConsequenceIndex,
						nSelectedLikelihoodIndex);
					var mPriorityColorCodeMap = this.getProperty("priorityColorCodeMap");
					if (mPriorityColorCodeMap &&
						oPriority &&
						mPriorityColorCodeMap.hasOwnProperty(oPriority.priority)) {
						return mPriorityColorCodeMap[oPriority.priority].MaintPriorityDesc;
					} else {
						return (oPriority && oPriority.priority) || "";
					}
				} else {
					return "";
				}
			},
			removeSelection: function (oEvent) {
				var aTokens = [oEvent.getSource()];
				this.removeTokensFromModel(aTokens);
			},
			onLikelihoodListSelectionChange: function (oEvent) {
				var oCtx = oEvent.getSource().getBindingContext("epmModel");
				var oSelectedObject = oEvent.getSource().getSelectedItem().getBindingContext("epmModel").getObject();

				this.getModel("epmModel").setProperty(oCtx.getPath() + "/selectedLikelihood", oCtx.getProperty("likelihood").indexOf(
					oSelectedObject));
				if (oCtx.getProperty("selectedLikelihood") !== -1 && oCtx.getProperty("selectedConsequence") !== -1) {
					// add token
					this.addTokenToMultiInput(oCtx);
				}
			},
			onConsequenceListSelectionChange: function (oEvent) {
				var oCtx = oEvent.getSource().getBindingContext("epmModel");
				var oSelectedObject = oEvent.getSource().getSelectedItem().getBindingContext("epmModel").getObject();

				this.getModel("epmModel").setProperty(oCtx.getPath() + "/selectedConsequence", oCtx.getProperty("severities").indexOf(
					oSelectedObject));
				if (oCtx.getProperty("selectedLikelihood") !== -1 && oCtx.getProperty("selectedConsequence") !== -1) {
					// add token
					this.addTokenToMultiInput(oCtx);
				}
			},
			addTokenToMultiInput: function (oCtx, oSelectedMap) {
				var nSelectedConsequenceIndex,
					nSelectedLikelihoodIndex,
					oSelectedSeverity,
					oSelectedLikelihood,
					sConseQuenceText,
					sConsequenceDescription,
					oPriorityMap,
					sConseQuenceKey,
					sConsequenceGroup;
				if (oCtx) {
					nSelectedConsequenceIndex = oCtx.getProperty("selectedConsequence");
					nSelectedLikelihoodIndex = oCtx.getProperty("selectedLikelihood");
					oSelectedSeverity = oCtx.getProperty("severities")[nSelectedConsequenceIndex];
					oSelectedLikelihood = oCtx.getProperty("likelihood")[nSelectedLikelihoodIndex];
					sConseQuenceText = oCtx.getProperty("consequence");
					oPriorityMap = oCtx.getProperty("priorityMap");
					sConseQuenceKey = oCtx.getProperty("consequenceKey");
					sConsequenceDescription = oCtx.getProperty("consequenceDescription");
					sConsequenceGroup = oCtx.getProperty("consequenceGroup");
				} else if (oSelectedMap) {
					nSelectedConsequenceIndex = oSelectedMap.selectedConsequence;
					nSelectedLikelihoodIndex = oSelectedMap.selectedLikelihood;
					oSelectedSeverity = oSelectedMap.severities[nSelectedConsequenceIndex];
					oSelectedLikelihood = oSelectedMap.likelihood[nSelectedLikelihoodIndex];
					sConseQuenceText = oSelectedMap.consequence;
					sConsequenceDescription = oSelectedMap.consequenceDescription;
					oPriorityMap = oSelectedMap.priorityMap;
					sConseQuenceKey = oSelectedMap.consequenceKey;
					sConsequenceGroup = oSelectedMap.consequenceGroup;
				}
				var sSelectedPriority = "";
				var sSelectedPriorityType = "";
				if (oPriorityMap.hasOwnProperty(oSelectedSeverity.key)) {
					sSelectedPriority = oPriorityMap[oSelectedSeverity.key][oSelectedLikelihood.key] &&
						oPriorityMap[oSelectedSeverity.key][oSelectedLikelihood.key].priority;
					sSelectedPriorityType = oPriorityMap[oSelectedSeverity.key][oSelectedLikelihood.key] &&
						oPriorityMap[oSelectedSeverity.key][oSelectedLikelihood.key].priorityType;
				}
				// var sText = this.concatIdAndDescription(sConseQuenceText, oSelectedSeverity.severityText);
				var aSelectedItems = this.getModel("epmModel").getProperty("/selectedItems");

				var bIsItemAlreadySelected = aSelectedItems.some(function (oElement, nIndex) {
					if (oElement.consequenceKey === sConseQuenceKey) {
						aSelectedItems[nIndex].consequenceText = sConseQuenceText;
						aSelectedItems[nIndex].consequenceDescription = sConsequenceDescription;
						aSelectedItems[nIndex].severityText = oSelectedSeverity.severityText;
						aSelectedItems[nIndex].severityKey = oSelectedSeverity.key;
						aSelectedItems[nIndex].likelihoodKey = oSelectedLikelihood.key;
						aSelectedItems[nIndex].likelihoodText = oSelectedLikelihood.likelihoodText; // not needed
						aSelectedItems[nIndex].MaintEventOccrenPosition = oSelectedLikelihood.MaintEventOccrenPosition;
						aSelectedItems[nIndex].consequenceGroup = sConsequenceGroup;
						aSelectedItems[nIndex].priority = sSelectedPriority;
						aSelectedItems[nIndex].priorityType = sSelectedPriorityType;
						return true;
					} else {
						return false;
					}
				});
				if (!bIsItemAlreadySelected) {
					aSelectedItems.push({
						consequenceKey: sConseQuenceKey,
						consequenceText: sConseQuenceText,
						consequenceDescription: sConsequenceDescription,
						severityText: oSelectedSeverity.severityText,
						severityKey: oSelectedSeverity.key,
						likelihoodKey: oSelectedLikelihood.key,
						likelihoodText: oSelectedLikelihood.likelihoodText,
						MaintEventOccrenPosition: oSelectedLikelihood.MaintEventOccrenPosition,
						consequenceGroup: sConsequenceGroup,
						priority: sSelectedPriority,
						priorityType: sSelectedPriorityType,
						maintEventConsequenceIsLeading : false
					});
				}
				this.getModel("epmModel").setProperty("/assesButtonEnabled", true);
				this.getModel("epmModel").setProperty("/selectedItems", aSelectedItems);
			},
			// sDescription (sId)
			concatIdAndDescription: function (sDescription, sId) {
				if (sDescription && sDescription.trim()) {
					return sDescription + ((sId) ? " (" + sId + ")" : "");
				} else if (sId && sId.trim()) {
					return sId;
				} else {
					return "";
				}
			},
			setConsequenceGroupHighlight: function (nConsequenceCategory, nSelectedConsequenceIndex, nSelectedLikelihoodIndex) {
				if (nSelectedLikelihoodIndex !== -1 && nSelectedConsequenceIndex !== -1) {
					var oPriority = this.getPriorityForConsequenceLikelihoodIndex(nConsequenceCategory, nSelectedConsequenceIndex,
						nSelectedLikelihoodIndex);
					var sCriticality = this.getCriticalityForPriority(oPriority && oPriority.priority);
					return sCriticality;
				} else {
					return ValueState.None;
				}
			},
			getCriticalityForPriority: function (sPriority) {
				var mPriorityColorCodeMap = this.getProperty("priorityColorCodeMap");
				if (sPriority && mPriorityColorCodeMap && mPriorityColorCodeMap.hasOwnProperty(sPriority)) {
					return this.Constants.CRITICALITY[mPriorityColorCodeMap[sPriority].MaintPriorityColorCode];
				} else {
					return ValueState.None;
				}
			},
			getPriorityDescription: function (sPriority) {
				var mPriorityColorCodeMap = this.getProperty("priorityColorCodeMap");
				if (sPriority && mPriorityColorCodeMap && mPriorityColorCodeMap.hasOwnProperty(sPriority)) {
					return mPriorityColorCodeMap[sPriority].MaintPriorityDesc;
				} else {
					return sPriority;
				}
			},
			/** 
			 * 
			 * @param nConsequenceCategory
			 * @param nSelectedConsequenceIndex
			 * @param nSelectedLikelihoodIndex
			 * @returns
			 */
			getPriorityForConsequenceLikelihoodIndex: function (nConsequenceCategory, nSelectedConsequenceIndex, nSelectedLikelihoodIndex) {
				var aList = this.getModel("epmModel").getProperty("/list"),
					oList = null;
				if (!aList) {
					return;
				}

				for (var i = 0; i < aList.length; i++) {
					if (aList[i].consequenceKey === nConsequenceCategory) {
						oList = aList[i];
						break;
					}
				}
				if (oList) {
					var nSelectedSeverity = oList.severities[nSelectedConsequenceIndex].key,
						nSelectedLikihood = oList.likelihood[nSelectedLikelihoodIndex].key,
						oSelectedPriority = oList.priorityMap[nSelectedSeverity][nSelectedLikihood];
					return oSelectedPriority;
				} else {
					return null;
				}

			},
			mapSelectedItems: function (aSelectedItems) {
				var that = this;
				var oMappedItems = aSelectedItems.map(function (oItem) {
					var oMappedItem = {};
					oMappedItem[that.Constants.FIELDS.PLANT.toUpperCase()] = that.getProperty("Plant");
					oMappedItem[that.Constants.FIELDS.NOTIFICATION_TYPE.toUpperCase()] = that.getProperty("NotificationType");
					oMappedItem[that.Constants.FIELDS.MAINWORKCENTER.toUpperCase()] =  that.getBindingContext().getObject("MainWorkCenter");
					oMappedItem[that.Constants.FIELDS.MAINWORKCENTERPLANT.toUpperCase()] =  that.getBindingContext().getObject("MainWorkCenterPlant");
					oMappedItem[that.Constants.FIELDS.MAINTPLANNINGPLANT.toUpperCase()] = that.getBindingContext().getObject("MaintenancePlanningPlant");
					oMappedItem[that.Constants.FIELDS.MAINTEVENTPRIOZNPRFL.toUpperCase()] = that.EventPrioritizationProfile;
					oMappedItem[that.Constants.FIELDS.CONSEQUENCE_GROUP.toUpperCase()] = oItem.consequenceGroup;
					oMappedItem[that.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE.toUpperCase()] = oItem.consequenceKey;
					oMappedItem[that.Constants.FIELDS.CONSEQUENCE_CODE.toUpperCase()] = oItem.severityKey;
					oMappedItem[that.Constants.FIELDS.LIKELIHOOD_CODE.toUpperCase()] = oItem.likelihoodKey;
					oMappedItem[that.Constants.FIELDS.MAINTPRIORITY.toUpperCase()] = oItem.priority;
					oMappedItem[that.Constants.FIELDS.MAINTPRIORITYTYPE.toUpperCase()] = oItem.priorityType;
					oMappedItem[that.Constants.FIELDS.MAINTEVENTCONSEQUENCEISLEADING.toUpperCase()] = oItem.maintEventConsequenceIsLeading;
					return oMappedItem;
				});
				return oMappedItems;
			},
			getCalculatedFields: function () {
				var that = this;
				var oRequestData = {};
				var aSelectedItems = that.getModel("epmModel").getProperty("/selectedItems");
				if (aSelectedItems.length === 0) {
					that.clearAssessmentResult();
					return;
				}
				oRequestData[that.Constants.FIELDS.SELECTED_VALUES] = that.mapSelectedItems(aSelectedItems);
				Log.debug(oRequestData);

				new Promise(function (resolve) {
					$.post({
						url: that.getProperty("url") + that.getProperty("EntityName") + "/" + that.getProperty("FunctionImportName"),
						headers: {
							"x-csrf-token": that.csrfToken,
							"Content-Type": "application/json"
						},
						data: JSON.stringify(oRequestData),
						success: resolve
					});
				}).then(function (data) {
					if (data && data.value && data.value[0]) {
						var oResponse = data.value[0];
						var sPriorityText = oResponse[that.Constants.FIELDS.MAINTPRIORITYDESC.toUpperCase()];
						var sPriority = oResponse[that.Constants.FIELDS.MAINTPRIORITY.toUpperCase()];
						var sLacdDate = oResponse[that.Constants.FIELDS.LACD_DATE];
						var aLeadingValues = oResponse[that.Constants.FIELDS.LEADING_VALUES][0];
						var sLeadingCategoryCode = aLeadingValues[that.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE.toUpperCase()];
						var sLeadingConsequenceCode = aLeadingValues[that.Constants.FIELDS.CONSEQUENCE_CODE.toUpperCase()];
						var sLeadingLikelihoodCode = aLeadingValues[that.Constants.FIELDS.LIKELIHOOD_CODE.toUpperCase()];
						that.getModel("epmModel").setProperty("/leadingConsequence", sLeadingConsequenceCode);
						that.getModel("epmModel").setProperty("/leadingLikelihood", sLeadingLikelihoodCode);
						that.getModel("epmModel").setProperty("/leadingConsequenceCategory", sLeadingCategoryCode);
						that.getModel("epmModel").setProperty("/maintPriority", sPriority);
						that.getModel("epmModel").setProperty("/maintPriorityDesc", sPriorityText);
						that.getModel("epmModel").setProperty("/lacdDate", sLacdDate);
						that.getModel("epmModel").setProperty("/leadingConsequenceText", that.oTraversedSeverity[Number(sLeadingCategoryCode)][
							Number(sLeadingConsequenceCode)
						]);
						that.getModel("epmModel").setProperty("/leadingLikelihoodText", that.oTraversedLikelihood[Number(sLeadingCategoryCode)][
							Number(sLeadingLikelihoodCode)
						]);
						that.getModel("epmModel").setProperty("/leadingConsequenceCategoryText", that.oTraversedSeverity[Number(sLeadingCategoryCode)].text);
						that.sRequiredStartDate = oResponse[that.Constants.FIELDS.REQUIRED_START_DATE];
						that.sRequiredEndDate = oResponse[that.Constants.FIELDS.REQUIRED_END_DATE];
						that.sRequiredStartTime = oResponse[that.Constants.FIELDS.REQUIRED_START_TIME];
						that.sRequiredEndTime = oResponse[that.Constants.FIELDS.REQUIRED_END_TIME];
					} else {
						Promise.reject();
					}

				}).catch(function (error) {
					Log.error(error);
				});

			},
			open: function () {
				var oPromise = this.getEventPrioCustomizingData(),
					that = this;
				oPromise.then(function (oData) {
					that.byId("idEPMDialog").open();
				});
				this.initDialog();
				return oPromise;
			},
			getFilterQuery: function (sValue1, sValue2, sOperator) {
				var SPACE = " ";
				var COMMA = "'";
				var EQ = this.Constants.OPERATORS.EQ;
				var AND = this.Constants.OPERATORS.AND;
				var sQuery = "";
				switch (sOperator) {
				case this.Constants.OPERATORS.EQ:
					sQuery = sValue1 + SPACE + EQ + SPACE + COMMA + sValue2 + COMMA;
					break;
				case this.Constants.OPERATORS.AND:
					sQuery = sValue1 + SPACE + AND + SPACE + sValue2;
					break;
				}
				return sQuery;

			},
			getEventPrioCustomizingData: function () {
				var that = this;
				var sPlantFilter = this.getFilterQuery(this.Constants.FIELDS.PLANT, this.getProperty("Plant"), this.Constants.OPERATORS.EQ);
				var sNotificationTypeFilter = this.getFilterQuery(this.Constants.FIELDS.NOTIFICATION_TYPE, this.getProperty("NotificationType"),
					this.Constants.OPERATORS.EQ);
				var sFilterQuery = this.getFilterQuery(sPlantFilter, sNotificationTypeFilter, this.Constants.OPERATORS.AND);

				var oGetCustomizingViewDataPromise = new Promise(function (resolve, reject) {
					that._queryEPMCustomizingData(that.getProperty("url") + that.getProperty("EntityName") + "/$count", {
						$filter: sFilterQuery
					}).then(function (data) {
						if (parseInt(data, 10)) {
							//it is a number
							that._queryEPMCustomizingData(that.getProperty("url") + that.getProperty("EntityName"), {
								$filter: sFilterQuery,
								$top: data
							}).then(function (data) {
								if (data && data.value && data.value.length !== 0) {
									data.value.sort(function (oValue1, oValue2) {
										return oValue1.MaintEvtLklihdPositionValue.localeCompare(oValue2.MaintEvtLklihdPositionValue);
									});
									resolve(data.value);
								} else {
									reject();
								}
							});
						} else {
							reject();
						}
					});
				}); //end of promise
				that.setProperty("isCustomizingAvailablePromise", oGetCustomizingViewDataPromise);
				return oGetCustomizingViewDataPromise;
			},

			_queryEPMCustomizingData: function (sUrl, oData) {
				var that = this;
				return new Promise(function (resolve, reject) {
					$.get({
						url: sUrl,
						headers: {
							"x-csrf-token": "fetch"
						},
						data: oData,
						success: function (data, status, xhr) {
							that.csrfToken = xhr.getResponseHeader("x-csrf-token");
							if (status === that.Constants.STATUS.SUCCESS && data) {
								resolve(data);
							} else {
								reject();
							}
						}
					});
				});
			},

			initDialog: function () {
				var that = this;

				var oNavCon = that.byId("empNavContainer");
				var bAssesButtonVisisble = false;
				if (!that.getEpmEnabled()) {
					var oDetailPage = that.byId("idEpmPageDisplayConsequences");
					oNavCon.to(oDetailPage);
				} else {
					var oEditPage = that.byId("idEpmPageEditConsequences");
					oNavCon.to(oEditPage);
					bAssesButtonVisisble = true;
				}

				that.getModel("epmModel").setProperty("/selectedItems", []);
				that.clearAssessmentResult();
				that.getModel("epmModel").setProperty("/assesButtonEnabled", false);
				that.getModel("epmModel").setProperty("/assesButtonVisible", bAssesButtonVisisble);

				that.setProperty("busy", true);

				var oPromise = Promise.all([
					that.getProperty("isCustomizingAvailablePromise"),
					that.getProperty("selectedItemsPromise"),
					that.getProperty("priorityMapPromise")
				]);
				oPromise.then(function (result) {
						that.setProperty("priorityColorCodeMap", result[2]);
						that.setProperty("selectedItems", result[1]);
						return that._mapViewData.call(that, result[0]);
					}).then(function (mViewData) {
						// Select the data based on property selected items
						return that.setSelectedItems.call(that, mViewData);
					})
					.then(function (mViewData) {
						//Object.values is not supported in IE
						var aViewData = that.objectValues(mViewData);
						if (aViewData && aViewData.length === 0) {
							Promise.reject();
						}
						that.getModel("epmModel").setProperty("/list", aViewData);
						var oFlexBox = that.byId("idEmpFlexBoxCategoryListEdit");
						var oFirstPanel = oFlexBox && oFlexBox.getItems() && oFlexBox.getItems()[0];
						if (oFirstPanel && that.getModel("epmModel").getProperty("/selectedItems").length === 0) {
							oFirstPanel.setExpanded(true);
						}
						that.setProperty("busy", false);
						if (!that.getEpmEnabled()) {
							that.getCalculatedFields();
						}
					})
					.catch(function (error) {
						that.setProperty("busy", false);
						Log.error(error);
					});

			},
			setSelectedItems: function (mViewData) {
				var aSelectedItems = this.getProperty("selectedItems");
				if (mViewData && aSelectedItems.length) {
					aSelectedItems.forEach(function (oSelectedItem) {
						var oConsequenceCategory = mViewData[oSelectedItem[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]],
							aLikelihoods = oConsequenceCategory.likelihood,
							aConsequences = oConsequenceCategory.severities;
						if (oSelectedItem[this.Constants.FIELDS.MAINTEVENTPRIOZNPRFL] === this.EventPrioritizationProfile) {
							for (var i = 0, n = aLikelihoods.length; i < n; i++) {
								if (aLikelihoods[i].key === oSelectedItem[this.Constants.FIELDS.LIKELIHOOD_CODE]) {
									oConsequenceCategory.selectedLikelihood = i;
									aLikelihoods[i].selected = true;
									break;
								}
							}
							for (var j = 0, l = aConsequences.length; j < l; j++) {
								if (aConsequences[j].key === oSelectedItem[this.Constants.FIELDS.CONSEQUENCE_CODE]) {
									oConsequenceCategory.selectedConsequence = j;
									aConsequences[j].selected = true;
									break;
								}
							}
							if (oConsequenceCategory.selectedConsequence !== -1 && oConsequenceCategory.selectedLikelihood !== -1) {
								this.addTokenToMultiInput(null, oConsequenceCategory);
							}
						}
					}.bind(this));
				}
				return mViewData;
			},
			/** 
			 * 
			 * @param oMap
			 * @returns array of values of oMap
			 */
			objectValues: function (oMap) {
				var vals = [];
				for (var key in oMap) {
					if (oMap.hasOwnProperty(key)) {
						vals.push(oMap[key]);
					}
				}
				return vals;
			},
			/** 
			 * helper function to filter and reduce the data for the view Model
			 * @constructor 
			 * @param aViewData 
			 * @returns {oPromise}
			 */
			_mapViewData: function (aViewData) {
				return new Promise(function (resolve, reject) {
					this.oTraversedSeverity = {};
					this.oTraversedLikelihood = {};
					// adds entry to the the view map
					var _addEntryToMap = function (oAcc, oCurr, bIsNew) {
						if (bIsNew) {
							this.EventPrioritizationProfile = oCurr[this.Constants.FIELDS.MAINTEVENTPRIOZNPRFL];
							oAcc[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]] = {
								consequenceKey: oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE],
								consequence: oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_TITLE],
								consequenceGroup: oCurr[this.Constants.FIELDS.CONSEQUENCE_GROUP],
								consequenceDescription: oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_SUB_TITLE],
								consequencePosition: oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_POSITION],
								selectedItem: null,
								priorityMap: {},
								selectedConsequence: -1,
								selectedLikelihood: -1,
								severities: [],
								likelihood: []
							};
							// create a traversed Severity Map { consequencekey : { text: CONSEQUENCE_CATEGORY_TITLE , severityKey:severityText } }
							this.oTraversedSeverity[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]] = {};
							this.oTraversedSeverity[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]].text = oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_TITLE];
							// create a traversed Likelihood Map { consequencekey : { text: CONSEQUENCE_CATEGORY_TITLE , likelihoodKey:likelihoodText } }
							this.oTraversedLikelihood[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]] = {};
							this.oTraversedLikelihood[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]].text = oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_TITLE];
						}
						// check if for the CONSEQUENCE_CATEGORY_TITLE the severity is traversed already
						if (!this.oTraversedSeverity[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]]
							.hasOwnProperty(oCurr[this.Constants.FIELDS.CONSEQUENCE_CODE])) {
							oAcc[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]].severities.push({
								key: oCurr[this.Constants.FIELDS.CONSEQUENCE_CODE],
								severityText: oCurr[this.Constants.FIELDS.CONSEQUENCE_TEXT],
								MaintEventSvrtyPosition: oCurr[this.Constants.FIELDS.CONSEQUENCE_POSITION]
							});
							// add the severity key to the traversed map
							this.oTraversedSeverity[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]][oCurr[this.Constants.FIELDS.CONSEQUENCE_CODE]] =
								oCurr[this.Constants.FIELDS.CONSEQUENCE_TEXT];
						}
						// check if for the CONSEQUENCE_CATEGORY_TITLE the occurence is traversed already
						if (!this.oTraversedLikelihood[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]]
							.hasOwnProperty(oCurr[this.Constants.FIELDS.LIKELIHOOD_CODE])) {
							oAcc[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]].likelihood.push({
								key: oCurr[this.Constants.FIELDS.LIKELIHOOD_CODE],
								likelihoodText: oCurr[this.Constants.FIELDS.LIKELIHOOD_TEXT],
								MaintEventOccrenPosition: oCurr[this.Constants.FIELDS.LIKELIHOOD_POSITION]
							});
							// add the occurence key to the traversed map
							this.oTraversedLikelihood[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]][oCurr[this.Constants.FIELDS.LIKELIHOOD_CODE]] =
								oCurr[this.Constants.FIELDS.LIKELIHOOD_TEXT];
						}
						// make priority Map
						this._createPriorityMap.call(this,
							oAcc[oCurr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]],
							oCurr[this.Constants.FIELDS.CONSEQUENCE_CODE],
							oCurr[this.Constants.FIELDS.LIKELIHOOD_CODE],
							oCurr[this.Constants.FIELDS.MAINTPRIORITY],
							oCurr[this.Constants.FIELDS.MAINTPRIORITYTYPE]);
						this.priorityType = oCurr[this.Constants.FIELDS.MAINTPRIORITYTYPE];
					};

					// create view Data for the json model
					var mViewData = aViewData.reduce(function (acc, curr, index) {
						// check if the accumulator already has the CONSEQUENCE_CATEGORY_TITLE
						var bNewEntry = !acc.hasOwnProperty(curr[this.Constants.FIELDS.CONSEQUENCE_CATEGORY_CODE]);
						_addEntryToMap.call(this, acc, curr, bNewEntry);
						return acc;
					}.bind(this), {});

					/*  Sorting: Consequennce, Consequence Category, Consequence Liklihood */

					var mSortPosition = [];
					var mViewTempData = {};

					// Prepare key:Postition object
					for (key in mViewData) {
						mSortPosition.push({
							key: key,
							position: mViewData[key].consequencePosition
						});
					};

					// Sort Sequence for Consequence Category
					mSortPosition.sort(function (a, b) {
						return a.position - b.position;
					});

					// Temporary Sorted Consequence Category
					mSortPosition.forEach(function (value, index) {
						mViewTempData[index + 1] = mViewData[value.key];
					});

					// Re-fill Sorted Consequence Category 
					mViewData = mViewTempData;

					Object.keys(mViewData).forEach(function (key) {
						// Sorting Consequence
						mViewData[key].likelihood.sort(function (a, b) {
							return a.MaintEventOccrenPosition - b.MaintEventOccrenPosition;
						});
						// Sorting Liklihood
						mViewData[key].severities.sort(function (a, b) {
							return a.MaintEventSvrtyPosition - b.MaintEventSvrtyPosition;
						});
					});

					resolve(mViewData);
				}.bind(this));

			},
			_createPriorityMap: function (oResponseItem, sSeverity, sLikelihood, sPriority, sPriorityType) {

				if (!oResponseItem.priorityMap.hasOwnProperty(sSeverity)) {
					oResponseItem.priorityMap[sSeverity] = {};
				}

				oResponseItem.priorityMap[sSeverity][sLikelihood] = {
					priority: sPriority,
					priorityType: sPriorityType
				};
			},

			onPressApply: function (oEvent) {
				
				this.byId("idEPMDialog").close();
				var ldcnsq = this.getModel("epmModel").getProperty("/leadingConsequenceCategory");
				var aSelectedItems = this.getModel("epmModel").getProperty("/selectedItems");
				for (var i = 0; i < aSelectedItems.length; i++) {
					if (aSelectedItems[i].consequenceKey === ldcnsq) { 
    					aSelectedItems[i].maintEventConsequenceIsLeading = true;
					}
				}
				this.getModel("epmModel").setProperty("/selectedItems", aSelectedItems);
				this.fireEvent("apply", {
					priority: this.getModel("epmModel").getProperty("/maintPriority"),
					priorityDesc: this.getModel("epmModel").getProperty("/maintPriorityDesc"),
					EventPrioritizationProfile: this.EventPrioritizationProfile,
					selectedItems: this.mapSelectedItems(this.getModel("epmModel").getProperty("/selectedItems")),
					lacdDate: this.getModel("epmModel").getProperty("/lacdDate"),
					requiredStartDate: this.sRequiredStartDate,
					requiredEndDate: this.sRequiredEndDate,
					requiredStartTime: this.sRequiredStartTime,
					requiredEndTime: this.sRequiredEndTime,
					priorityType: this.priorityType
				});
			},
			onPressAssess: function (oEvent) {
				var oNavCon = this.byId("empNavContainer");
				var oDetailPage = this.byId("idEpmPageDisplayConsequences");
				oNavCon.to(oDetailPage);
				this.getModel("epmModel").setProperty("/assesButtonVisible", false);

				this.getCalculatedFields();
			},
			onNavBack: function (oEvent) {
				var oNavCon = this.byId("empNavContainer");
				this.getModel("epmModel").setProperty("/assesButtonVisible", true);
				oNavCon.back();
			},
			onPressCancel: function (oEvent) {
				this.fireEvent("cancel");
				this.byId("idEPMDialog").close();
			}

		});
		return EventPrioritizationDialog;
	},
	true);