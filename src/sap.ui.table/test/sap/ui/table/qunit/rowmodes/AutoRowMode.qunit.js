/*global QUnit, sinon */

sap.ui.define([
	"sap/ui/table/qunit/TableQUnitUtils",
	"sap/ui/table/rowmodes/AutoRowMode",
	"sap/ui/table/Table",
	"sap/ui/table/Column",
	"sap/ui/table/RowAction",
	"sap/ui/table/CreationRow",
	"sap/ui/table/utils/TableUtils",
	"sap/ui/table/library",
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function(TableQUnitUtils, AutoRowMode, Table, Column, RowAction, CreationRow, TableUtils, library, JSONModel, Device) {
	"use strict";

	var VisibleRowCountMode = library.VisibleRowCountMode;
	var HeightTestControl = TableQUnitUtils.HeightTestControl;

	function waitForResizeHandler() {
		// Give the table time to react. Default interval of IntervalTrigger singleton that is used by the ResizeHandler is 200ms.
		return TableQUnitUtils.wait(250);
	}

	QUnit.module("Legacy support", {
		beforeEach: function() {
			this.oTable = TableQUnitUtils.createTable({
				visibleRowCountMode: VisibleRowCountMode.Auto,
				fixedRowCount: 1,
				fixedBottomRowCount: 2,
				minAutoRowCount: 8,
				rowHeight: 9,
				rows: {path: "/"},
				models: TableQUnitUtils.createJSONModelWithEmptyRows(1)
			});
			this.oTable.setProperty("visibleRowCount", 5);
			this.oMode = this.oTable._getRowMode();
		},
		afterEach: function() {
			this.oTable.destroy();
		}
	});

	QUnit.test("Instance", function(assert) {
		assert.ok(TableUtils.isA(this.oMode, "sap.ui.table.rowmodes.AutoRowMode"),
			"The table creates an instance of sap.ui.table.rowmodes.AutoRowMode");
	});

	QUnit.test("Property getters", function(assert) {
		var oTable = this.oTable;
		var oMode = this.oMode;

		assert.strictEqual(oMode.getRowCount(), 5, "The row count is taken from the table");
		assert.strictEqual(oMode.getFixedTopRowCount(), 1, "The fixed row count is taken from the table");
		assert.strictEqual(oMode.getFixedBottomRowCount(), 2, "The fixed bottom row count is taken from the table");
		assert.strictEqual(oMode.getMinRowCount(), 8, "The minimum row count is taken from the table");
		assert.strictEqual(oMode.getRowContentHeight(), 9, "The row content height is taken from the table");

		oMode.setFixedTopRowCount(10);
		oMode.setFixedBottomRowCount(10);
		oMode.setMinRowCount(10);
		oMode.setRowContentHeight(10);

		assert.strictEqual(oMode.getRowCount(), 5, "The row count is taken from the table");
		assert.strictEqual(oMode.getFixedTopRowCount(), 1, "The fixed row count is taken from the table");
		assert.strictEqual(oMode.getFixedBottomRowCount(), 2, "The fixed bottom row count is taken from the table");
		assert.strictEqual(oMode.getMinRowCount(), 8, "The minimum row count is taken from the table");
		assert.strictEqual(oMode.getRowContentHeight(), 9, "The row content height is taken from the table");

		oTable.setProperty("visibleRowCount", 10);
		oTable.setFixedRowCount(2);
		oTable.setFixedBottomRowCount(3);
		oTable.setMinAutoRowCount(13);
		oTable.setRowHeight(14);

		assert.strictEqual(oMode.getRowCount(), 10, "The row count is taken from the table");
		assert.strictEqual(oMode.getFixedTopRowCount(), 2, "The fixed row count is taken from the table");
		assert.strictEqual(oMode.getFixedBottomRowCount(), 3, "The fixed bottom row count is taken from the table");
		assert.strictEqual(oMode.getMinRowCount(), 13, "The minimum row count is taken from the table");
		assert.strictEqual(oMode.getRowContentHeight(), 14, "The row content height is taken from the table");
	});

	QUnit.test("After rendering", function(assert) {
		this.oTable.setRowHeight();
		return this.oTable.qunit.whenRenderingFinished().then(function() {
			assert.equal(this.oTable.getRows().length, 19, "Row count");
			assert.equal(this.oTable.getVisibleRowCount(), 19, "'visibleRowCount' property value");
		}.bind(this));
	});

	QUnit.module("Row heights", {
		beforeEach: function() {
			this.oTable = TableQUnitUtils.createTable({
				columns: [
					new Column({template: new HeightTestControl({height: "1px"})}),
					new Column({template: new HeightTestControl({height: "1px"})})
				],
				fixedColumnCount: 1,
				rowActionCount: 1,
				rowActionTemplate: new RowAction(),
				rows: {path: "/"},
				models: TableQUnitUtils.createJSONModelWithEmptyRows(1)
			}, function(oTable) {
				oTable.setRowMode(new AutoRowMode());
			});
		},
		afterEach: function() {
			this.oTable.destroy();
		}
	});

	QUnit.test("Content row height", function(assert) {
		var oTable = this.oTable;
		var oBody = document.body;
		var aDensities = ["sapUiSizeCozy", "sapUiSizeCompact", "sapUiSizeCondensed", undefined];
		var pSequence = Promise.resolve();

		/* BCP: 1880420532 (IE), 1880455493 (Edge) */
		if (Device.browser.msie || Device.browser.edge) {
			document.getElementById("qunit-fixture").classList.remove("visible");
		}

		function test(mTestSettings) {
			pSequence = pSequence.then(function() {
				oTable.getRowMode().setRowContentHeight(mTestSettings.rowContentHeight || 0);
				oTable.getColumns()[1].setTemplate(new HeightTestControl({height: (mTestSettings.templateHeight || 1) + "px"}));
				oBody.classList.remove("sapUiSizeCozy");
				oBody.classList.remove("sapUiSizeCompact");
				oTable.removeStyleClass("sapUiSizeCondensed");

				if (mTestSettings.density != null) {
					if (mTestSettings.density === "sapUiSizeCondensed") {
						oBody.classList.add("sapUiSizeCompact");
						oTable.addStyleClass("sapUiSizeCondensed");
					} else {
						oBody.classList.add(mTestSettings.density);
					}
				}

				sap.ui.getCore().applyChanges();
				return oTable.qunit.whenRenderingFinished();

			}).then(function() {
				var sDensity = mTestSettings.density ? mTestSettings.density.replace("sapUiSize", "") : "undefined";
				mTestSettings.title += " (Density=\"" + sDensity + "\")";

				var aRowDomRefs = oTable.getRows()[0].getDomRefs();
				assert.strictEqual(aRowDomRefs.rowSelector.getBoundingClientRect().height, mTestSettings.expectedHeight,
					mTestSettings.title + ": Selector height is ok");
				assert.strictEqual(aRowDomRefs.rowFixedPart.getBoundingClientRect().height, mTestSettings.expectedHeight,
					mTestSettings.title + ": Fixed part height is ok");
				assert.strictEqual(aRowDomRefs.rowScrollPart.getBoundingClientRect().height, mTestSettings.expectedHeight,
					mTestSettings.title + ": Scrollable part height is ok");
				assert.strictEqual(aRowDomRefs.rowAction.getBoundingClientRect().height, mTestSettings.expectedHeight,
					mTestSettings.title + ": Action height is ok");
			});
		}

		aDensities.forEach(function(sDensity) {
			test({
				title: "Row height should be fixed to default height",
				density: sDensity,
				expectedHeight: TableUtils.DefaultRowHeight[sDensity]
			});

			test({
				title: "Row height should be fixed to default height",
				density: sDensity,
				templateHeight: TableUtils.DefaultRowHeight[sDensity] * 2,
				expectedHeight: TableUtils.DefaultRowHeight[sDensity]
			});

			test({
				title: "Application defined height should override default height",
				density: sDensity,
				rowContentHeight: 20,
				expectedHeight: 21
			});

			test({
				title: "Application defined height should override default height",
				density: sDensity,
				rowContentHeight: 20,
				templateHeight: 100,
				expectedHeight: 21
			});

			test({
				title: "Application defined height should override default height",
				density: sDensity,
				rowContentHeight: 100,
				expectedHeight: 101
			});

			test({
				title: "Application defined height should override default height",
				density: sDensity,
				rowContentHeight: 100,
				templateHeight: 120,
				expectedHeight: 101
			});
		});

		return pSequence.then(function() {
			oTable.destroy();
			oBody.classList.remove("sapUiSizeCompact");
			oBody.classList.add("sapUiSizeCozy");

			/* BCP: 1880420532 (IE), 1880455493 (Edge) */
			if (Device.browser.msie || Device.browser.edge) {
				document.getElementById("qunit-fixture").classList.add("visible");
			}
		});
	});

	QUnit.test("Header row height", function(assert) {
		var oTable = this.oTable;
		var oBody = document.body;
		var aDensities = ["sapUiSizeCozy", "sapUiSizeCompact", "sapUiSizeCondensed", undefined];
		var pSequence = Promise.resolve();
		var iPadding = 14;

		/* BCP: 1880420532 (IE), 1880455493 (Edge) */
		if (Device.browser.msie || Device.browser.edge) {
			document.getElementById("qunit-fixture").classList.remove("visible");
		}

		function test(mTestSettings) {
			pSequence = pSequence.then(function() {
				oTable.setColumnHeaderHeight(mTestSettings.columnHeaderHeight || 0);
				oTable.getRowMode().setRowContentHeight(mTestSettings.rowContentHeight || 0);
				oTable.getColumns()[1].setLabel(new HeightTestControl({height: (mTestSettings.labelHeight || 1) + "px"}));
				oBody.classList.remove("sapUiSizeCozy");
				oBody.classList.remove("sapUiSizeCompact");
				oTable.removeStyleClass("sapUiSizeCondensed");

				if (mTestSettings.density != null) {
					if (mTestSettings.density === "sapUiSizeCondensed") {
						oBody.classList.add("sapUiSizeCompact");
						oTable.addStyleClass("sapUiSizeCondensed");
					} else {
						oBody.classList.add(mTestSettings.density);
					}
				}

				sap.ui.getCore().applyChanges();
				return oTable.qunit.whenRenderingFinished();

			}).then(function() {
				var sDensity = mTestSettings.density ? mTestSettings.density.replace("sapUiSize", "") : "undefined";
				mTestSettings.title += " (Density=\"" + sDensity + "\")";

				var aRowDomRefs = oTable.getDomRef().querySelectorAll(".sapUiTableColHdrTr");
				var oColumnHeaderCnt = oTable.getDomRef().querySelector(".sapUiTableColHdrCnt");

				assert.strictEqual(aRowDomRefs[0].getBoundingClientRect().height, mTestSettings.expectedHeight,
					mTestSettings.title + ": Fixed part height is ok");
				assert.strictEqual(aRowDomRefs[1].getBoundingClientRect().height, mTestSettings.expectedHeight,
					mTestSettings.title + ": Scrollable part height is ok");
				assert.strictEqual(oColumnHeaderCnt.getBoundingClientRect().height, mTestSettings.expectedHeight + 1 /* border */,
					mTestSettings.title + ": Column header container height is ok");
			});
		}

		aDensities.forEach(function(sDensity) {
			test({
				title: "Row content height should not apply to header rows",
				density: sDensity,
				labelHeight: 87,
				expectedHeight: 87 + iPadding
			});

			test({
				title: "Row content height should not apply to header rows",
				density: sDensity,
				rowContentHeight: 55,
				expectedHeight: TableUtils.DefaultRowHeight[sDensity === "sapUiSizeCondensed" ? "sapUiSizeCompact" : sDensity]
			});

			test({
				title: "Row content height should not apply to header rows",
				density: sDensity,
				columnHeaderHeight: 55,
				expectedHeight: 55
			});
		});

		return pSequence.then(function() {
			oTable.destroy();
			oBody.classList.remove("sapUiSizeCompact");
			oBody.classList.add("sapUiSizeCozy");

			/* BCP: 1880420532 (IE), 1880455493 (Edge) */
			if (Device.browser.msie || Device.browser.edge) {
				document.getElementById("qunit-fixture").classList.add("visible");
			}
		});
	});

	QUnit.module("Automatic row count adjustment", {
		beforeEach: function() {
			this.oTable = TableQUnitUtils.createTable({
				extension: [
					new HeightTestControl({height: "100px"})
				],
				footer: new HeightTestControl({height: "100px"}),
				columns: [
					TableQUnitUtils.createTextColumn()
				],
				rows: {path: "/"},
				models: TableQUnitUtils.createJSONModelWithEmptyRows(1)
			}, function(oTable) {
				oTable.setRowMode(new AutoRowMode());
				oTable.setCreationRow(new CreationRow());
			});

			return this.oTable.qunit.whenRenderingFinished();
		},
		afterEach: function() {
			this.oTable.destroy();
		}
	});

	QUnit.test("After rendering", function(assert) {
		assert.equal(this.oTable.getRows().length, 13, "Row count");
	});

	QUnit.test("Resize", function(assert) {
		var that = this;

		return this.oTable.qunit.resize({height: "765px"}).then(function() {
			assert.equal(that.oTable.getRows().length, 9, "Row count after decreasing height");
		}).then(this.oTable.qunit.resetSize).then(function() {
			assert.equal(that.oTable.getRows().length, 13, "Row count after increasing height");
		});
	});

	QUnit.test("Changing visibility of an extension", function(assert) {
		var that = this;

		this.oTable.getExtension()[0].setVisible(false);

		return waitForResizeHandler().then(this.oTable.qunit.whenRenderingFinished).then(function() {
			assert.equal(that.oTable.getRows().length, 15, "Row count after hiding an extension");
			that.oTable.getExtension()[0].setVisible(true);
		}).then(waitForResizeHandler).then(this.oTable.qunit.whenRenderingFinished).then(function() {
			assert.equal(that.oTable.getRows().length, 13, "Row count after showing an extension");
		});
	});

	QUnit.test("Changing visibility of the footer", function(assert) {
		var that = this;

		this.oTable.getFooter().setVisible(false);

		return waitForResizeHandler().then(this.oTable.qunit.whenRenderingFinished).then(function() {
			assert.equal(that.oTable.getRows().length, 14, "Row count after hiding the footer");
			that.oTable.getFooter().setVisible(true);
		}).then(waitForResizeHandler).then(this.oTable.qunit.whenRenderingFinished).then(function() {
			assert.equal(that.oTable.getRows().length, 13, "Row count after showing the footer");
		});
	});

	QUnit.test("Changing visibility of the creation row", function(assert) {
		var that = this;

		this.oTable.getCreationRow().setVisible(false);

		return waitForResizeHandler().then(this.oTable.qunit.whenRenderingFinished).then(function() {
			assert.equal(that.oTable.getRows().length, 14, "Row count after hiding the creation row");
			that.oTable.getCreationRow().setVisible(true);
		}).then(waitForResizeHandler).then(this.oTable.qunit.whenRenderingFinished).then(function() {
			assert.equal(that.oTable.getRows().length, 13, "Row count after showing the creation row");
		});
	});

	QUnit.module("Hide empty rows");

	QUnit.test("Initialize with hideEmptyRows=false", function(assert) {
		var oDisableNoData = sinon.spy(AutoRowMode.prototype, "disableNoData");
		var oEnableNoData = sinon.spy(AutoRowMode.prototype, "enableNoData");
		var oRowMode = new AutoRowMode();

		assert.ok(oDisableNoData.notCalled, "#disableNoData was not called");
		assert.ok(oEnableNoData.notCalled, "#enableNoData was not called");

		oDisableNoData.restore();
		oEnableNoData.restore();
		oRowMode.destroy();
	});

	QUnit.test("Initialize with hideEmptyRows=true", function(assert) {
		var oDisableNoData = sinon.spy(AutoRowMode.prototype, "disableNoData");
		var oEnableNoData = sinon.spy(AutoRowMode.prototype, "enableNoData");
		var oRowMode = new AutoRowMode({
			hideEmptyRows: true
		});

		assert.equal(oDisableNoData.callCount, 1, "#disableNoData was called once");
		assert.ok(oEnableNoData.notCalled, "#enableNoData was not called");

		oDisableNoData.restore();
		oEnableNoData.restore();
		oRowMode.destroy();
	});

	QUnit.test("Change 'hideEmptyRows' property", function(assert) {
		var oRowMode = new AutoRowMode();
		var oDisableNoData = sinon.spy(oRowMode, "disableNoData");
		var oEnableNoData = sinon.spy(oRowMode, "enableNoData");

		oRowMode.setHideEmptyRows(false);
		assert.ok(oDisableNoData.notCalled, "Change from true to false: #disableNoData was not called");
		assert.equal(oEnableNoData.callCount, 1, "Change from true to false: #enableNoData was called once");

		oDisableNoData.reset();
		oEnableNoData.reset();
		oRowMode.setHideEmptyRows(true);
		assert.equal(oDisableNoData.callCount, 1, "Change from false to true: #disableNoData was called once");
		assert.ok(oEnableNoData.notCalled, "Change from false to true: #enableNoData was not called");
	});
});