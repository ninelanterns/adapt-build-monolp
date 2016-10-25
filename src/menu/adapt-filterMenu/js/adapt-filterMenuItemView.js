define([ "core/js/views/adaptView", "core/js/adapt" ], function(AdaptView, Adapt) {

	var FilterMenuItemView = AdaptView.extend({

		className: function() {
			var classes = "filter-menu-item";
			var modelClasses = this.model.get("_classes");

			if (modelClasses) classes += " " + modelClasses;
			if (this.model.get("_type") === "resource") classes += " resource";
			if (this.model.get("_isOptional")) classes += " optional";
			if (this.model.get("_isVisited") || this.isVisited()) classes += " visited";
			if (this.model.get("_isComplete")) classes += " completed";
			if (this.model.get("_isLocked")) classes += " locked";
			if (this.model.get("_isPinned")) classes += " pinned";

			return classes;
		},

		events: {
			"click .filter-menu-item-button": "onItemClick",
			"change input": "togglePin"
		},

		initialize: function() {
			this.listenTo(Adapt, "filterMenu:reRender", this.remove);

			AdaptView.prototype.initialize.call(this);
		},

		postRender: function() {
			this.setReadyStatus();
			this.trigger("ready");
		},

		isVisited: function() {
			var components = this.model.findDescendants("components");

			return components.findWhere("_isComplete", true);
		},

		onItemClick: function() {
			if (this.model.get("_isLocked")) return;

			if (this.model.get("_type") === "resource") this.openResource();
			else Adapt.navigateToElement(this.model.get("_id"));
		},

		togglePin: function() {
			var suspendData = Adapt.offlineStorage.get("filterMenu") || {};
			var id = this.model.get("_id");
			var isPinned = !this.model.get("_isPinned");

			this.model.set("_isPinned", isPinned);
			this.$el.toggleClass("pinned");
			Adapt.trigger("filterMenu:filter");

			if (!suspendData.pinned) suspendData.pinned = [];

			if (isPinned) suspendData.pinned.push(id);
			else suspendData.pinned = _.without(suspendData.pinned, id);

			Adapt.offlineStorage.set("filterMenu", suspendData);
		},

		openResource: function() {
			top.open(this.model.get("_url"));

			if (this.model.get("_isComplete")) return;

			this.setResourceCompletionStatus();
			Adapt.trigger("filterMenu:filter").trigger("filterMenu:updateProgress");
		},

		setResourceCompletionStatus: function() {
			var suspendData = Adapt.offlineStorage.get("filterMenu") || {};

			this.model.set("_isComplete", true);
			this.$el.addClass("completed");

			if (!suspendData.resources) suspendData.resources = [];

			suspendData.resources.push(this.model.get("_id"));
			Adapt.offlineStorage.set("filterMenu", suspendData);
		}

	}, { template: "filterMenuItem", type: "menu" });

	return FilterMenuItemView;

});