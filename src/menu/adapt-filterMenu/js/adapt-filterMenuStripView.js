define([
	"core/js/views/adaptView",
	"core/js/adapt",
	"menu/adapt-filterMenu/js/adapt-filterMenuItemView"
], function(AdaptView, Adapt, FilterMenuItemView) {

	var FilterMenuStripView = AdaptView.extend({

		queuedItems: 0,

		className: function() {
			var classes = "filter-menu-strip";
			var modelClasses = this.model.get("_classes");

			if (modelClasses) classes += " " + modelClasses;

			return classes;
		},

		attributes: function() {
			return { "data-strip": this.model.get("_id") };
		},

		events: {
			"click .filter-menu-control": "onControlClick",
			"focus .filter-menu-item .aria-label": "onItemFocus"
		},

		initialize: function() {
			if (!Adapt.device.touch) {
				this.listenTo(Adapt, "device:resize", this.onDeviceResize);
			}

			this.listenTo(Adapt, {
				"filterMenu:reRender": this.remove,
				"filterMenu:updateProgress": this.setProgress
			});

			AdaptView.prototype.initialize.call(this);
		},

		preRender: function() {
			this.$el.css("opacity", 0);
		},

		postRender: function() {
			this.$el.velocity({ opacity: 1 }, "fast");
			this.setUpItems();
			this.setProgress();
			this.setControlsVisibility();
		},

		onControlClick: function(event) {
			var direction = $(event.currentTarget).hasClass("left") ? "left" : "right";

			this.scroll(direction);
		},

		onItemFocus: function(event) {
			var $item = $(event.currentTarget).parents(".filter-menu-item");

			this.$(".filter-menu-items-container").scrollLeft($item.position().left);
			this.setControlsVisibility();
		},

		onDeviceResize: function() {
			this.setControlsVisibility();
		},

		setControlsVisibility: function(scrollLeft) {
			if (Adapt.device.touch) return;

			var $container = this.$(".filter-menu-items-container");
			var $controls = this.$(".filter-menu-control");
			var scrollWidth = this.$(".filter-menu-items")[0].scrollWidth;

			if (scrollLeft === undefined) scrollLeft = $container.scrollLeft();

			var showLeftControl = scrollLeft > 0;
			var showRightControl = scrollLeft + $container.width() < scrollWidth;

			$controls.filter(".left").toggleClass("display-none", !showLeftControl);
			$controls.filter(".right").toggleClass("display-none", !showRightControl);
		},

		scroll: function(direction) {
			var itemLeft;
			var $container = this.$(".filter-menu-items-container");
			var scrollLeft = $container.scrollLeft();
			var width = $container.width();

			this.$(".filter-menu-item").each(function() {
				var $item = $(this);

				itemLeft = $item.position().left;

				switch (direction) {
					case "left":
						if (itemLeft > scrollLeft - width) return false;
						break;
					case "right":
						if (itemLeft + $item.width() > scrollLeft + width) return false;
				}
			});

			this.setControlsVisibility(itemLeft);
			$container.animate({ scrollLeft: itemLeft });
		},

		setUpItems: function() {
			var items = this.model.get("_items");
			var $container = this.$(".filter-menu-items");

			for (var i = 0, j = items.length; i < j; i++) {
				var item = items[i];

				if (item.get("_isFiltered")) continue;

				var view = new FilterMenuItemView({ model: item });

				this.queuedItems++;
				this.listenToOnce(view, "ready", this.onItemReady);
				$container.append(view.$el);
			}

			this.$el.toggleClass("empty", !this.queuedItems);

			if (!this.queuedItems) this.setReadyStatus();
		},

		setReadyStatus: function() {
			Adapt.trigger("filterMenu:stripReady");
		},

		onItemReady: function() {
			this.queuedItems--;

			if (!this.queuedItems) this.setReadyStatus();
		},

		setProgress: function() {
			if (!this.model.get("_isProgressEnabled")) return;

			var $bar = this.$(".filter-menu-strip-progress-bar");
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
		},

		getProgress: function() {
			var items = new Backbone.Collection(this.model.get("_items"));
			var completed = items.where({ _isOptional: false, _isComplete: true });
			var mandatory = items.where({ _isOptional: false });

			return parseInt(completed.length / mandatory.length * 100, 10) + "%";
		},

		remove: function() {
			this._isRemoved = true;
			this.stopListening().$el.remove();
		}

	}, { template: "filterMenuStrip" });

	return FilterMenuStripView;

});