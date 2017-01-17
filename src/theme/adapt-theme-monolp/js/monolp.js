define(function(require) {

	var Adapt = require('coreJS/adapt');
	var Backbone = require('backbone');
	var ThemeBlock = require('theme/adapt-theme-monolp/js/theme-block');

  var backgroundImages = [];

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


  // Menu view
  // =========
  Adapt.on('menuView:ready', function() {
      changeNavigation('.filter-menu-inner');
  });


  // Page view
  // =========
  Adapt.on('pageView:ready', function(view) {

      changeNavigation('.page-header');

      // Insert the header bg image
      var graphic = view.model.get('_graphic');
      var graphicPath = Adapt.device.screenSize === 'small' ? graphic.narrow : graphic.wide;

      view.$el.find('.page-header').css({
        backgroundImage: 'url('+ graphicPath +')'
      });

      // Insert bg images into blocks that have the image-background class
      view.$el.find('.image-background').each(function(i) {
        // We may deplete all of the images in the array, so lets replenish the pool when it empties
        if (backgroundImages.length < 1) buildBackgroundImageArray();

        // Get random number from current amount in the array
        var randomIndex = Math.floor(Math.random() * backgroundImages.length);
        var backgroundImage = backgroundImages[randomIndex];

        // Use narrow images for mobile
        if (Adapt.device.screenSize === 'small') {
          backgroundImage += '-narrow'
        }

        // Remove the item from the array
        backgroundImages.splice(randomIndex, 1);

        $(this).css({
          backgroundImage: 'url(adapt/css/assets/'+ backgroundImage +'.jpg)'
        });
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



  function buildBackgroundImageArray() {
    var poolSize = 5;

    for (var i = 0; i < poolSize; i++) {
      backgroundImages.push('image-background-'+ i);
    }
  }


});
