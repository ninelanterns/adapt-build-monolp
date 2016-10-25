define([
	"core/js/views/menuView",
	"core/js/adapt",
	"menu/adapt-filterMenu/js/adapt-filterMenuStripView",
	"core/js/models/adaptModel",
	"menu/adapt-filterMenu/js/adapt-filterMenuDashboardView"
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
			var items = new Backbone.Collection();

			for (var i = 0, j = strips.length; i < j; i++) {
				items.add(strips[i]._items);
			}

			var completed = items.where({ _isOptional: false, _isComplete: true });
			var mandatory = items.where({ _isOptional: false });

			return parseInt(completed.length / mandatory.length * 100, 10) + "%";
		}

	}, { template: "filterMenu" });

	function setUpModels(config) {
		var strips = config._strips;

		for (var i = 0, j = strips.length; i < j; i++) {
			var items = strips[i]._items;

			for (var k = 0, l = items.length; k < l; k++) {
				items[k] = getModel(items[k]);
			}
		}
	}

	function getModel(item) {
		var id = item._id;
		var model = item._type === "resource" ?
			new AdaptModel(item) :
			Adapt.findById(id);

		if (!model) throw "Filter Menu: ID \"" + id + "\" not found";

		var suspendData = Adapt.offlineStorage.get("filterMenu");

		return model.set({
			_tags: item._tags,
			_isFiltered: false,
			_isPinned: suspendData && _.contains(suspendData.pinned, id) || false,
			_isComplete: suspendData && _.contains(suspendData.resources, id) || false
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

		setUpModels(config);

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