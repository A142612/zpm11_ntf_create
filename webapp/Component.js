sap.ui.define([
    "sap/ui/core/UIComponent",
    "pm11/zpm11nftcreate/model/models",
    "pm11/zpm11nftcreate/util/Constants"
], (UIComponent, models, CONSTANTS) => {
    "use strict";

    return UIComponent.extend("pm11.zpm11nftcreate.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        oRootView: null,

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");
            // set the App model
			this.setModel(models.createAppModel(), CONSTANTS.MODEL.APP_MODEL.NAME);

            // enable routing
            this.getRouter().initialize();
        },
     //   createContent: function() {
			// call the base component's createContent function
		//	this.oRootView = UIComponent.prototype.createContent.apply(this, arguments);
			//this.oRootView.addStyleClass(this.getCompactCozyClass());
			//return this.oRootView;
		//},
        /**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy'
		 */
		getCompactCozyClass: function() {
			if (!this._sCompactCozyClass) {
				// if (!Device.support.touch) { // apply compact mode if touch is not supported; this could me made configurable for the user on "combi" devices with touch AND mouse
				// 	this._sCompactCozyClass = "sapUiSizeCompact";
				// } else {
				this._sCompactCozyClass = "sapUiSizeCozy"; // needed for desktop-first controls like sap.ui.table.Table
				//	}
			}
			return this._sCompactCozyClass;
		}
    });
});