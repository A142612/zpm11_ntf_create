sap.ui.define([
    "sap/ui/core/UIComponent",
    "pm11/zpm11nftcreate/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("pm11.zpm11nftcreate.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        }
    });
});