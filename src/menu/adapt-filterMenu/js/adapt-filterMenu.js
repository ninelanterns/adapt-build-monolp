define([
	"core/js/views/menuView",
	"core/js/adapt",
	"./adapt-filterMenuStripView",
	"core/js/models/adaptModel",
	"./adapt-filterMenuDashboardView"
], function(MenuView, Adapt, FilterMenuStripView, AdaptModel, FilterMenuDashboardView) {

	var FilterMenuView = MenuView.extend({

		queuedStrips: 0,

		initialize: function() {
			Adapt.trigger("filterMenu:filter");
			this.listenTo(Adapt, {
				"filterMenu:reRender": this.onReRender,
				"filterMenu:stripReady": this.onStripReady,
				"filterMenu:ready": this.setReadyStatus,
				"filterMenu:updateProgress": this.setProgress
			}).$el.addClass("filter-menu-container");

			MenuView.prototype.initialize.call(this);
		},

		postRender: function() {
			this.setUpStrips();
		},

		onReRender: function() {
			this.render().setProgress();
		},

		onStripReady: function() {
			this.queuedStrips--;

			if (this.queuedStrips) return;

			this.setProgress();
			Adapt.trigger("filterMenu:ready");
		},

		setUpStrips: function() {
			var strips = this.model.get("_filterMenu")._strips;
			var $inner = this.$(".filter-menu-strips");

			for (var i = 0, j = strips.length; i < j; i++) {
				this.queuedStrips++;

				$inner.append(new FilterMenuStripView({
					model: new Backbone.Model(strips[i])
				}).$el);
			}
		},

		setProgress: function() {
			if (!this.model.get("_filterMenu")._isProgressEnabled) return;

			var $bar = this.$(".filter-menu-progress-bar");
			var $aria = $bar.siblings("span");
			var globals = this.model.get("_globals")._menu._filterMenu;
			var percentage = this.getProgress();

			if (!$aria.length) {
				$aria = $("<span/>", {
					"class": "aria-label prevent-default",
					role: "region",
					tabindex: 0
				}).insertBefore($bar);
			}

			$aria.text(globals.progressAria + percentage);
			$bar.width(percentage);
			this.$(".filter-menu-progress-text").html(percentage + globals.progress);
		},

		getProgress: function() {
			var strips = this.model.get("_filterMenu")._strips;
			var completed = 0;
			var mandatory = 0;

			for (var i = 0, j = strips.length; i < j; i++) {
				var items = strips[i]._items;

				for (var k = 0, l = items.length; k < l; k++) {
					var item = items[k];

					if (!item.get("_isAvailable") || item.get("_isOptional")) continue;

					if (item.get("_isComplete")) completed++;

					mandatory++;
				}
			}

			return Math.round(completed / mandatory * 100) + "%";
		},

	}, { template: "filterMenu" });

	function setUpItems(config) {
		var strips = config._strips;

		for (var i = 0, j = strips.length; i < j; i++) {
			var items = strips[i]._items;

			for (var k = 0, l = items.length; k < l; k++) {
				items[k] = setUpModel(items[k]);
			}
		}
	}

	function setUpModel(item) {
		var isResource = item._type === "resource";
		var id = item._id;
		var model = isResource ? new AdaptModel(item) : Adapt.findById(id);

		if (!model) throw "Filter Menu: ID \"" + id + "\" not found";

		var suspendData = Adapt.offlineStorage.get("filterMenu");
		var isResourceComplete = suspendData && _.contains(suspendData.resources, id);

		if (isResource && isResourceComplete) model.set("_isComplete", true);

		return model.set({
			_tags: item._tags || [],
			_isFiltered: false,
			_isPinned: suspendData && _.contains(suspendData.pinned, id) || false
		});
	}

	Adapt.once("adapt:start", function() {
		var course = Adapt.course;
		var menuRoot = course.has("_filterMenu") ?
			course :
			Adapt.contentObjects.find("_filterMenu");

		if (!menuRoot) return;

		var config = menuRoot.get("_filterMenu");
		var dashboard = config._dashboard;

		setUpItems(config);

		if (dashboard && dashboard._isEnabled) {
			new FilterMenuDashboardView({ model: new Backbone.Model(config) });
		}

		Adapt.on("router:menu", function(model) {
			if (model.get("_id") === menuRoot.get("_id")) {
				$("#wrapper").append(new FilterMenuView({ model: model }).$el);
			}
		});
	});

});