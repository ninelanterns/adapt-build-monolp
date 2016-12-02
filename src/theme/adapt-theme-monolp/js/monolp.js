define(function(require) {

	var Adapt = require('coreJS/adapt');
	var Backbone = require('backbone');
	var ThemeBlock = require('theme/adapt-theme-monolp/js/theme-block');

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

    Adapt.once('pageView:ready', function(view) {
        changeNavigation('.page-header');

        // console.log(view);

        var _graphic = view.model.get('_graphic');

        view.$el.find('.page-header').css({
            backgroundImage: 'url('+ _graphic.large +')'
        });

        var backgroundLength = 5;
        var backgrounds = [];

        for (var i = 0; i < backgroundLength; i++) {
          backgrounds.push('image-background-'+ i);
        }

        view.$el.find('.image-background').each(function(i) {
            // Get random number from current amount in the array
            var random = Math.floor(Math.random() * backgrounds.length);
            var image = backgrounds[random];

            // Remove the item from the array
            backgrounds.splice(random, 1);

            $(this).css({
              backgroundImage: 'url(adapt/css/assets/'+ image +'.jpg)'
            });

            // TODO manage narrow images
            // 'url(assets/'+ image +'-narrow.jpg)'
        });
    });

    function changeNavigation(selector) {

        var $window = $(window);
        var $navigation = $('.navigation');
        var navigationHeight = $navigation.height();
        var $clear = $(selector);
        var clearHeight = $clear.height();

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
