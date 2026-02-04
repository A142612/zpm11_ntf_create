/*global QUnit*/

sap.ui.define([
	"pm11/zpm11nftcreate/controller/CreateNotification.controller"
], function (Controller) {
	"use strict";

	QUnit.module("CreateNotification Controller");

	QUnit.test("I should test the CreateNotification controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
