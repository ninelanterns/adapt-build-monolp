define([ "core/js/adapt" ], function(Adapt) {

	var FilterMenuDashboardView = Backbone.View.extend({

		className: "filter-menu-dashboard display-none",

		events: {
			"change input": "filter",
			"click .filter-menu-dashboard-close": "toggleDashboard"
		},

		initialize: function() {
			this.model.get("_dashboard")._globals = Adapt.course.get("_globals");
			this.renderNavigation();
			this.setUpTags();
			this.listenTo(Adapt, {
				"accessibility:toggle": this.render,
				"router:menu": this.onMenuRoute,
				"router:page": this.onPageRoute,
				"navigation:toggleFilterDashboard": this.toggleDashboard,
				"navigation:disableFilters": this.disableFilters,
				"filterMenu:filter": this.filter
			}).render();
		},

		render: function() {
			var template = Handlebars.templates.filterMenuDashboard;
			var data = this.model.get("_dashboard");

			$("body").append(this.$el.html(template(data)));
		},

		renderNavigation: function() {
			var template = Handlebars.templates.filterMenuDashboardNavigation;
			var data = this.model.get("_dashboard");

			$(".navigation-inner").prepend(template(data));
		},

		setUpTags: function() {
			var tagsMap = {};

			this.getMenuItems().each(function(item) {
				var tags = item.get("_tags");

				if (!tags) return;

				for (var i = 0, j = tags.length; i < j; i++) {
					var tag = tags[i];

					if (!tagsMap[tag]) tagsMap[tag] = [];

					tagsMap[tag].push(item);
				}
			});

			this.model.get("_dashboard")._tags._items = tagsMap;
		},

		onMenuRoute: function(model) {
			$(".filter-menu-dashboard-navigation")
				.toggleClass("display-none", !model.has("_filterMenu"));
		},

		onPageRoute: function() {
			this.$el.add(".filter-menu-dashboard-navigation").addClass("display-none");
			$(".filter-menu-dashboard-button").removeClass("selected");
		},

		toggleDashboard: function() {
			this.$el.toggleClass("display-none");
			$(".filter-menu-dashboard-button").toggleClass("selected");

			if (this.$el.hasClass("display-none")) return Adapt.trigger("popup:closed");

			Adapt.trigger("popup:opened", this.$el.a11y_focus());
			$("body").scrollEnable();
		},

		disableFilters: function() {
			this.$el.find("input").prop("checked", false);
			this.filter();
			$(".filter-menu-dashboard-navigation").next().a11y_focus();
		},

		filter: _.debounce(function() {
			var activeFilters = this.getActiveFilters();
			var activeTags = this.getActiveTags();
			var isFiltering = !_.isEmpty(activeFilters) || !_.isEmpty(activeTags);
			var shouldFilter = function(item) {
				var tags = item.get("_tags");

				for (var attribute in activeFilters) {
					if (activeFilters.hasOwnProperty(attribute) &&
						item.get(attribute) === activeFilters[attribute]) {
						return true;
					}
				}

				for (var i = 0, j = activeTags.length; i < j; i++) {
					if (!_.contains(tags, activeTags[i])) return true;
				}

				return false;
			};
			var shouldTriggerRender = false;

			$(".filter-menu-dashboard-navigation").toggleClass("filtered", isFiltering);

			this.getMenuItems().each(function(item) {
				var isFiltered = shouldFilter(item);

				if (item.get("_isFiltered") === isFiltered) return;
				
				item.set("_isFiltered", isFiltered);
				shouldTriggerRender = true;
			});

			if (!shouldTriggerRender) return;

			this.listenToOnce(Adapt, "filterMenu:ready", _.bind(function() {
				this.$el.a11y_only();
			}, this));

			Adapt.trigger("filterMenu:reRender");
		}, 250),

		getActiveFilters: function() {
			var filters = this.model.get("_dashboard")._filters._items;
			var $checkboxes = this.$(".dashboard-filters").find("input");
			var activeFilters = {};

			for (var i = 0, j = filters.length; i < j; i++) {
				if (!$checkboxes.eq(i).is(":checked")) continue;

				var filter = filters[i];

				activeFilters[filter._attribute] = filter._value || false;
			}

			return activeFilters;
		},

		getActiveTags: function() {
			var tags = this.model.get("_dashboard")._tags._items;
			var $checkboxes = this.$(".dashboard-tags").find("input");
			var activeTags = [];

			for (var tag in tags) {
				if (tags.hasOwnProperty(tag) &&
					$checkboxes.filter("[data-tag='" + tag + "']").is(":checked")) {
					activeTags.push(tag);
				}
			}

			return activeTags;
		},

		getMenuItems: function() {
			var strips = this.model.get("_strips");
			var menuItems = new Backbone.Collection();

			for (var i = 0, j = strips.length; i < j; i++) {
				menuItems.add(strips[i]._items);
			}

			return menuItems;
		}

	});

	return FilterMenuDashboardView;

});