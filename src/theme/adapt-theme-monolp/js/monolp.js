define(function(require) {

	var Adapt = require('coreJS/adapt');
	var Backbone = require('backbone');
	var ThemeBlock = require('theme/adapt-contrib-vanilla/js/theme-block');

	// Block View
	// ==========

	Adapt.on('blockView:postRender', function(view) {
		var theme = view.model.get('_theme');

		if (theme) {
			new ThemeBlock({
				model: new Backbone.Model({
					_themeBlockConfig: theme
				}),
				el: view.$el
			});
		}
	});



    Adapt.once('menuView:ready', function() {
        changeNavigation('.filter-menu-inner');
    });

    Adapt.once('pageView:ready', function() {
        changeNavigation('.page-header');
    });

    function changeNavigation(selector) {

        var $window = $(window),
            $navigation = $('.navigation'),
            navigationHeight = $navigation.height(),
            $clear = $(selector),
            clearHeight = $clear.height();

        $window.on('scroll', function() {
            if ($window.scrollTop() > clearHeight - navigationHeight) {
                $navigation.addClass('navigation-opaque');
            }
            else {
                $navigation.removeClass('navigation-opaque');
            }
        });
    }
});
