/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/m/Dialog",
	"sap/m/DialogRenderer",
	"sap/ui/comp/smarttable/SmartTable",
	"sap/ui/comp/smarttable/TableType",
	"sap/ui/comp/smartfilterbar/SmartFilterBar",
	"sap/ui/comp/smartfilterbar/ControlConfiguration",
	"sap/m/Button",
	"sap/m/Toolbar",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/ToolbarSpacer",
	"sap/ui/core/CustomData",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/ui/core/Icon",
	"sap/m/Table",
	"sap/m/ObjectIdentifier",
	"sap/m/Text",
	"sap/m/HBox",
	"sap/m/FlexAlignItems",
	"sap/ui/table/TreeTable",
	"sap/ui/table/Column",
	"sap/ui/table/SelectionBehavior",
	"sap/ui/table/SelectionMode",
	"sap/ui/layout/HorizontalLayout",
	"sap/m/Link",
	"sap/ui/model/Filter",
	"sap/ui/comp/smartvariants/SmartVariantManagement",
	"sap/m/Bar",
	"sap/ui/model/json/JSONModel"
], function (Dialog, DialogRenderer, SmartTable, TableType, SmartFilterBar, ControlConfiguration, Button, Toolbar, SegmentedButton,
	SegmentedButtonItem,
	ToolbarSpacer, CustomData, Column, ColumnListItem, Icon, Table, ObjectIdentifier, Text, HBox, FlexAlignItems, TreeTable, TreeColumn,
	SelectionBehavior, SelectionMode, HorizontalLayout, Link, Filter, SmartVariantManagement, MBar, JSONModel
) {
	"use strict";
	var TechnicalObjectValueHelp = Dialog.extend("pm11.zpm11nftcreate.controls.TechnicalObjectValueHelp", {
		/*
		 * Composite control metadata definition
		 */
		metadata: {
			properties: {
				"entitySetFlat": "string",
				"entityTypeFlat": "string",
				"entitySetHierarchy": "string",
				"entityTypeHierarchy": "string",
				"isValidTechnicalObject": {
					type: "boolean",
					defaultValue: false
				},
				"searchString": "string",
				"TechnicalObject": "string",
				"TechObjIsEquipOrFuncnlLoc": "string",
				"TechnicalObjectLabel": "string",
				"hierarchyNodeLevel": "string"
			},
			aggregations: {
				"triggeringView": {
					type: "sap.ui.core.mvc.View",
					multiple: false
				}
			},
			events: {
				"technicalObjectSelected": {
					parameters: {
						"selectedObject": "object"
					}
				}
			}
		},
		constants: {
			EQUIPMENT: "EAMS_EQUI",
			FUNCTIONAL_LOCATION: "EAMS_FL",
			EQUIPMENT_ICON: "sap-icon://technical-object",
			FUNCTIONAL_LOCATION_ICON: "sap-icon://functional-location",
			TEXT_FIELDS_TO_IGNORE: "TechnicalObjectCategoryDesc,TechnicalObjectTypeDesc,ABCIndicatorDesc," +
				"BusinessAreaName,CompanyCodeName,ControllingAreaName,CostCenterDescription,WorkCenterText,MainWorkCenterText,MaintenancePlantName," +
				"MaintenancePlannerGroupName,PlantSectionPersonRespName,DivisionName,LocationName",
			IGNORE_FROM_PERSONALIZATION: "TechnicalObject,TechnicalObjectLabel,TechObjIsEquipOrFuncnlLoc",
			REQUEST_AT_LEAST_FIELDS: "TechnicalObject,TechObjIsEquipOrFuncnlLoc,TechnicalObjectDescription",
			INITIALLY_VISIBLE_FIELDS_FLAT_TABLE: "", // TechnicalObjectType,TechnicalObjectCategory,TechObjInstallationLocation
			TECHNICAL_FIELDS_HIERARCHY: "DrillDownState,HierarchyNodeLevel",
			TECHNICAL_OBJECT_IDENTIFIER_HIERARCHY_TABLE: "TechnicalObjectIdentifierHierarchyTable",
			TECHNICAL_OBJECT_IDENTIFIER_FLAT_TABLE: "TechnicalObjectIdentifierFlatTable"
		},

		_oResourceBundle: null,
		_oDeviceModel: null,
		// Inner controls put into content aggregation of sap.m.Dialog
		_oSmartTableFlat: null,
		_oSmartFilterBarFlat: null,
		_oSmartTableHierarchy: null,
		_oSmartFilterBarHierarchy: null,
		_oSmartTableToolbarHierarchy: null,
		_oSelectedInstallationLocation: null,
		_oBacktoSearchLink: null,
		_oSmartVariantManagement: null,
		_SearchFieldValue: null,

		renderer: function (oRM, oTechnicalObjectValueHelp) {
			oTechnicalObjectValueHelp._insertDialogContent();
			DialogRenderer.render(oRM, oTechnicalObjectValueHelp);
		}
	});

	/*
	 * Control properties setter methods
	 */
	TechnicalObjectValueHelp.prototype.setTriggeringView = function (oTriggeringView) {
		this._oResourceBundle = oTriggeringView.getModel("i18n").getResourceBundle();
		this._oDeviceModel = oTriggeringView.getModel("device");
		oTriggeringView.addDependent(this);
		// Set properties depending on i18n and device model
		this._setTexts();
		this._setStretchDialog(this._oDeviceModel);
	};

	TechnicalObjectValueHelp.prototype.setEntityTypeFlat = function (sEntityTypeFlat) {
		this.setProperty("entityTypeFlat", sEntityTypeFlat, true /*no re-rendering needed*/ );
		this._oSmartFilterBarFlat.setEntityType(this.getEntityTypeFlat());
	};

	TechnicalObjectValueHelp.prototype.setEntitySetFlat = function (sEntitySetFlat) {
		this.setProperty("entitySetFlat", sEntitySetFlat, true /*no re-rendering needed*/ );
		this._oSmartTableFlat.setEntitySet(this.getEntitySetFlat());
	};

	TechnicalObjectValueHelp.prototype.setEntityTypeHierarchy = function (sEntityTypeHierarchy) {
		this.setProperty("entityTypeHierarchy", sEntityTypeHierarchy, true /*no re-rendering needed*/ );
	};

	TechnicalObjectValueHelp.prototype.setEntitySetHierarchy = function (sEntitySetHierarchy) {
		this.setProperty("entitySetHierarchy", sEntitySetHierarchy, true /*no re-rendering needed*/ );
		this._oSmartTableHierarchy.setEntitySet(this.getEntitySetHierarchy());
	};

	/*
	 * Control init function
	 */
	TechnicalObjectValueHelp.prototype.init = function () {
		var oModel = new sap.ui.model.json.JSONModel();
		this.setModel(oModel, "HierModel");
		this.getModel("HierModel").setProperty("/HierFlag", "");

		if (Dialog.prototype.init) {
			Dialog.prototype.init.apply(this, arguments);
		}
		this._initDialog();

		this._initSmartTableToolbarHierarchy();

		// init global variant management
		this._createSmartVariantManagement();

		// Init Smart Table hierarchy
		this._createSmartTableHierarchy();

		// Init Smart Filter Bar flat
		this._createSmartFilterBarFlat();
		// Init Smart Table flat
		this._createSmartTableFlat();

	};

	/*
	 * Control exit function
	 */
	TechnicalObjectValueHelp.prototype.exit = function () {
		if (Dialog.prototype.exit) {
			Dialog.prototype.exit.bind(this);
		}
		if (this._oSmartTableFlat) {
			this._oSmartTableFlat.destroy();
			this._oSmartTableFlat = null;
		}
		if (this._oSmartFilterBarFlat) {
			this._oSmartFilterBarFlat.destroy();
			this._oSmartFilterBarFlat = null;
		}
		if (this._oSmartTableHierarchy) {
			this._oSmartTableHierarchy.destroy();
			this._oSmartTableHierarchy = null;
		}
	};

	/*
	 * Private helper methods
	 */
	TechnicalObjectValueHelp.prototype._setTexts = function () {
		var that = this;
		this.setTitle(this._oResourceBundle.getText("xtit.selectTechnicalObject"));
		this._oSmartTableFlat.setHeader(this._oResourceBundle.getText("xtit.technicalObjects"));
		this.addButton(new Button({
			text: that._oResourceBundle.getText("xbut.cancel"),
			press: function () {
				that.close();
			}
		}));
		this._oSmartTableHierarchy.getTable().getColumns().some(function (column) {
			if (column.getId() === that.constants.TECHNICAL_OBJECT_IDENTIFIER_HIERARCHY_TABLE) {
				column.getLabel().setText(that._oResourceBundle.getText("xcol.technicalObjectIdentifier"));
			}
		});
		this._oSmartTableFlat.getTable().getColumns().some(function (column) {
			if (column.getId() === that.constants.TECHNICAL_OBJECT_IDENTIFIER_FLAT_TABLE) {
				column.getHeader().setText(that._oResourceBundle.getText("xcol.technicalObjectIdentifier"));
			}
		});

		this._setTextSearchButton();
	};

	TechnicalObjectValueHelp.prototype._setTextSearchButton = function () {
		var oBackToSearchLink = this._oSmartTableToolbarHierarchy.getContent().filter(
			function (oControl) {
				return oControl.getId() === "technicalObjectHierarchyLinkBackToSearch";
			})[0];
		if (oBackToSearchLink) {
			if (!this.getIsValidTechnicalObject()) {
				oBackToSearchLink.setText(this._oResourceBundle.getText("xlnk.backToSearchResults"));
			} else if (this.getIsValidTechnicalObject() && this.getTechnicalObject() && (this.getTechObjIsEquipOrFuncnlLoc() === "EAMS_FL" ||
					this.getTechObjIsEquipOrFuncnlLoc() === "EAMS_EQUI")) {
				oBackToSearchLink.setText(this._oResourceBundle.getText("xlnk.Search"));
			}
		}
	};

	TechnicalObjectValueHelp.prototype._setStretchDialog = function (oDeviceModel) {
		if (oDeviceModel && oDeviceModel.getProperty("/system/phone")) {
			this.setStretch(true);
		}
	};

	TechnicalObjectValueHelp.prototype._insertDialogContent = function () {
		if (this.getContent() && this.getContent().length === 0) {
			this.insertContent(new MBar({
				contentLeft: [this._oSmartVariantManagement]
			}), 0);
			this._oSmartVariantManagement.setPersistencyKey("malfuncManageSelectTechnicalObject");
			this.insertContent(this._oSmartTableHierarchy, 1);
			this.insertContent(this._oSmartFilterBarFlat, 2);
			this.insertContent(this._oSmartTableFlat, 3);
			// this.setVerticalScrolling(true);
		}
		this._setInitialDialogLayout();
	};

	TechnicalObjectValueHelp.prototype._displayFlatList = function () {
		this._oSmartTableFlat.setVisible(true);
		this._oSmartFilterBarFlat.setVisible(true);
		this._oSmartTableHierarchy.setVisible(false);
	};

	TechnicalObjectValueHelp.prototype._displayHierarchy = function () {
		this._oSmartTableFlat.setVisible(false);
		this._oSmartFilterBarFlat.setVisible(false);
		this._oSmartTableHierarchy.setVisible(true);
	};

	TechnicalObjectValueHelp.prototype._triggerSearch = function () {
		if (this._oSmartFilterBarFlat.getBasicSearchControl()) {
			this._oSmartFilterBarFlat.getBasicSearchControl().setValue(this.getSearchString());
			if (this.getSearchString() && this.getSearchString().trim().length > 0) {
				this._SearchFieldValue = this.getSearchString();
				this._oSmartFilterBarFlat.fireSearch();
			}
		}
	};

	TechnicalObjectValueHelp.prototype._triggerSearchOnInit = function () {
		this._triggerSearch();
		this._oSmartFilterBarFlat.detachInitialise(this._triggerSearchOnInit, this);
	};

	TechnicalObjectValueHelp.prototype._setInitialDialogLayout = function () {
		var displayHierarchyBool = (sap.ui.Device.system.combi || sap.ui.Device.system.desktop || sap.ui.Device.system.tablet || sap.ui.Device.system.phone);

		if (!this.getIsValidTechnicalObject()) {
			this._displayFlatList();
			this._oSmartFilterBarFlat.attachInitialise(this._triggerSearchOnInit, this);
			this._triggerSearch();
		} else if (this.getIsValidTechnicalObject() && this.getTechnicalObject() && (this.getTechObjIsEquipOrFuncnlLoc() === "EAMS_FL" || this
				.getTechObjIsEquipOrFuncnlLoc() === "EAMS_EQUI") && displayHierarchyBool) {
			this._displayHierarchy();
			this._oSelectedInstallationLocation = {
				TechnicalObject: this.getTechnicalObject(),
				TechObjIsEquipOrFuncnlLoc: this.getTechObjIsEquipOrFuncnlLoc(),
				TechnicalObjectLabel: this.getTechnicalObjectLabel(),
				HierarchyNodeLevel: this.getHierarchyNodeLevel()
			};
			this._oSmartTableHierarchy.rebindTable();
		} else {
			this._displayFlatList();
		}
	};

	TechnicalObjectValueHelp.prototype._initDialog = function () {
		this.setHorizontalScrolling(false);
		// this.setVerticalScrolling(false);
		this.setContentHeight("1080px");
		this.setContentWidth("930px");
	};

	TechnicalObjectValueHelp.prototype._initSmartTableToolbarHierarchy = function () {
		var that = this;
		if (!this._oSmartTableToolbarHierarchy) {
			if (!this._oBackToSearchLink) {
				this._oBackToSearchLink = new Button("technicalObjectHierarchyLinkBackToSearch", {
					type: sap.m.ButtonType.Transparent,
					press: function (oEvent) {
						//Show flat table
						that._displayFlatList();
						oEvent.preventDefault = true;
					}
				});
			}
			this._oSmartTableToolbarHierarchy = new Toolbar({
				content: [new ToolbarSpacer(), this._oBackToSearchLink]
			});
		}
	};

	TechnicalObjectValueHelp.prototype._createSmartVariantManagement = function () {
		// don't initialize just yet!
		this._oSmartVariantManagement = new sap.ui.comp.smartvariants.SmartVariantManagement("malfuncManageSelectTechnicalObjectVariant", {
			showExecuteOnSelection: true
		});
		this._oSmartVariantManagement.addStyleClass("sapUiResponsiveMargin");
	};

	TechnicalObjectValueHelp.prototype._createSmartFilterBarFlat = function () {

		var disableFiltersOnPhone = (sap.ui.Device.system.combi || sap.ui.Device.system.desktop || sap.ui.Device.system.tablet || sap.ui.Device.system.phone);

		var that = this;

		//TODO: configure filter (e.g. display id and description)
		this._oSmartFilterBarFlat = new SmartFilterBar({
			persistencyKey: "malfuncManageSelectTechnicalObjectFilterFlat",
			id: "SmartFilterBarFlatId",
			useVariantManagement: true,
			smartVariant: this._oSmartVariantManagement.getId(),
			enableBasicSearch: true,
			afterVariantLoad: function () {
				if (that._SearchFieldValue !== null) {
					this.getBasicSearchControl().setValue(that._SearchFieldValue);
				}
				this.fireSearch();
			}
		});

		this._oSmartFilterBarFlat.setUseToolbar(false);

		this._oSmartFilterBarFlat.addControlConfiguration(new ControlConfiguration(
			"SmartFilterIdFlatTechnicalObjectSortField", // string
			{
				id: "SmartFilterIdFlatTechnicalObjectSortField", // sap.ui.core.ID
				key: "MaintObjectFreeDefinedAttrib", // string
				index: 0, // int
				visibleInAdvancedArea: disableFiltersOnPhone // boolean
			}
		));

		this._oSmartFilterBarFlat.addControlConfiguration(new ControlConfiguration(
			"SmartFilterIdFlatTechObjIsEquipOrFuncnlLoc", // string
			{
				id: "SmartFilterIdTechObjIsEquipOrFuncnlLoc", // sap.ui.core.ID
				key: "TechObjIsEquipOrFuncnlLoc", // string
				index: 1, // int
				visibleInAdvancedArea: disableFiltersOnPhone // boolean
			}
		));

		this._oSmartFilterBarFlat.addControlConfiguration(new ControlConfiguration(
			"SmartFilterIdFlatTechnicalObjectType", // string
			{
				id: "SmartFilterIdTechnicalObjectType", // sap.ui.core.ID
				key: "TechnicalObjectType", // string
				index: 2, // int
				visibleInAdvancedArea: disableFiltersOnPhone // boolean
			}
		));

		this._oSmartFilterBarFlat.addControlConfiguration(new ControlConfiguration(
			"SmartFilterIdFlatAssetLocation", // string
			{
				id: "SmartFilterIdFlatAssetLocation", // sap.ui.core.ID
				key: "AssetLocation", // string
				index: 3, // int
				visibleInAdvancedArea: disableFiltersOnPhone // boolean
			}
		));

		this._oSmartFilterBarFlat.addControlConfiguration(new ControlConfiguration(
			"SmartFilterIdFlatWorkCenter", // string
			{
				id: "SmartFilterIdFlatWorkCenter", // sap.ui.core.ID
				key: "WorkCenter", // string
				index: 4, // int
				visibleInAdvancedArea: disableFiltersOnPhone // boolean
			}
		));

	};

	TechnicalObjectValueHelp.prototype._createSmartTableHierarchy = function () {
		var that = this;
		this._oSmartTableHierarchy = new SmartTable({
			persistencyKey: "malfuncManageSelectTechnicalObjectHierarchy",
			tableType: TableType.TreeTable,
			demandPopin: false,
			enableAutoBinding: true,
			editable: false,
			smartFilterId: "SmartFilterBarHierarchyId",
			smartVariant: this._oSmartVariantManagement.getId(),
			useExportToExcel: false,
			showRowCount: false,
			customData: {
				key: "p13nDialogSettings",
				value: {
					filter: {
						visible: false
					}
				}
			},
			ignoreFromPersonalisation: this.constants.TECHNICAL_FIELDS_HIERARCHY + "," + this.constants.IGNORE_FROM_PERSONALIZATION + "," +
				this.constants.TEXT_FIELDS_TO_IGNORE,
			requestAtLeastFields: this.constants.REQUEST_AT_LEAST_FIELDS,
			// initiallyVisibleFields: "TechnicalObjectDescription",
			customToolbar: that._oSmartTableToolbarHierarchy,
			items: [this._getCustomFieldsTableHierarchy()],
			beforeRebindTable: function (oEvt) {

				that._oSmartTableHierarchy.setHeader((that._oSelectedInstallationLocation.TechnicalObjectLabel) ?
					that._oResourceBundle.getText("xtit.technicalObjectStructure", [that._oSelectedInstallationLocation.TechnicalObjectLabel]) :
					that._oResourceBundle.getText("xtit.technicalObjects"));

				var oBindingParams = oEvt.getParameter("bindingParams");
				oBindingParams.parameters.useServersideApplicationFilters = true;
				oBindingParams.parameters.threshold = Number.MAX_VALUE; // fetch all entries
				oBindingParams.parameters.operationMode = "Client";
				//Expand nodes to the level of the selected entry object
					oBindingParams.parameters.numberOfExpandedLevels = 100;
				//oBindingParams.parameters.numberOfExpandedLevels = parseInt(that._oSelectedInstallationLocation.HierarchyNodeLevel, 10);
				var oTreeBindings = {
					"hierarchyLevelFor": "HierarchyNodeLevel",
					"hierarchyNodeFor": "HierarchyNodeUniqueID",
					"hierarchyParentNodeFor": "ParentNodeUniqueID",
					"hierarchyDrillStateFor": "DrillDownState"
				};
				var oCurDate = new Date();
				var oNewDate = new Date(0);
				var oTimeFormat = new sap.ui.model.odata.type.Time();
				var oTime = oTimeFormat.formatValue({
					ms: oCurDate.getTime(),
					__edmType: "Edm.Time"
				}, "any");
				oBindingParams.parameters.treeAnnotationProperties = oTreeBindings;
				var aFilters = [new Filter("TechnicalObject", "EQ", that._oSelectedInstallationLocation.TechnicalObject), new Filter(
					"TechObjIsEquipOrFuncnlLoc", "EQ", that._oSelectedInstallationLocation.TechObjIsEquipOrFuncnlLoc)];
				if (!oBindingParams.filters && Array.isArray(oBindingParams.filters)) {
					oBindingParams.filters.push(aFilters);
				} else {
					oBindingParams.filters = aFilters;
				}
				oBindingParams.events = {
					"dataReceived": function (oEvent) {
						var aReceivedData = oEvent.getParameter("data");
						if (aReceivedData.results.length >= 100 && this.getModel("HierModel").getProperty("/HierFlag") === "") {
							sap.m.MessageBox.information(that._oResourceBundle.getText("xtit.technicalObjectIdentifier"));
						}
						this.getModel("HierModel").setProperty("/HierFlag", "");
					}
				};
			}
		});
		this._oSmartTableHierarchy.addStyleClass("sapUiResponsiveMargin");
	};

	TechnicalObjectValueHelp.prototype._createSmartTableFlat = function () {
		this._oSmartTableFlat = new SmartTable({
			tableType: TableType.ResponsiveTable,
			persistencyKey: "malfuncManageSelectTechnicalObjectTableFlat",
			demandPopin: true,
			enableAutoBinding: true,
			smartFilterId: "SmartFilterBarFlatId",
			enableAutoColumnWidth: true,
			smartVariant: this._oSmartVariantManagement.getId(),
			useExportToExcel: false,
			customData: {
				key: "p13nDialogSettings",
				value: {
					filter: {
						visible: false
					}
				}
			},
			ignoreFromPersonalisation: "TechnicalObjectDescription," + this.constants.IGNORE_FROM_PERSONALIZATION + "," + this.constants.TEXT_FIELDS_TO_IGNORE,
			requestAtLeastFields: this.constants.REQUEST_AT_LEAST_FIELDS + ",HierarchyNodeLevel" + ",AssetLocation" + ",LocationName" + ",SuperiorFLOCEquipment,SuperiorFLOCEquipmentName",
			items: [this._getCustomFieldsTableFlat()]
		});
		this._oSmartTableFlat.addStyleClass("sapUiResponsiveMargin");
	};

	TechnicalObjectValueHelp.prototype._getCustomFieldsTableFlat = function () {
		var that = this;
		var enableHierarchyLink = (sap.ui.Device.system.combi || sap.ui.Device.system.desktop || sap.ui.Device.system.tablet || sap.ui.Device.system.phone);

		return new Table({
			itemPress: function (oEvent) {
				var oSelectedTechnicalObject = oEvent.getParameter("listItem").getBindingContext().getObject();
				that.fireTechnicalObjectSelected(oSelectedTechnicalObject);
				that.close();
			},
			growing: true,
			growingScrollToLoad: true,
			columns: [
				new Column({
					id: that.constants.TECHNICAL_OBJECT_IDENTIFIER_FLAT_TABLE,
					header: new Text({}),
					customData: new CustomData({
						key: "p13nData",
						value: {
							"columnKey": "TechnicalObjectIdentifier",
							"leadingProperty": "TechnicalObjectLabel",
							"sortProperty": "TechnicalObjectLabel",
							"filterProperty": "TechnicalObjectLabel",
							"columnIndex": "0"
						}
					})
				}),
				new Column({
					id: "TechObjInstallationLocation",
					demandPopin: true,
					header: new Text({
						text: "{/C_TechObjFlatVH/TechObjInstallationLocation/#@sap:label}"
					}),
					customData: new CustomData({
						key: "p13nData",
						value: {
							"columnKey": "TechObjInstallationLocationLink",
							"leadingProperty": "TechObjInstallationLocation",
							"filterProperty": "TechObjInstallationLocation",
							"columnIndex": "1"
						}
					})
				})
			],
			items: [
				new ColumnListItem({
					type: sap.m.ListType.Active,
					cells: [
						new HBox({
							alignItems: FlexAlignItems.Center,
							items: [new Icon({
									src: {
										path: "TechObjIsEquipOrFuncnlLoc",
										formatter: that._getTechnicalObjectIcon.bind(that)
									}
								}).addStyleClass("sapUiSmallMarginEnd"),
								new ObjectIdentifier({
									title: "{TechnicalObjectLabel}",
									text: "{TechnicalObjectDescription}"
								})
							]

						}),
						new Link({
							text: "{TechObjInstallationLocation}",
							enabled: enableHierarchyLink,
							wrapping: true,
							visible: "{= ${TechObjInstallationLocation}?true:false}",
							press: function (oEvent) {
								that._oSelectedInstallationLocation = oEvent.getSource().getParent().getBindingContext().getObject();
								//Show hierarchy table
								that._displayHierarchy();
								that._oSmartTableHierarchy.rebindTable();
								oEvent.preventDefault = true;
							}
						})
					]
				})
			]
		});
	};

	TechnicalObjectValueHelp.prototype._getCustomFieldsTableHierarchy = function () {
		var that = this;
		var oTreeTable = new TreeTable({
			rootLevel: 1,
			enableSelectAll: false,
			selectionMode: SelectionMode.Single,
			selectionBehavior: SelectionBehavior.RowOnly,
			visibleRowCountMode: "Interactive",
			visibleRowCount: 16,
			rowSelectionChange: function (oEvent) {
				var sSelectedRowPath = oEvent.getParameter("rowContext").sPath;
				var oSelectedTechnicalObject = this.getModel().getProperty(sSelectedRowPath);
				that.getModel("HierModel").setProperty("/HierFlag", "X");
				that.fireTechnicalObjectSelected(oSelectedTechnicalObject);
				that.close();
			},
			columns: [
				new TreeColumn({
					id: that.constants.TECHNICAL_OBJECT_IDENTIFIER_HIERARCHY_TABLE,
					label: new Text({}),
					template: new HorizontalLayout({
						content: [new Icon({
							src: {
								path: "TechObjIsEquipOrFuncnlLoc",
								formatter: that._getTechnicalObjectIcon.bind(that)
							}
						}).addStyleClass("sapUiSmallMarginEnd"), new Text({
							text: {
								parts: [{
									path: "TechnicalObjectDescription"
								}, {
									path: "TechnicalObjectLabel"
								}],
								formatter: that._concatIdAndDescription.bind(that)
							}
						})]
					}),
					customData: new CustomData({
						key: "p13nData",
						value: {
							"columnKey": "TechnicalObjectIdentifier",
							"leadingProperty": "TechnicalObjectLabel",
							"sortProperty": "TechnicalObjectLabel",
							"filterProperty": "TechnicalObjectLabel",
							"columnIndex": "0"
						}
					})
				})
			]
		});
		oTreeTable.addStyleClass("sapUiSizeCompact");
		return oTreeTable;
	};
	TechnicalObjectValueHelp.prototype._concatIdAndDescription = function (sDescription, sId) {
		if (sDescription && sDescription.trim()) {
			return sDescription + ((sId) ? " (" + sId + ")" : "");
		} else {
			return (sId) ? sId : "";
		}
	};
	TechnicalObjectValueHelp.prototype._getTechnicalObjectIcon = function (sTechObjIsEquipOrFuncnlLoc) {
		var sIconPath = "";
		switch (sTechObjIsEquipOrFuncnlLoc) {
		case this.constants.EQUIPMENT:
			sIconPath = this.constants.EQUIPMENT_ICON;
			break;
		case this.constants.FUNCTIONAL_LOCATION:
			sIconPath = this.constants.FUNCTIONAL_LOCATION_ICON;
			break;
		case "":
			sIconPath = "";
			break;
		case null:
			sIconPath = "";
			break;
		default:
			throw new Error("Unknown Technical Object Type");
		}
		return sIconPath;
	};

	return TechnicalObjectValueHelp;
});