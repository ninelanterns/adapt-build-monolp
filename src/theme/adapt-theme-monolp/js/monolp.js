define(function(require) {

    var Adapt = require('coreJS/adapt');
    var Backbone = require('backbone');
    var ThemeBlock = require('theme/adapt-theme-monolp/js/theme-block');

    var backgroundImages = [];
    var menuSections = [];

    // Block View
    // ==========
    //
    Adapt.on('blockView:postRender', function(view) {
        var theme = view.model.get('_theme');

        if (theme) {
            new ThemeBlock({
                model: new Backbone.Model({_themeBlockConfig: theme}),
                el: view.$el
            });
        }
    });

    // Menu view
    // =========
    //
    Adapt.on('menuView:ready', function(view) {

        changeNavigation('.filter-menu-inner');

        // Check the config if this is an accordion layout
        var accordionLayout = Adapt.course.get('_globals')._menu._filterMenu.accordionLayout;

        if (accordionLayout) {

            var $menuStrip = $('.filter-menu-strip');

            $menuStrip.each(function(i) {
                // Check if user left this section open
                if (menuSections[i]) {
                    $menuStrip.eq(i).find('.filter-menu-items-bottom').show();
                }
                else {
                    // First visit, build the array
                    menuSections[i] = false;
                }
            });

            $menuStrip.on('click', function(e) {

                switch (e.target.className) {
                    case 'filter-menu-strip-top':
                    case 'filter-menu-strip-title':
                    case 'filter-menu-strip-icon':
                        // Slide the section open/close and update icon
                        var $thisStrip = $(this);
                        $thisStrip.find('.filter-menu-items-bottom').slideToggle();
                        $thisStrip.find('.filter-menu-strip-icon').toggleClass('icon-plus').toggleClass('icon-minus');

                        // Toggle section open/close and save to global var
                        var index = $menuStrip.index(this);
                        menuSections[index] = ! menuSections[index];
                        break;
                }
            });
        }
    });

    // Page view
    // =========
    //
    Adapt.on('pageView:ready', function(view) {

        changeNavigation('.page-header');

        // Insert the header bg image
        var graphic = view.model.get('_graphic');
        var graphicPath = Adapt.device.screenSize === 'small' ? graphic.narrow : graphic.wide;

        view.$el.find('.page-header').css({
            backgroundImage: 'url(' + graphicPath + ')'
        });

        // Insert bg images into blocks that have the image-background class
        view.$el.find('.image-background').each(function(i) {
            // We may deplete all of the images in the array, so lets replenish the pool when it empties
            if (backgroundImages.length < 1) buildBackgroundImageArray(12);

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
                backgroundImage: 'url(course/en/images/backgrounds/' + backgroundImage + '.jpg)'
            });
        });
    });

    /**
     * Add a class to the nav bar when we scroll past the image header
     */
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

    /**
     * Creates an array of image file names for random selection
     */
    function buildBackgroundImageArray(size) {

        for (var i = 0; i < size; i++) {
            backgroundImages.push('image-background-' + i);
        }
    }

});
