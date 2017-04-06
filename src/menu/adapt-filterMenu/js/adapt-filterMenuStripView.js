define([
	"core/js/views/adaptView",
	"core/js/adapt",
	"./adapt-filterMenuItemView"
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

			this.textDirection = this.getTextDirection();

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
			var itemLeft = this.getItemLeft(direction);

			this.setControlsVisibility(itemLeft);
			this.scroll(itemLeft, true);
		},

		onItemFocus: function(event) {
			var $item = $(event.currentTarget).parents(".filter-menu-item");
			var scrollWidth = this.$(".filter-menu-items-container")[0].scrollWidth;
			var itemLeft = this.textDirection === "ltr" ?
				$item.position().left :
				scrollWidth - $item.position().left - $item.width();

			this.scroll(itemLeft, false);
			this.setControlsVisibility();
		},

		onDeviceResize: function() {
			this.setControlsVisibility();
		},

		getTextDirection: function() {
			var direction = Adapt.config.get("_defaultDirection");

			if (direction === "ltr") return direction;

			var $element = $("<div/>", {
				css: { overflow: "scroll", width: "1px" },
				html: "&nbsp;",
			}).appendTo("body");

			var element = $element[0];

			direction = "rtlWebkit";

			if (element.scrollLeft === 0) {
				element.scrollLeft = 1;
				direction = element.scrollLeft === 0 ? "rtlGecko" : "rtlIe";
			}

			$element.remove();

			return direction;
		},

		setControlsVisibility: function(scrollLeft) {
			if (Adapt.device.touch) return;

			var $container = this.$(".filter-menu-items-container");
			var scrollWidth = this.$(".filter-menu-items")[0].scrollWidth;
			var $controls = this.$(".filter-menu-control");

			if (scrollLeft === undefined) scrollLeft = this.getScrollLeft();

			var showLeftControl = scrollLeft > 0;
			var showRightControl = scrollLeft + $container.width() < scrollWidth;

			$controls.filter(".left").toggleClass("display-none", !showLeftControl);
			$controls.filter(".right").toggleClass("display-none", !showRightControl);
		},

		getScrollLeft: function() {
			var $container = this.$(".filter-menu-items-container");
			var scrollLeft = $container.scrollLeft();

			switch (this.textDirection) {
				case "rtlWebkit":
					return $container[0].scrollWidth - $container.width() - scrollLeft;
				case "rtlGecko":
					return Math.abs(scrollLeft);
				default:
					return scrollLeft;
			}
		},

		getItemLeft: function(direction) {
			var scrollLeft = this.getScrollLeft();
			var containerWidth = this.$(".filter-menu-items-container").width();
			var items = this.$(".filter-menu-item").get();

			if (this.textDirection !== "ltr") items.reverse();

			for (var i = 0, j = items.length; i < j; i++) {
				var $item = $(items[i]);
				var itemLeft = $item.position().left;
				var itemRight = itemLeft + $item.width();

				switch (direction) {
					case "left":
						if (itemLeft > scrollLeft - containerWidth) return itemLeft;
						break;
					case "right":
						if (itemRight > scrollLeft + containerWidth) return itemLeft;
				}
			}
		},

		scroll: function(itemLeft, shouldAnimate) {
			var $container = this.$(".filter-menu-items-container");

			switch (this.textDirection) {
				case "rtlWebkit":
					itemLeft = $container[0].scrollWidth - $container.width() - itemLeft;
					break;
				case "rtlGecko":
					itemLeft = -itemLeft;
			}

			$container.animate({ scrollLeft: itemLeft }, shouldAnimate ? 400 : 0);
		},

		setUpItems: function() {
			var items = this.model.get("_items");
			var $container = this.$(".filter-menu-items");

			for (var i = 0, j = items.length; i < j; i++) {
				var item = items[i];

				if (!item.get("_isAvailable") || item.get("_isFiltered")) continue;

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
			var items = this.model.get("_items");
			var completed = 0;
			var mandatory = 0;

			for (var i = 0, j = items.length; i < j; i++) {
				var item = items[i];

				if (!item.get("_isAvailable") || item.get("_isOptional")) continue;

				if (item.get("_isComplete")) completed++;

				mandatory++;
			}

			return Math.round(completed / mandatory * 100) + "%";
		},

		remove: function() {
			this._isRemoved = true;
			this.stopListening().$el.remove();
		}

	}, { template: "filterMenuStrip" });

	return FilterMenuStripView;

});