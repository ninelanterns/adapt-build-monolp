define('core/js/models/lockingModel',[
	'backbone'
], function() {

	var set = Backbone.Model.prototype.set;

	_.extend(Backbone.Model.prototype, {

		set: function(attrName, attrVal, options) {
			var stopProcessing = !this.lockedAttributes || typeof attrName === "object" || typeof attrVal !== "boolean" || !this.isLocking(attrName);
			if (stopProcessing) return set.apply(this, arguments);
			
			options = options || {};

			var isSettingValueForSpecificPlugin = options && options.pluginName;
			if (!isSettingValueForSpecificPlugin) {
				console.error("Must supply a pluginName to change a locked attribute");
				options.pluginName = "compatibility";
			}

			var pluginName  = options.pluginName;
			if (this.defaults[attrName] !== undefined) {
				this.lockedAttributes[attrName] = !this.defaults[attrName];
			}
			var lockingValue = this.lockedAttributes[attrName];
			var isAttemptingToLock = (lockingValue === attrVal);

			if (isAttemptingToLock) {

				this.setLockState(attrName, true, {pluginName:pluginName, skipcheck: true});

				//console.log(options.pluginName, "locking", attrName, "on", this.get("_id"));
				return set.call(this, attrName, lockingValue);

			}

			this.setLockState(attrName, false, {pluginName:pluginName, skipcheck: true});

			var totalLockValue = this.getLockCount(attrName, {skipcheck: true})
			//console.log(options.pluginName, "attempting to unlock", attrName, "on", this.get("_id"), "lockValue", totalLockValue, this._lockedAttributesValues[attrName]);
			if (totalLockValue === 0) {
				//console.log(options.pluginName, "unlocking", attrName, "on", this.get("_id"));
				return set.call(this, attrName, !lockingValue);
			}

			return this;

		},

		setLocking: function(attrName, defaultLockValue) {
			if (this.isLocking(attrName)) return;
			if (!this.lockedAttributes) this.lockedAttributes = {};
			this.lockedAttributes[attrName] = defaultLockValue;
		},

		unsetLocking: function(attrName) {
			if (!this.isLocking(attrName)) return;
			if (!this.lockedAttributes) return;
			delete this.lockedAttributes[attrName];
			delete this._lockedAttributesValues[attrName];
			if (_.keys(this.lockedAttributes).length === 0) {
				delete this.lockedAttributes;
				delete this._lockedAttributesValues;
			}
		},

		isLocking: function(attrName) {
			var isCheckingGeneralLockingState = (attrName === undefined);
			var isUsingLockedAttributes = (this.lockedAttributes !== undefined);

			if (isCheckingGeneralLockingState) {
				return isUsingLockedAttributes;
			}

			if (!isUsingLockedAttributes) return false;

			var isAttributeALockingAttribute = this.lockedAttributes[attrName] !== undefined;
			if (!isAttributeALockingAttribute) return false;

			if (this._lockedAttributesValues === undefined) {
				this._lockedAttributesValues = {};
			}

			if (this._lockedAttributesValues[attrName] === undefined) {
				this._lockedAttributesValues[attrName] = {};	
			}

			return true;
		},

		isLocked: function(attrName, options) {
			var shouldSkipCheck = (options && options.skipcheck);
			if (!shouldSkipCheck) { 
				var stopProcessing =  !this.isLocking(attrName);
				if (stopProcessing) return;
			}

			return this.getLockCount(attrName) > 0;
		},

		getLockCount: function(attrName, options) {
			var shouldSkipCheck = (options && options.skipcheck);
			if (!shouldSkipCheck) { 
				var stopProcessing =  !this.isLocking(attrName);
				if (stopProcessing) return;
			}

			var isGettingValueForSpecificPlugin = options && options.pluginName;
			if (isGettingValueForSpecificPlugin) {

				return this._lockedAttributesValues[attrName][options.pluginName] ? 1 : 0;
			}

			var lockingAttributeValues = _.values(this._lockedAttributesValues[attrName]);
			var lockingAttributeValuesSum = _.reduce(lockingAttributeValues, function(sum, value){ return sum + (value ? 1 : 0); }, 0);
			
			return lockingAttributeValuesSum;
		},

		setLockState: function(attrName, value, options) {
			var shouldSkipCheck = (options && options.skipcheck);
			if (!shouldSkipCheck) { 
				var stopProcessing =  !this.isLocking(attrName);
				if (stopProcessing) return this;
			}

			var isSettingValueForSpecificPlugin = options && options.pluginName;
			if (!isSettingValueForSpecificPlugin) {
				console.error("Must supply a pluginName to set a locked attribute lock value");
				options.pluginName = "compatibility";
			}

			if (value) {
				this._lockedAttributesValues[attrName][options.pluginName] = value;
			} else {
				delete this._lockedAttributesValues[attrName][options.pluginName];
			}

			return this;

		}

	});

});

define('core/js/helpers',[
    'handlebars'
], function(Handlebars){

    var helpers = {

        lowercase: function(text) {
            return text.toLowerCase();
        },
        
        capitalise:  function(text) {
            return text.charAt(0).toUpperCase() + text.slice(1);
        },

        inc: function(index) {
            return index+1;
        },

        dec: function(index) {
            return index-1;
        },

        odd: function (index) {
            return (index +1) % 2 === 0  ? 'even' : 'odd';
        },

        equals: function(value, text, block) {
            return helpers.compare.call(this, value, "==", text, block);
        },

        compare: function(value, operator, text, block) {
            // Comparison operators
            switch (operator) {
            case "===":
                if (value === text) return block.fn(this);
                break;
            case "=": case "==":
                if (value == text) return block.fn(this);
                break;
            case ">=":
                if (value >= text) return block.fn(this);
                break;
            case "<=":
                if (value <= text) return block.fn(this);
                break;
            case ">":
                if (value > text) return block.fn(this);
                break;
            case "<":
                if (value < text) return block.fn(this);
                break;
            }
            return block.inverse(this);
        },

        math: function(lvalue, operator, rvalue, options) {
            // Mathematical operators
            lvalue = parseFloat(lvalue);
            rvalue = parseFloat(rvalue);
            switch (operator) {
            case "+": return lvalue + rvalue;
            case "-": return lvalue - rvalue;
            case "*": return lvalue * rvalue;
            case "/": return lvalue / rvalue;
            case "%": return lvalue % rvalue;
            }
        },

        compile: function(template) {
            // Allow JSON to be a template
            return Handlebars.compile(template)(this);
        },

        compile_a11y_text: function(template) {
            // Allow JSON to be a template and accessible text
            return Handlebars.helpers.a11y_text.call(this, helpers.compile.call(this, template));
        },

        compile_a11y_normalize: function(template) {
            // Allow JSON to be a template and normalized text
            return Handlebars.helpers.a11y_normalize.call(this, helpers.compile.call(this, template));
        }

    };

    // Compatibility references
    helpers['if_value_equals'] = helpers['equals'];
    helpers['numbers'] = helpers['inc'];
    helpers['lowerCase'] = helpers['lowercase'];

    for (var name in helpers) {
        if (helpers.hasOwnProperty(name)) {
             Handlebars.registerHelper(name, helpers[name]);
        }
    }

    return helpers;

});

define('core/js/adapt',[
    'coreModels/lockingModel',
    'coreHelpers'
], function(lockingModel, Helpers) {

    var AdaptModel = Backbone.Model.extend({

        defaults: {
            _canScroll: true, //to stop scrollTo behaviour,
            _outstandingCompletionChecks: 0
        },

        lockedAttributes: {
            _canScroll: false
        },

        //call when entering an asynchronous completion check
        checkingCompletion: function() {
            var outstandingChecks = this.get("_outstandingCompletionChecks");
            this.set("_outstandingCompletionChecks", ++outstandingChecks);
        },

        //call when exiting an asynchronous completion check
        checkedCompletion: function() {
            var outstandingChecks = this.get("_outstandingCompletionChecks");
            this.set("_outstandingCompletionChecks", --outstandingChecks);
        },

        //wait until there are no outstanding completion checks
        deferUntilCompletionChecked: function(callback) {

            if (this.get("_outstandingCompletionChecks") === 0) return callback();

            var checkIfAnyChecksOutstanding = function(model, outstandingChecks) {
                if (outstandingChecks !== 0) return;

                Adapt.off("change:_outstandingCompletionChecks", checkIfAnyChecksOutstanding);

                callback();
            };

            Adapt.on("change:_outstandingCompletionChecks", checkIfAnyChecksOutstanding);

        }

    });

    var Adapt = new AdaptModel();

    Adapt.location = {};
    Adapt.componentStore = {};
    var mappedIds = {};

    Adapt.initialize = _.once(function() {

        //wait until no more completion checking 
        Adapt.deferUntilCompletionChecked(function() {

            //start adapt in a full restored state
            Adapt.trigger('adapt:start');
            Backbone.history.start();
            Adapt.trigger('adapt:initialize');

        });

    });

    Adapt.scrollTo = function(selector, settings) {
        // Get the current location - this is set in the router
        var location = (Adapt.location._contentType) ?
            Adapt.location._contentType : Adapt.location._currentLocation;
        // Trigger initial scrollTo event
        Adapt.trigger(location+':scrollTo', selector);
        //Setup duration variable passed upon arguments
        var settings = (settings || {});
        var disableScrollToAnimation = Adapt.config.has('_disableAnimation') ? Adapt.config.get('_disableAnimation') : false;
        if (disableScrollToAnimation) {
            settings.duration = 0;
        }
        else if (!settings.duration) {
            settings.duration = $.scrollTo.defaults.duration;
        }

        var navigationHeight = $(".navigation").outerHeight();

        if (!settings.offset) settings.offset = { top: -navigationHeight, left: 0 };
        if (settings.offset.top === undefined) settings.offset.top = -navigationHeight;
        if (settings.offset.left === undefined) settings.offset.left = 0;

        if (settings.offset.left === 0) settings.axis = "y";

        if (Adapt.get("_canScroll") !== false) {
        // Trigger scrollTo plugin
        $.scrollTo(selector, settings);
        }

        // Trigger an event after animation
        // 300 milliseconds added to make sure queue has finished
        _.delay(function() {
            $(selector).a11y_focus();
            Adapt.trigger(location+':scrolledTo', selector);
        }, settings.duration+300);

    }

    Adapt.navigateToElement = function(selector, settings) {
        // Allows a selector to be passed in and Adapt will navigate to this element

        // Setup settings object
        var settings = (settings || {});

        // Removes . symbol from the selector to find the model
        var currentModelId = selector.replace(/\./g, '');
        var currentModel = Adapt.findById(currentModelId);
        // Get current page to check whether this is the current page
        var currentPage = (currentModel._siblings === 'contentObjects') ? currentModel : currentModel.findAncestor('contentObjects');

        // If current page - scrollTo element
        if (currentPage.get('_id') === Adapt.location._currentId) {
           return Adapt.scrollTo(selector, settings);
        }

        // If the element is on another page navigate and wait until pageView:ready is fired
        // Then scrollTo element
        Adapt.once('pageView:ready', function() {
            _.defer(function() {
                Adapt.scrollTo(selector, settings)
            })
        });

        var shouldReplaceRoute = settings.replace || false;

        Backbone.history.navigate('#/id/' + currentPage.get('_id'), {trigger: true, replace: shouldReplaceRoute});
    }

    Adapt.register = function(name, object) {
        // Used to register components
        // Store the component view
        if (Adapt.componentStore[name])
            throw Error('This component already exists in your project');

        if (object.view) {
            //use view+model object
            if(!object.view.template) object.view.template = name;
        } else {
            //use view object
            if(!object.template) object.template = name;
        }
        
        Adapt.componentStore[name] = object;

        return object;
    }

    // Used to map ids to collections
    Adapt.setupMapping = function() {

        // Setup course Id
        mappedIds[Adapt.course.get('_id')] = "course";

        // Setup each collection
        var collections = ["contentObjects", "articles", "blocks", "components"];

        for (var i = 0, len = collections.length; i < len; i++) {
            var collection = collections[i];
            var models = Adapt[collection].models;
            for (var j = 0, lenj = models.length; j < lenj; j++) {
                var model = models[j];
                mappedIds[model.get('_id')] = collection;

            }
        }

    }

    Adapt.resetMapping = function () {
        mappedIds = {};
    }

    Adapt.mapById = function(id) {
        // Returns collection name that contains this models Id
        return mappedIds[id];
    }

    Adapt.findById = function(id) {

        // Return a model
        // Checks if the Id passed in is the course Id
        if (id === Adapt.course.get('_id')) {
            return Adapt.course;
        }

        var collectionType = Adapt.mapById(id);

        if (!collectionType) {
            console.warn('Adapt.findById() unable to find collection type for id: ' + id);
            return;
        }

        return Adapt[collectionType]._byAdaptID[id][0];

    }

    return Adapt;

});

define('core/js/views/accessibilityView',['require','backbone','coreJS/adapt'],function(require) {

    var Backbone = require('backbone');
    var Adapt = require('coreJS/adapt');

    var AccessibilityView = Backbone.View.extend({

        el: '#accessibility-toggle',

        initialize: function() {
            this.render();
        },

        events: {
            'click' : 'toggleAccessibility'
        },

        render: function() {
            var hasAccessibility = Adapt.config.has('_accessibility')
                && Adapt.config.get('_accessibility')._isEnabled;

            if (!hasAccessibility) {
                return;
            } else {
                var isActive = Adapt.config.get('_accessibility')._isActive;
                var offLabel = Adapt.course.get('_globals') && (Adapt.course.get('_globals')._accessibility.accessibilityToggleTextOff || Adapt.course.get('_globals')._accessibility._accessibilityToggleTextOff);
                var onLabel = Adapt.course.get('_globals') && (Adapt.course.get('_globals')._accessibility.accessibilityToggleTextOn || Adapt.course.get('_globals')._accessibility._accessibilityToggleTextOn);

                var toggleText = isActive ? offLabel : onLabel;

                this.$el.html(toggleText).attr('aria-label', Adapt.course.get("title") + ". "
                    + Adapt.course.get('_globals')._accessibility._ariaLabels.accessibilityToggleButton + ". "
                    + $.a11y_normalize(toggleText));
            }
        },

        toggleAccessibility: function(event) {
            event.preventDefault();

            var hasAccessibility = Adapt.config.get('_accessibility')._isActive;

            var toggleAccessibility = (hasAccessibility) ? false : true;

            Adapt.config.get('_accessibility')._isActive = toggleAccessibility;

            Adapt.trigger('accessibility:toggle');

            this.render();
            
            Backbone.history.navigate(window.location.hash || "#/", {trigger: true});
        }

    });

    return AccessibilityView;

});

define('core/js/accessibility',['require','coreJS/adapt','a11y','coreViews/accessibilityView'],function(require) {

    var Adapt = require('coreJS/adapt');
    var a11y = require('a11y');
    var AccessibilityView = require('coreViews/accessibilityView');

    var Accessibility = _.extend({
        $html: $('html'),
        $accessibilityInstructions: $("#accessibility-instructions"),
        $accessibilityToggle: $("#accessibility-toggle"),

        _tabIndexElements: 'a, button, input, select, textarea, [tabindex]',
        _isButtonRedirectionOn: true,
        _hasUserTabbed: false,
        _hasUsageInstructionRead: false,
        _isLoaded: false,
        _hasCourseLoaded: false,
        _legacyFocusElements: undefined,

        reset: function() {
            _.extend(this, {
                _isButtonRedirectionOn: true,
                _hasUserTabbed: false,
                _hasUsageInstructionRead: false
            });
        },

        initialize: function() {
            //RUN ONCE
            if (this._isLoaded) return;

            //TRIGGER SETUP ON DATA LOADED AND TOGGLE BUTTON
            Adapt.once('app:dataLoaded', function() {
                //check if accessibility mode should be restored
                this._hasCourseLoaded = true;
                Adapt.config.get("_accessibility")._isActive = Adapt.offlineStorage.get("a11y") || false;
                this.setupAccessibility();
                
            }, Accessibility);

            Adapt.on('accessibility:toggle', this.setupAccessibility, Accessibility);

            //SETUP RENDERING HELPERS
            Adapt.once('app:dataLoaded', this.setupHelpers, Accessibility);
            Adapt.once('app:dataLoaded', this.touchDeviceCheck, Accessibility);

            //SETUP NEW VIEW FOR TOGGLE BUTTON
            Adapt.once('app:dataReady', this.setupToggleButton, this);

            //SETUP NO SELECT PARAMETERS ON DEVICE CHANGE
            Adapt.on("device:changed", this.setupNoSelect);

            //Configure the accessibility library
            this.listenToOnce(Adapt, "app:dataReady", this.configureA11yLibrary)

            //CAPTURE ROUTING/NEW DOCUMENT LOADING START AND END
            this.listenTo(Adapt, 'router:location', this.onNavigationStart);
            this.listenTo(Adapt, 'pageView:ready menuView:ready router:plugin', this.onNavigationEnd);
        },

        setupAccessibility: function() {
            //CALLED ON BUTTON CLICK AND ON DATA LOAD
            if (!this.isEnabled()) return;

            if (this._hasCourseLoaded && !Modernizr.touch) {
                //save accessibility state
                Adapt.offlineStorage.set("a11y", Adapt.config.get("_accessibility")._isActive);
            }

            this.reset();

            this.checkTabCapture();

            this.configureA11yLibrary();
			
            this.touchDeviceCheck();
			
            // Check if accessibility is active
            if (this.isActive()) {

                this.setupDocument();
                this.setupLegacy();
                this.setupPopupListeners()
                this.setupUsageInstructions();
                this.setupLogging();

            } else {

                this.revertDocument();
                this.revertLegacy();
                this.revertPopupListeners();
                this.revertUsageInstructions();
                this.revertLogging();

            }

        },

        setupHelpers: function() {

            //MAKE $.a11y_text and $.a11y_normalize IN GLOBAL HANDLEBARS HELPERS a11y_text and a11y_normalize
            var config = Adapt.config.has('_accessibility')
                ? Adapt.config.get("_accessibility")
                : false;

            Handlebars.registerHelper('a11y_text', function(text) {
                //ALLOW ENABLE/DISABLE OF a11y_text HELPER
                if (config && config._isTextProcessorEnabled === false) {
                    return text;
                } else {
                    return $.a11y_text(text);
                }
            });

            Handlebars.registerHelper('a11y_normalize', function(text) {
                return $.a11y_normalize(text);
            });

            Handlebars.registerHelper('a11y_aria_label', function(text) {
                return '<div class="aria-label prevent-default" tabindex="0" role="region">'+text+'</div>';
            });

            Handlebars.registerHelper('a11y_aria_label_relative', function(text) {
                return '<div class="aria-label relative prevent-default" tabindex="0" role="region">'+text+'</div>';
            });

            Handlebars.registerHelper('a11y_wrap_focus', function(text) {
                return '<a id="a11y-focusguard" class="a11y-ignore a11y-ignore-focus" tabindex="0" role="button">&nbsp;</a>';
            });

            Handlebars.registerHelper('a11y_attrs_heading', function(level) {
                return ' role="heading" aria-level="'+level+'" tabindex="0" ';
            });

            Handlebars.registerHelper('a11y_attrs_tabbable', function() {
                return ' role="region" tabindex="0" ';
            });

        },

        setupToggleButton: function() {
            if (this.isEnabled()) {
                new AccessibilityView();
            } else {
                this.$accessibilityToggle.addClass("a11y-ignore").a11y_cntrl_enabled(false);
            }
        },

        setupNoSelect: function() {
            if (!Adapt.config.get('_accessibility') || !Adapt.config.get('_accessibility')._disableTextSelectOnClasses) return;

            var classes = Adapt.config.get('_accessibility')._disableTextSelectOnClasses.split(" ");

            var isMatch = false;
            for (var i = 0, item; item = classes[i++];) {
                if ($('html').is(item)) {
                    isMatch = true;
                    break;
                }
            }

            if (isMatch) {
                $('html').addClass("no-select");
            } else  {
                $('html').removeClass("no-select");
            }

        },

        configureA11yLibrary: function() {

            var topOffset = $('.navigation').height();
            var bottomoffset = 0;
            $.a11y.options.focusOffsetTop = topOffset;
            $.a11y.options.focusOffsetBottom = bottomoffset;
            $.a11y.options.OS = Adapt.device.OS.toLowerCase();
            $.a11y.options.isTouchDevice = Modernizr.touch;

            if (this.isActive()) {
                _.extend($.a11y.options, {
                    isTabbableTextEnabled: true,
                    isUserInputControlEnabled: true,
                    isFocusControlEnabled: true,
                    isFocusLimited: true,
                    isRemoveNotAccessiblesEnabled: true,
                    isAriaLabelFixEnabled: true,
                    isFocusWrapEnabled: true,
                    isScrollDisableEnabled: true,
                    isScrollDisabledOnPopupEnabled: false,
                    isSelectedAlertsEnabled: true,
                    isAlertsEnabled: true
                });
            } else {
                _.extend($.a11y.options, {
                    isTabbableTextEnabled: false,
                    isUserInputControlEnabled: true,
                    isFocusControlEnabled: true,
                    isFocusLimited: false,
                    isRemoveNotAccessiblesEnabled: true,
                    isAriaLabelFixEnabled: true,
                    isFocusWrapEnabled: true,
                    isScrollDisableEnabled: true,
                    isScrollDisabledOnPopupEnabled: false,
                    isSelectedAlertsEnabled: false,
                    isAlertsEnabled: false
                });
            }

            this.setupNoSelect();

            $.a11y.ready();

            if (!this.isEnabled()) return;

            //CAPTURE TAB PRESSES TO DIVERT
            $('body').off('keyup', this.onKeyUp);
            $('body').on('keyup', this.onKeyUp);
        },

        onNavigationStart: function() {
            this._isLoaded = false;
            this._hasUserTabbed = false;
            //STOP DOCUMENT READING, MOVE FOCUS TO APPROPRIATE LOCATION
            $("#a11y-focuser").a11y_focus(true);
            _.defer(function() {
                $.a11y_on(false, '.page');
                $.a11y_on(false, '.menu');
            });
        },

        onNavigationEnd: function(view) {
            //prevent sub-menu items provoking behaviour
            if (view && view.model) {
                if (view.model.get("_id") != Adapt.location._currentId) return;
            }

            //always use detached aria labels for divs and spans
            _.defer(function() {
                $('body').a11y_aria_label(true);
            });

            this._isLoaded = true;

            $.a11y_on(false, '.page');
            $.a11y_on(false, '.menu');

            this.configureA11yLibrary();
            $.a11y_update();
            this.setNavigationBar();

            //MAKE FOCUS RIGHT
            this._isButtonRedirectionOn = true;
            _.delay(_.bind(function() {
                this.focusInitial();
            }, this), 500);

        },

        setNavigationBar: function() {
            if (this.isActive()) {
                $(".navigation .aria-label").attr("tabindex", 0).removeAttr("aria-hidden").removeClass("a11y-ignore");
            } else {
                $(".navigation .aria-label").attr("tabindex", -1).attr("aria-hidden", "true");
            }
        },

        touchDeviceCheck: function() {
            //SCREEN READER DON@T USE TABBING
            //FORCE ACCESSIBILITY ON TO RENDER NECESSARY STUFFS FOR TOUCH DEVICE SCREENREADERS
            if (!this.isEnabled()) return;

            if (Modernizr.touch) {
                 //Remove button
                this.$accessibilityToggle.remove();
            }

            if (!Modernizr.touch || this.isActive()) return;

            //If a touch device and not enabled, remove accessibility button and turn on accessibility

            this._isLoaded = true;

            //Force accessibility on
            Adapt.config.get('_accessibility')._isEnabled = true;
            Adapt.config.get('_accessibility')._isActive = true;

            Adapt.trigger('accessibility:toggle', true);

        },

        checkTabCapture: function() {
            if (!this._isLoaded) return;

            var isActive = this.isActive();

            $.a11y(isActive);

            //IF ACCESSIBILTY TURNED ON QUIT
            if (isActive) return;

            //OTHERWISE ENABLE TAB REDIRECTION TO TOGGLE BUTTON
            this._isButtonRedirectionOn = true;
        },

        isActive: function() {
            return Adapt.config.has('_accessibility')
                && Adapt.config.get('_accessibility')._isEnabled
                && Adapt.config.get('_accessibility')._isActive;
        },

        isEnabled: function() {
            return Adapt.config.has('_accessibility')
                && Adapt.config.get('_accessibility')._isEnabled
        },

        setupDocument: function() {
            this.$html.addClass('accessibility');
            $.a11y(true)
            $.a11y_on(true, "body > *");
        },

        setupLegacy: function() {
            //IE8 .focused CLASS AS :focus ISN'T AVAILABLE

            if(!this.$html.hasClass('ie8') || !Adapt.config.get('_accessibility')._shouldSupportLegacyBrowsers) return;

            // If legacy enabled run setupLegacyListeners()
            this.listenTo(Adapt, 'pageView:ready menuView:ready', this.setupLegacyFocusClasser);
            this.listenTo(Adapt, 'remove', this.removeLegacyFocusClasser);

        },

        setupLegacyFocusClasser: function() {
            this.removeLegacyFocusClasser();

            // On focus add class of focused, on blur remove class
            this._legacyFocusElements = $(this._tabIndexElements);
            this._legacyFocusElements
                .on('focus', this.onElementFocused)
                .on('blur', this.onElementBlurred);
        },

        setupPopupListeners: function() {
            this.listenTo(Adapt, 'popup:opened popup:closed', this.onPop);
        },


        setupUsageInstructions: function() {
            if (!Adapt.course.get("_globals")._accessibility || !Adapt.course.get("_globals")._accessibility._accessibilityInstructions) {
                this.$accessibilityInstructions.remove();
                return;
            }

            var instructionsList = Adapt.course.get("_globals")._accessibility._accessibilityInstructions;

            var usageInstructions;
            if (instructionsList[Adapt.device.browser]) {
                usageInstructions = instructionsList[Adapt.device.browser];
            } else if (Modernizr.touch) {
                usageInstructions = instructionsList.touch || "";
            } else {
                usageInstructions = instructionsList.notouch || "";
            }

           this.$accessibilityInstructions.html( usageInstructions );
        },

        setupLogging: function() {
            if (!Adapt.config.get("_accessibility") || !Adapt.config.get("_accessibility")._logReading) return;

            $(document).on("reading", this.onRead);
        },



        revertDocument: function() {
            this.$html.removeClass('accessibility');
            $.a11y(false)
            $.a11y_on(false, "body > *");
            $.a11y_on(true, "#accessibility-toggle");
        },

        revertLegacy: function() {

            if(!this.$html.hasClass('ie8') || !Adapt.config.get('_accessibility')._shouldSupportLegacyBrowsers) return;

            this.stopListening(Adapt, 'pageView:ready menuView:ready', this.setupLegacyFocusClasser);
            this.stopListening(Adapt, 'remove', this.removeLegacyFocusClasser);

        },

        removeLegacyFocusClasser: function() {
            if (this._legacyFocusElements === undefined) return;

            //Remove focus and blur events
            this._legacyFocusElements
                .off('focus', this.onElementFocused)
                .off('blur', this.onElementBlurred);
            this._legacyFocusElements = undefined;
        },


        revertPopupListeners: function() {
            this.stopListening(Adapt, 'popup:opened popup:closed', this.onPop);
        },

        revertUsageInstructions: function() {
            if (Adapt.course.has("_globals") && (!Adapt.course.get("_globals")._accessibility || !Adapt.course.get("_globals")._accessibility._accessibilityInstructions)) return;

            this.$accessibilityInstructions
                .off("blur", this.onFocusInstructions)
        },

        revertLogging: function() {
            if (Adapt.course.has("_globals") && (!Adapt.course.get("_globals")._accessibility || !Adapt.course.get("_globals")._accessibility._logReading)) return;

            $($.a11y).off("reading", this.onRead);
        },


        focusInitial: function() {
            if (!this.isActive()) return;

            this._isButtonRedirectionOn = false;

            var debouncedInitial = _.debounce(_.bind(function() {
                //ENABLED DOCUMENT READING

                if (!this._hasUsageInstructionRead) {

                    this._hasUsageInstructionRead = true;

                    $.a11y_on(true, '.page');
                    $.a11y_on(true, '.menu');

                    if (this._hasUserTabbed) return;
	
                    this.$accessibilityInstructions.one("blur", this.onFocusInstructions)
	
                    _.delay(function(){
                        Accessibility.$accessibilityInstructions.focusNoScroll();
                    }, 250);

                } else {

                    if (Adapt.location._currentId && $.a11y.options.OS!="mac") {
                        //required to stop JAWS from auto reading content in IE
                        var currentModel = Adapt.findById(Adapt.location._currentId);
                        var alertText = " ";

                        switch (currentModel.get("_type")) {
                            case "page":
                            if (Adapt.course.get("_globals") && Adapt.course.get("_globals")._accessibility && Adapt.course.get("_globals")._accessibility._ariaLabels && Adapt.course.get("_globals")._accessibility._ariaLabels.pageLoaded) {
                                    alertText = Adapt.course.get("_globals")._accessibility._ariaLabels.pageLoaded;
                                }
                                break;

                            case "menu":
                            default:
                            if (Adapt.course.get("_globals") && Adapt.course.get("_globals")._accessibility && Adapt.course.get("_globals")._accessibility._ariaLabels && Adapt.course.get("_globals")._accessibility._ariaLabels.menuLoaded) {
                                    alertText = Adapt.course.get("_globals")._accessibility._ariaLabels.menuLoaded;
                                }
                                break;
                        }

                        $.a11y_alert(alertText);
                    }

                     _.delay(_.bind(function() {
                        var windowScrollTop = $(window).scrollTop();
                        var documentScrollTop = $(document).scrollTop();

                        $.a11y_on(true, '.page');
                        $.a11y_on(true, '.menu');

                        //prevent auto scrolling to top when scroll has been initiated
                        if (windowScrollTop > 0 || documentScrollTop > 0 || this._hasUserTabbed) return;

                        _.delay(function(){
                        $.a11y_focus();
                        }, 500);

                    }, this), 500);

                }

            }, this), 100);
            debouncedInitial();

        },

        onElementFocused: function(event) {
             $(this).addClass('focused');
        },

        onElementBlurred: function(event) {
            $(this).removeClass('focused');
        },

        onRead: function(event, text) {
            //OUTPUT READ TEXT TO CONSOLE
            console.log("READING: " + text);
        },

        onPop: function() {
            //MAKE SURE POPUP IS CONFIGURED CORRECTLY WITH ARIA LABELS, TABINDEXES ETC
            if (this.isActive()) {
                $.a11y_update();
            }
        },

        onKeyUp: function(event) {

            //IF NOT TAB KEY, RETURN
            if (event.which !== 9) return;

            //DO NOT REDIRECT IF USER HAS ALREADY INTERACTED
            if ($.a11y.userInteracted) return;
            Accessibility._hasUserTabbed = true;

            //IF INITIAL TAB NOT CAPTURED AND ACCESSIBILITY NOT ON, RETURN
            if (Accessibility.isActive() && !Accessibility._isButtonRedirectionOn) return;

            //IF TAB PRESSED, AND TAB REDIRECTION ON, ALWAYS TAB TO ACCESSIBILITY BUTTON ONLY
            Accessibility.$accessibilityToggle.focus();

        },

        onFocusInstructions: function(event) {
            //HIDE INSTRUCTIONS FROM TAB WRAP AROUND AFTER LEAVING INSTRUCTIONS
            if (Accessibility._isButtonRedirectionOn) return;
            if (!Accessibility._isLoaded) return;
            Accessibility.$accessibilityInstructions
                .addClass("a11y-ignore-focus")
                .off("blur", Accessibility.onFocusInstructions);
        }

    }, Backbone.Events);


    Accessibility.initialize();

    return Accessibility;

});

define('core/js/adaptCollection',['require','backbone','coreJS/adapt'],function(require) {

    var Backbone = require('backbone');
    var Adapt = require('coreJS/adapt');

    var AdaptCollection = Backbone.Collection.extend({
        initialize : function(models, options){
            this.url = options.url;

            this.once('reset', this.loadedData, this);
            if (this.url) {
                this.fetch({
                    reset:true,
                    error: _.bind(function(model, xhr, options) {
                        console.error("ERROR: unable to load file " + this.url);
                    }, this)
                });
            }
        },

        loadedData: function() {
            Adapt.trigger('adaptCollection:dataLoaded');
        }

    });

    return AdaptCollection;

});

define('core/js/device',['require','coreJS/adapt','coreJS/libraries/bowser'],function(require) {

    var Adapt = require('coreJS/adapt');
    var Bowser = require('coreJS/libraries/bowser');
    var $window = $(window);

    Adapt.device = {
        touch: Modernizr.touch,
        screenWidth: getScreenWidth()
    };

    Adapt.once('app:dataReady', function() {
        Adapt.device.screenSize = checkScreenSize();

        $('html').addClass("size-" + Adapt.device.screenSize);

        // As Adapt.config is available it's ok to bind the 'resize'.
        $window.on('resize', onWindowResize);
    });

    /**
     * Compares the calculated screen width to the breakpoints defined in config.json.
     * 
     * @returns {string} 'large', 'medium' or 'small'
     */
    function checkScreenSize() {
        var screenSizeConfig = Adapt.config.get('screenSize');
        var screenSize;

        if (Adapt.device.screenWidth > screenSizeConfig.medium) {
            screenSize = 'large';
        } else if (Adapt.device.screenWidth > screenSizeConfig.small) {
            screenSize = 'medium';
        } else {
            screenSize = 'small';
        }

        return screenSize;
    }

    function getScreenWidth() {
        return isAppleDevice()
            ? getAppleScreenWidth()
            : window.innerWidth || $window.width();
    }

    var onWindowResize = _.debounce(function onScreenSizeChanged() {
        // Calculate the screen width.
        Adapt.device.screenWidth = getScreenWidth();

        var newScreenSize = checkScreenSize();

        if (newScreenSize !== Adapt.device.screenSize) {
            Adapt.device.screenSize = newScreenSize;

            $('html').removeClass("size-small size-medium size-large").addClass("size-" + Adapt.device.screenSize);

            Adapt.trigger('device:changed', Adapt.device.screenSize);
        }

	    Adapt.trigger('device:resize', Adapt.device.screenWidth);

    }, 100);

    var browser = Bowser.name;
    var version = Bowser.version;
    var OS = Bowser.osversion;

    // Bowser only checks against navigator.userAgent so if the OS is undefined, do a check on the navigator.platform
    if (OS == undefined) OS = getPlatform();

    function isAppleDevice() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    function getAppleScreenWidth() {
        return (Math.abs(window.orientation) === 90) ? screen.height : screen.width;
    }

    function getPlatform() {

        var platform = navigator.platform;

        if (platform.indexOf("Win") != -1) {
            return "Windows";
        } else if (platform.indexOf("Mac") != -1) {
            return "Mac";
        } else if (platform.indexOf("Linux") != -1) {
            return "Linux";
        }

        return "PlatformUnknown";
    }

    function pixelDensity() {
        var fltPixelDensity = ( window.devicePixelRatio || 1 );

        if( fltPixelDensity >= 3 ) {
            return 'ultra-high';
        } else if( fltPixelDensity >= 2 ) {
            return 'high';
        } else if( fltPixelDensity >= 1.5 ) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    var browserString = browser + " version-" + version + " OS-" + OS;
	/* MAKE DEVICE IDENTIFICATION UNIFORM CASE */
    Adapt.device.browser = browser ? browser.toLowerCase() : "";
    Adapt.device.version = version ? version.toLowerCase() : "";
    Adapt.device.OS = OS ? OS.toLowerCase() : "";
    browserString = browserString.replace("Internet Explorer", "ie");

    $("html").addClass(browserString + ' pixel-density-' + pixelDensity());

});

define('core/js/views/drawerView',['require','backbone','coreJS/adapt'],function(require) {

    var Backbone = require('backbone');
    var Adapt = require('coreJS/adapt');

    var DrawerView = Backbone.View.extend({

        className: 'drawer display-none',
        disableAnimation: false,
        escapeKeyAttached: false,

        initialize: function() {
            this.disableAnimation = Adapt.config.has('_disableAnimation') ? Adapt.config.get('_disableAnimation') : false;
            this._isVisible = false;
            this.drawerDir = 'right';
            if(Adapt.config.get('_defaultDirection')=='rtl'){//on RTL drawer on the left
                this.drawerDir = 'left';
            }
            this.setupEventListeners();
            this.render();
            this.drawerDuration = Adapt.config.get('_drawer')._duration;
            this.drawerDuration = (this.drawerDuration) ? this.drawerDuration : 400;
            // Setup cached selectors
            this.$wrapper = $('#wrapper');
        },

        setupEventListeners: function() {
            this.listenTo(Adapt, 'navigation:toggleDrawer', this.toggleDrawer);
            this.listenTo(Adapt, 'drawer:triggerCustomView', this.openCustomView);
            this.listenToOnce(Adapt, 'adapt:initialize', this.checkIfDrawerIsAvailable);
            this.listenTo(Adapt, 'drawer:closeDrawer', this.onCloseDrawer);
            this.listenTo(Adapt, 'remove', this.onCloseDrawer);
            this.listenTo(Adapt, 'accessibility:toggle', this.onAccessibilityToggle);
            this._onKeyUp = _.bind(this.onKeyUp, this);
            this.setupEscapeKey();
        },

        setupEscapeKey: function() {
            var hasAccessibility = Adapt.config.has('_accessibility') && Adapt.config.get('_accessibility')._isActive;

            if (!hasAccessibility && ! this.escapeKeyAttached) {
                $(window).on("keyup", this._onKeyUp);
                this.escapeKeyAttached = true;
            } else {
                $(window).off("keyup", this._onKeyUp);
                this.escapeKeyAttached = false;
            }
        },

        onAccessibilityToggle: function() {
            this.setupEscapeKey();
        },

        onKeyUp: function(event) {
            if (event.which != 27) return;
            event.preventDefault();

            this.onCloseDrawer();
        },

        events: {
            'click .drawer-back': 'onBackButtonClicked',
            'click .drawer-close':'onCloseDrawer'
        },

        render: function() {
            var template = Handlebars.templates['drawer']
            $(this.el).html(template({_globals: Adapt.course.get("_globals")})).prependTo('body');
            var shadowTemplate = Handlebars.templates['shadow'];
            $(shadowTemplate()).prependTo('body');
            // Set defer on post render
            _.defer(_.bind(function() {
                this.postRender();
            }, this));
            return this;
        },

        // Set tabindex for select elements
        postRender: function() {
            this.$('a, button, input, select, textarea').attr('tabindex', -1);
        },

        openCustomView: function(view, hasBackButton) {
            // Set whether back button should display
            this._hasBackButton = hasBackButton;
            this._isCustomViewVisible = true;
            Adapt.trigger('drawer:empty');
            this.showDrawer();
            this.$('.drawer-holder').html(view);
        },

        checkIfDrawerIsAvailable: function() {
            if(this.collection.length == 0) {
                $('.navigation-drawer-toggle-button').addClass('display-none');
                Adapt.trigger('drawer:noItems');
            }
        },

        onBackButtonClicked: function(event) {
            event.preventDefault();
            this.showDrawer(true);
        },

        onCloseDrawer: function(event) {
            if (event) {
                event.preventDefault();
            }
            this.hideDrawer();
        },

        toggleDrawer: function() {
            if (this._isVisible && this._isCustomViewVisible === false) {
                this.hideDrawer();
            } else {
                this.showDrawer(true);
            }
        },

        showDrawer: function(emptyDrawer) {
            this.$el.removeClass('display-none');
            //only trigger popup:opened if drawer is visible, pass popup manager drawer element
            if (!this._isVisible) {
                Adapt.trigger('popup:opened', this.$el);
                $('body').scrollDisable();
                this._isVisible = true;
            }

            var drawerWidth = this.$el.width();
            // Sets tab index to 0 for all tabbable elements in Drawer
            this.$('a, button, input, select, textarea').attr('tabindex', 0);

            if (emptyDrawer) {
                this.$('.drawer-back').addClass('display-none');
                this._isCustomViewVisible = false;
                this.emptyDrawer();
                if(this.collection.models.length === 1) {
                    Adapt.trigger(this.collection.models[0].get('eventCallback'));
                } else {
                    this.renderItems();
                    Adapt.trigger('drawer:openedItemView');
                }
            } else {
                if (this._hasBackButton && this.collection.models.length > 1) {
                    this.$('.drawer-back').removeClass('display-none');
                } else {
                    this.$('.drawer-back').addClass('display-none');
                }
                Adapt.trigger('drawer:openedCustomView');
            }

            //delay drawer animation until after background fadeout animation is complete
            if (this.disableAnimation) {
                $('#shadow').removeClass("display-none");

                var direction={};
                direction[this.drawerDir]=0;
                this.$el.css(direction);
                complete.call(this);
                
            } else {

                $('#shadow').velocity({opacity:1},{duration:this.drawerDuration, begin: _.bind(function() {
                    $("#shadow").removeClass("display-none");
                    complete.call(this);
                }, this)});

                var showEasingAnimation = Adapt.config.get('_drawer')._showEasing;
                var easing = (showEasingAnimation) ? showEasingAnimation : 'easeOutQuart';
                var direction={};
                direction[this.drawerDir]=0;
                this.$el.velocity(direction, this.drawerDuration, easing);

            }

            function complete() {
                this.addShadowEvent();
                Adapt.trigger('drawer:opened');
                
                //focus on first tabbable element in drawer
                this.$el.a11y_focus();
			}

        },

        emptyDrawer: function() {
            this.$('.drawer-holder').empty();
        },

        renderItems: function() {
            Adapt.trigger('drawer:empty');
            this.emptyDrawer();
            var models = this.collection.models;
            for (var i = 0, len = models.length; i < len; i++) {
                var item = models[i];
                new DrawerItemView({model: item});
            }
        },

        hideDrawer: function() {
            //only trigger popup:closed if drawer is visible
            if (this._isVisible) {
                Adapt.trigger('popup:closed');
                this._isVisible = false;
                $('body').scrollEnable();
            } else {
                return;
            }

            if (this.disableAnimation) {

                var direction={};
                direction[this.drawerDir]=-this.$el.width();
                this.$el.css(direction).addClass('display-none');

                $('#shadow').addClass("display-none");

                Adapt.trigger('drawer:closed');

            } else {

                var showEasingAnimation = Adapt.config.get('_drawer')._hideEasing;
                var easing = (showEasingAnimation) ? showEasingAnimation : 'easeOutQuart';

                var direction={};
                direction[this.drawerDir]=-this.$el.width();
                this.$el.velocity(direction, this.drawerDuration, easing, _.bind(function() {
                    this.$el.addClass('display-none');
                    Adapt.trigger('drawer:closed');
                }, this));

                $('#shadow').velocity({opacity:0}, {duration:this.drawerDuration, complete:function() {
                    $('#shadow').addClass("display-none");
                }});

            }

            this._isCustomViewVisible = false;
            this.removeShadowEvent();


        },

        addShadowEvent: function() {
            $('#shadow').one('click touchstart', _.bind(function() {
                this.onCloseDrawer();
            }, this));
        },

        removeShadowEvent: function() {
            $('#shadow').off('click touchstart');
        },

        remove: function() {
            Backbone.View.prototype.remove.apply(this, arguments);
            $(window).off("keyup", this._onKeyUp);

            Adapt.trigger('drawer:empty');
            this.collection.reset();
            $('#shadow').remove();
        }

    });

    var DrawerItemView = Backbone.View.extend({

        className: 'drawer-item',

        initialize: function() {
            this.listenTo(Adapt, 'drawer:empty', this.remove);
            this.render();
        },

        events: {
            'click .drawer-item-open': 'onDrawerItemClicked'
        },

        render: function() {
            var data = this.model.toJSON();
            var template = Handlebars.templates['drawerItem']
            $(this.el).html(template(data)).appendTo('.drawer-holder');
            return this;
        },

        onDrawerItemClicked: function(event) {
            event.preventDefault();
            var eventCallback = this.model.get('eventCallback');
            Adapt.trigger(eventCallback);
        }
    });

    return DrawerView;
});

define('core/js/drawer',['require','coreViews/drawerView','coreJS/adapt'],function(require) {

	var DrawerView = require('coreViews/drawerView');
	var DrawerCollection = new Backbone.Collection();
	var Adapt = require('coreJS/adapt');

	var Drawer = {};

	Drawer.addItem = function(drawerObject, eventCallback) {
		drawerObject.eventCallback = eventCallback;
		DrawerCollection.add(drawerObject);
	};

	Drawer.triggerCustomView = function(view, hasBackButton) {
		if (hasBackButton !== false) {
			hasBackButton = true;
		}
		Adapt.trigger('drawer:triggerCustomView', view, hasBackButton);
	};

	var init = function() {
		var drawerView = new DrawerView({collection: DrawerCollection});

		Adapt.on('app:languageChanged', function() {
			drawerView.remove();
			drawerView = new DrawerView({collection: DrawerCollection}); 
		});
	};

	Adapt.once('app:dataReady', function() {
		init();
	});

	Adapt.drawer = Drawer;

});

define('core/js/views/notifyView',['require','coreJS/adapt'],function(require) {

    var Adapt = require('coreJS/adapt');

    var NotifyView = Backbone.View.extend({

        className: 'notify',
        disableAnimation: false,
        escapeKeyAttached: false,

        initialize: function() {
            this.disableAnimation = Adapt.config.has('_disableAnimation') ? Adapt.config.get('_disableAnimation') : false;

            this.setupEventListeners();

            //include accessibility globals in notify model
            this.model.set('_globals', Adapt.course.get('_globals'));
            this.render();
        },

        setupEventListeners: function() {
            this.listenTo(Adapt, 'remove', this.remove);
            this.listenTo(Adapt, 'device:resize', this.resetNotifySize);
            this.listenTo(Adapt, 'accessibility:toggle', this.onAccessibilityToggle);
            this._onKeyUp = _.bind(this.onKeyUp, this);
            this.setupEscapeKey();
        },

        setupEscapeKey: function() {
            var hasAccessibility = Adapt.config.has('_accessibility') && Adapt.config.get('_accessibility')._isActive;

            if (!hasAccessibility && ! this.escapeKeyAttached) {
                $(window).on("keyup", this._onKeyUp);
                this.escapeKeyAttached = true;
            } else {
                $(window).off("keyup", this._onKeyUp);
                this.escapeKeyAttached = false;
            }
        },

        onAccessibilityToggle: function() {
            this.setupEscapeKey();
        },

        onKeyUp: function(event) {
            if (event.which != 27) return;
            event.preventDefault();

            this.closeNotify();
        },

        events: {
            'click .notify-popup-alert-button':'onAlertButtonClicked',
            'click .notify-popup-prompt-button': 'onPromptButtonClicked',
            'click .notify-popup-done': 'onCloseButtonClicked',
            'click .notify-shadow': 'onCloseButtonClicked'
        },

        render: function() {
            var data = this.model.toJSON();
            var template = Handlebars.templates['notify'];

            //hide notify container
            this.$el.css("visibility", "hidden");
            //attach popup + shadow
            this.$el.html(template(data)).prependTo('body');
            //hide popup
            this.$('.notify-popup').css("visibility", "hidden");
            //show notify container
            this.$el.css("visibility", "visible");

            this.showNotify();
            return this;
        },

        onAlertButtonClicked: function(event) {
            event.preventDefault();
            //tab index preservation, notify must close before subsequent callback is triggered
            this.closeNotify();
            Adapt.trigger(this.model.get('_callbackEvent'), this);
        },

        onPromptButtonClicked: function(event) {
            event.preventDefault();
            //tab index preservation, notify must close before subsequent callback is triggered
            this.closeNotify();
            Adapt.trigger($(event.currentTarget).attr('data-event'));
        },

        onCloseButtonClicked: function(event) {
            event.preventDefault();
            //tab index preservation, notify must close before subsequent callback is triggered
            this.closeNotify();
            Adapt.trigger("notify:cancelled");
        },

        resetNotifySize: function() {
            $('.notify-popup').removeAttr('style');

            this.resizeNotify();
        },

        resizeNotify: function() {
            var windowHeight = $(window).height();
            var notifyHeight = this.$('.notify-popup').outerHeight();

            if (notifyHeight > windowHeight) {
                this.$('.notify-popup').css({
                    'height':'100%',
                    'top':0,
                    'overflow-y': 'scroll',
                    '-webkit-overflow-scrolling': 'touch'
                });
            } else {
                this.$('.notify-popup').css({
                    'margin-top': -(notifyHeight/2)
                });
            }
        },

        showNotify: function() {

            Adapt.trigger('notify:opened', this);

            if (this.$("img").length > 0) {
                this.$el.imageready( _.bind(loaded, this));
            } else {
                loaded.call(this);
            }

            function loaded() {
                if (this.disableAnimation) {
                    this.$('.notify-shadow').css("display", "block");
                } else {

                    this.$('.notify-shadow').velocity({ opacity: 0 }, {duration:0}).velocity({ opacity: 1 }, {duration:400, begin: _.bind(function() {
                        this.$('.notify-shadow').css("display", "block");
                    }, this)});

                }

                this.resizeNotify();

                if (this.disableAnimation) {

                    this.$('.notify-popup').css("visibility", "visible");
                    complete.call(this);
                    
                } else {

                    this.$('.notify-popup').velocity({ opacity: 0 }, {duration:0}).velocity({ opacity: 1 }, { duration:400, begin: _.bind(function() {
                        this.$('.notify-popup').css("visibility", "visible");
                        complete.call(this);
                    }, this) });

                }
                
                function complete() {
                    /*ALLOWS POPUP MANAGER TO CONTROL FOCUS*/
                    Adapt.trigger('popup:opened', this.$('.notify-popup'));
                    $('body').scrollDisable();
                    
                    //set focus to first accessible element
                    this.$('.notify-popup').a11y_focus();
                }
            }

        },

        closeNotify: function (event) {

            if (this.disableAnimation) {

                this.$('.notify-popup').css("visibility", "hidden");
                this.$el.css("visibility", "hidden");

                this.remove();

            } else {

                this.$('.notify-popup').velocity({ opacity: 0 }, {duration:400, complete: _.bind(function() {
                    this.$('.notify-popup').css("visibility", "hidden");
                }, this)});

                this.$('.notify-shadow').velocity({ opacity: 0 }, {duration:400, complete:_.bind(function() {
                    this.$el.css("visibility", "hidden");
                    this.remove();
                }, this)});
            }

            $('body').scrollEnable();
            Adapt.trigger('popup:closed');
            Adapt.trigger('notify:closed');
        }

    });

    return NotifyView;

});

define('core/js/views/notifyPushView',['require','backbone','coreJS/adapt'],function(require) {

	var Backbone = require('backbone');
	var Adapt = require('coreJS/adapt');

	var NotifyPushView = Backbone.View.extend({

		className: 'notify-push',

		initialize: function() {
			this.listenTo(Adapt, 'notify:pushShown notify:pushRemoved', this.updateIndexPosition);
			this.listenTo(this.model.collection, 'remove', this.updateIndexPosition);
			this.listenTo(this.model.collection, 'change:_index', this.updatePushPosition);
			//include accessibility globals in notify model
			this.model.set('_globals', Adapt.course.get('_globals'));
			this.listenTo(Adapt, 'remove', this.remove);
			this.preRender();
			this.render();
		},

		events: {
			'click .notify-push-close': 'closePush',
			'click .notify-push-inner': 'triggerEvent'
		},

		preRender: function() {
			this.hasBeenRemoved = false;
		},

		render: function() {

            var data = this.model.toJSON();
            var template = Handlebars.templates['notifyPush'];
            this.$el.html(template(data)).appendTo('#wrapper');

            _.defer(_.bind(function() {
                this.postRender();
            }, this));

            return this;
		},

		postRender: function() {

			this.$el.addClass('show');

			_.delay(_.bind(function() {
				this.closePush();
			}, this), this.model.get('_timeout'));

			Adapt.trigger('notify:pushShown');

		},

		closePush: function(event) {

			if (event) {
				event.preventDefault();
			}

			// Check whether this view has been removed as the delay can cause it to be fired twice
			if (this.hasBeenRemoved === false) {

				this.hasBeenRemoved = true;

				this.$el.removeClass('show');

				_.delay(_.bind(function() {
					this.model.collection.remove(this.model);
					Adapt.trigger('notify:pushRemoved', this);
					this.remove();
				}, this), 600);

			}

		},

		triggerEvent: function(event) {

			Adapt.trigger(this.model.get('_callbackEvent'));
			this.closePush();

		},

		updateIndexPosition: function() {
			if (!this.hasBeenRemoved) {
				var models = this.model.collection.models;
				for (var i = 0 , len = models.length; i < len; i++) {
					var index = i;
					var model = models[i];
					if (model.get('_isActive') === true) {
						model.set('_index', index);
						this.updatePushPosition();
					}
				}
			}
		},

		updatePushPosition: function() {
			if (this.hasBeenRemoved) {
				return;
			}
			if (this.model.get('_index') != undefined) {
				var elementHeight = this.$el.height();
				var offset = 20;
				var navigationHeight = $('.navigation').height();
				var currentIndex = this.model.get('_index');
				var flippedIndex = (currentIndex == 0) ? 1 : 0;
				if (this.model.collection.where({_isActive:true}).length === 1) {
					flippedIndex = 0;
				}
				var positionLowerPush = (elementHeight + offset) * flippedIndex + navigationHeight + offset;
				this.$el.css('top', positionLowerPush);
			}
		}

	});

	return NotifyPushView;

});

define('core/js/models/notifyModel',['require','backbone'],function(require) {

	var Backbone = require('backbone');

    var NotifyModel = Backbone.Model.extend({
        defaults: {
        	_isActive:false,
        	_showIcon:false,
        	_timeout:3000
        }
    });

    return NotifyModel;

});

define('core/js/notify',['require','coreJS/adapt','coreViews/notifyView','coreViews/notifyPushView','coreModels/notifyModel'],function(require) {

	var Adapt = require('coreJS/adapt');
	var NotifyView = require('coreViews/notifyView');
	var NotifyPushView = require('coreViews/notifyPushView');
	var NotifyModel = require('coreModels/notifyModel');

	// Build a collection to store push notifications
	var NotifyPushCollection = Backbone.Collection.extend({

		model: NotifyModel,

		initialize: function() {
			this.listenTo(this, 'add', this.onPushAdded);
			this.listenTo(Adapt, 'notify:pushRemoved', this.onRemovePush);
		},

		onPushAdded: function(model) {
			this.checkPushCanShow(model);
		},

		checkPushCanShow: function(model) {
			if (this.canShowPush()) {
				model.set('_isActive', true);
				this.showPush(model);
			}
		},

		canShowPush: function() {
			var availablePushNotifications = this.where({_isActive:true});
			if (availablePushNotifications.length >= 2) {
				return false;
			}
			return true;
		},

		showPush: function(model) {
			new NotifyPushView({
				model: model
			});
		},

		onRemovePush: function(view) {
			var inactivePushNotifications = this.where({_isActive:false});
			if (inactivePushNotifications.length > 0) {
				this.checkPushCanShow(inactivePushNotifications[0]);
			}
		}

	});

	var NotifyPushes = new NotifyPushCollection();

	Adapt.on('notify:alert', function(notifyObject) {
		addNotifyView('alert', notifyObject);
	});

	Adapt.on('notify:prompt', function(notifyObject) {
		addNotifyView('prompt', notifyObject);
	});

	Adapt.on('notify:popup', function(notifyObject) {
		addNotifyView('popup', notifyObject);
	});

	Adapt.on('notify:push', function(notifyObject) {
		addNotifyView('push', notifyObject);
	});

	function addNotifyView(type, notifyObject) {
		notifyObject._type = type;

		if (type === 'push') {

			NotifyPushes.push(notifyObject);

			return;

		}

		var notify = new NotifyView({
			model: new NotifyModel(notifyObject)
		});

	};

});

define('core/js/offlineStorage',[
	'core/js/adapt'
], function(Adapt) {

	//Basic API for setting and getting name+value pairs
	//Allows registration of a single handler.

	Adapt.offlineStorage = {

		/**
		 * set to true initially so that if there are no offlineStorage handlers (i.e. if contrib-spoor is not installed)
		 * this can still be accessed OK
		 */
		ready: true,

		/**
		 * set .ready to false if an offlineStorage handler is being attached - we'll need to wait until the handler lets us know
		 * it's ready before we can safely use offlineStorage
		 */
		initialize: function(handler) {
			this.ready = false;
			this._handler = handler;
		},

		set: function(name, value) {
			if (!(this._handler && this._handler.set)) return;
			return this._handler.set.apply(this._handler, arguments);
		},

		get: function(name) {
			if (!(this._handler && this._handler.get)) return;
			return this._handler.get.apply(this._handler, arguments);
		},

		/**
		 * Some forms of offlineStorage could take time to initialise, this allows us to let plugins know when it's ready to be used 
		 */
		setReadyStatus: function() {
			this.ready = true;
			Adapt.trigger("offlineStorage:ready");
		}

	};

	return Adapt.offlineStorage;

});

define('core/js/popupManager',['require','coreJS/adapt'],function(require) {

    var Adapt = require('coreJS/adapt');

    Adapt.on('popup:opened', function($element) {

		//capture currently active element or element specified
        var $activeElement = $element || $(document.activeElement);

        //save tab indexes
        $activeElement.a11y_popup();
    });

    Adapt.on('popup:closed', function() {

        //restore tab indexes
        $.a11y_popdown();

    });

});

 define('core/js/models/routerModel',['require','backbone','coreJS/adapt'],function(require) {

 	var Backbone = require('backbone');
 	var Adapt = require('coreJS/adapt');

 	var RouterModel = Backbone.Model.extend({

 		defaults: {
 			_canNavigate: true
 		},

 		lockedAttributes: {
 			_canNavigate: false
 		}
 		
 	});

 	return RouterModel;

 });

define('core/js/views/adaptView',[
    'coreJS/adapt'
], function(Adapt) {

    var AdaptView = Backbone.View.extend({

        initialize: function() {
            this.listenTo(Adapt, 'remove', this.remove);
            this.listenTo(this.model, 'change:_isVisible', this.toggleVisibility);
            this.model.set('_globals', Adapt.course.get('_globals'));
            this.model.set('_isReady', false);
            this._isRemoved = false;
            this.preRender();
            this.render();
        },

        preRender: function() {},

        postRender: function() {
            this.addChildren();
        },

        render: function() {
            Adapt.trigger(this.constructor.type + 'View:preRender', this);

            var data = this.model.toJSON();
            var template = Handlebars.templates[this.constructor.template];
            this.$el.html(template(data));

            _.defer(_.bind(function() {
                // don't call postRender after remove
                if(this._isRemoved) return;

                this.postRender();
                Adapt.trigger(this.constructor.type + 'View:postRender', this);
            }, this));

            return this;
        },

        addChildren: function() {
            var nthChild = 0;
            var children = this.model.getChildren();
            var models = children.models;
            for (var i = 0, len = models.length; i < len; i++) {
                var model = models[i];
                if (model.get('_isAvailable')) {
                    nthChild ++;

                    var ChildView;
                    var ViewModelObject = this.constructor.childView || Adapt.componentStore[model.get("_component")];

                    //use view+model object
                    if (ViewModelObject.view) ChildView = ViewModelObject.view;
                    //use view only object
                    else ChildView = ViewModelObject;

                    if (ChildView) {
                        var $parentContainer = this.$(this.constructor.childContainer);
                        model.set("_nthChild", nthChild);
                        $parentContainer.append(new ChildView({model:model}).$el);
                    } else {
                        throw 'The component \'' + models[i].attributes._id + '\'' +
                              ' (\'' + models[i].attributes._component + '\')' +
                              ' has not been installed, and so is not available in your project.';
                    }
                }
            }
        },

        setReadyStatus: function() {
            this.model.set('_isReady', true);
        },

        setCompletionStatus: function() {
            if (this.model.get('_isVisible')) {
                this.model.set('_isComplete', true);
                this.model.set('_isInteractionComplete', true);
            }
        },

        resetCompletionStatus: function(type) {
            if (!this.model.get("_canReset")) return;

            var descendantComponents = this.model.findDescendants('components');
            if (descendantComponents.length === 0) {
                this.model.reset(type);
            } else {
                descendantComponents.each(function(model) {
                    model.reset(type);
                });
            }
        },

        remove: function() {
            this._isRemoved = true;
            this.model.setOnChildren('_isReady', false);
            this.model.set('_isReady', false);
            this.$el.remove();
            this.stopListening();
            return this;
        },

        setVisibility: function() {
            var visible = "visibility-hidden";
            if (this.model.get('_isVisible')) {
                visible = "";
            }
            return visible;
        },

        toggleVisibility: function() {
            if (this.model.get('_isVisible')) {
                return this.$el.removeClass('visibility-hidden');
            }
            this.$el.addClass('visibility-hidden');
        }

    });

    return AdaptView;

});

define('core/js/views/blockView',['require','coreViews/adaptView'],function(require) {

	var AdaptView = require('coreViews/adaptView');

    var BlockView = AdaptView.extend({

        className: function() {
            return "block "
            + this.model.get('_id')
            + " " + this.model.get('_classes')
            + " " + this.setVisibility()
            + " nth-child-"
            + this.model.get("_nthChild");
        }

    }, {
        childContainer: '.component-container',
        type: 'block',
        template: 'block'
    });

    return BlockView;

});

define('core/js/views/articleView',['require','coreViews/adaptView','coreViews/blockView'],function(require) {

    var AdaptView = require('coreViews/adaptView');
    var BlockView = require('coreViews/blockView');

    var ArticleView = AdaptView.extend({

        className: function() {
            return "article "
            + this.model.get('_id')
            + " " + this.model.get('_classes')
            + " " + this.setVisibility()
            + " nth-child-"
            + this.model.get("_nthChild");
        }

    }, {
        childContainer: '.block-container',
        childView: BlockView,
        type: 'article',
        template: 'article'
    });

    return ArticleView;

});

define('core/js/views/pageView',['require','coreViews/adaptView','coreViews/articleView','coreJS/adapt'],function(require) {

    var AdaptView = require('coreViews/adaptView');
    var ArticleView = require('coreViews/articleView');
    var Adapt = require('coreJS/adapt');

    var PageView = AdaptView.extend({

        className: function() {
            return "page "
            + this.model.get('_id')
            + " " + this.model.get('_classes')
            + " " + this.setVisibility();
        },

        preRender: function() {
            this.disableAnimation = Adapt.config.has('_disableAnimation') ? Adapt.config.get('_disableAnimation') : false;
            this.$el.css('opacity', 0);
            this.listenTo(this.model, 'change:_isReady', this.isReady);
        },

        isReady: function() {
            if (this.model.get('_isReady')) {
                _.defer(_.bind(function() {
                    $('.loading').hide();
                    $(window).scrollTop(0);
                    Adapt.trigger('pageView:ready', this);
                    var styleOptions = { opacity: 1 };
                    if (this.disableAnimation) {
                        this.$el.css(styleOptions)
                    } else {
                        this.$el.velocity(styleOptions, 'fast');
                    }
                    $(window).scroll();
                }, this));
            }
        }

    }, {
        childContainer: '.article-container',
        childView: ArticleView,
        type: 'page',
        template: 'page'
    });

    return PageView;

});

define('core/js/startController',[
    'core/js/adapt'
], function(Adapt) {
    
    var StartController = function() {
        this.initialize();
    };

    _.extend(StartController.prototype, {

        model: null,

        initialize: function() {
            this.model = new Backbone.Model(Adapt.course.get("_start"));
        },

        setStartLocation: function() {
            if (!this.isEnabled()) return;

            window.location.hash = this.getStartHash();
        },

        getStartHash: function(alwaysForce) {
            var startId = this.getStartId();

            var hasStartId = (startId)
                ? true
                : false;

            var isRouteSpecified = (_.indexOf(window.location.href,"#") > -1);
            var shouldForceStartId = alwaysForce || this.model.get("_force");
            var shouldNavigateToStartId = hasStartId && (!isRouteSpecified || shouldForceStartId);

            var startHash = "#/";
            if (shouldNavigateToStartId) {
                if (startId !== Adapt.course.get("_id")) {
                    startHash = "#/id/"+startId;
                }
            } else {
                //go to specified route or course main menu
                var hasLocationHash = (window.location.hash)
                    ? true
                    : false;

                startHash = hasLocationHash ? window.location.hash : startHash;
            }

            return startHash;
        },

        isEnabled: function() {
            if (!this.model || !this.model.get("_isEnabled")) return false;
            return true;
        },

        getStartId: function() {
            var startId = this.model.get("_id");
            var startIds = this.model.get("_startIds");

            var hasStartIdsConfiguration = (startIds && startIds.length > 0);
            if (hasStartIdsConfiguration) {
                for (var i = 0, l =  startIds.length; i < l; i++) {
                    var item = startIds[i];
                    var className =  item._className;
                    var skipIfComplete = item._skipIfComplete;
                    
                    var model = Adapt.findById(item._id);
                    
                    if (!model) {
                        console.log("startController: cannot find id", item._id);
                        continue;
                    }
                    
                    if (skipIfComplete) {
                        if (model.get("_isComplete")) continue;
                    }

                    if (!className || $("html").is(className)) {
                        startId = item._id;
                        break;
                    }
                }
            }

            return startId;
        }

    });

    Adapt.once("adapt:start", function() {
        var startController = new StartController();
        startController.setStartLocation();
    });

    return StartController;

});
define('core/js/router',[
    'coreJS/adapt',
    'coreModels/routerModel',
    'coreViews/pageView',
    'coreJS/startController'
], function(Adapt, RouterModel, PageView) {

    Adapt.router = new RouterModel(null, {reset: true});

    var Router = Backbone.Router.extend({

        initialize: function() {
            this.showLoading();
            // Store #wrapper element to cache for later
            this.$wrapper = $('#wrapper');
            Adapt.once('app:dataReady', function() {
                document.title = Adapt.course.get('title');
            });
            this.listenTo(Adapt, 'navigation:backButton', this.navigateToPreviousRoute);
            this.listenTo(Adapt, 'navigation:homeButton', this.navigateToHomeRoute);
            this.listenTo(Adapt, 'navigation:parentButton', this.navigateToParent);
            this.listenTo(Adapt, "router:navigateTo", this.navigateToArguments);
        },

        routes: {
            "":"handleRoute",
            "id/:id":"handleRoute",
            ":pluginName(/*location)(/*action)": "handleRoute"
        },

        handleRoute: function() {
            var args = [].slice.call(arguments, 0, arguments.length);
            if (arguments[arguments.length-1] === null) args.pop();

            //check if the current page is in the progress of navigating to itself
            //it will redirect to itself if the url was changed and _canNavigate is false
            if (!this._isCircularNavigationInProgress) {
                //trigger an event pre 'router:location' to allow extensions to stop routing
                Adapt.trigger("router:navigate", arguments);
            }

            if (Adapt.router.get('_canNavigate')) {
                
                //disable navigation whilst rendering
                Adapt.router.set('_canNavigate', false, {pluginName: "adapt"});

                //only navigate if this switch is set
                switch (args.length) {
                case 1:
                    //if only one parameter assume id
                    return this.handleId.apply(this, arguments);
                case 2:
                    //if two parameters assume plugin
                    return this.handlePluginRouter.apply(this, arguments);
                }
                //if < 1 || > 2 parameters, route to course
                return this.handleCourse();
            }

            
            if (this._isCircularNavigationInProgress) {
                //navigation correction finished
                //router has successfully renavigated to the current id as the url was changed whilst _canNavigate: false
                delete this._isCircularNavigationInProgress;
                return;
            }
            
            //cancel navigation to stay at current location
            this._isCircularNavigationInProgress = true;
            Adapt.trigger("router:navigationCancelled", arguments);

            //reset url to current one
            this.navigateToCurrentRoute(true);

        },

        handlePluginRouter: function(pluginName, location, action) {
            var pluginLocation = pluginName;
            if (location) {
                pluginLocation = pluginLocation + '-' +location;
                if (action) {
                    pluginLocation = pluginLocation + '-' + action;
                }
            }
            this.updateLocation(pluginLocation);
            Adapt.trigger('router:plugin:' + pluginName, pluginName, location, action);
            Adapt.trigger('router:plugin', pluginName, location, action);
        },

        handleCourse: function() {
            if (Adapt.course.has('_start')) {
                // Do not allow access to the menu when the start controller is enabled.
                var startController = Adapt.course.get('_start');
                
                if (startController._isEnabled == true && startController._isMenuDisabled == true) {
                    return;
                }
            }

            this.showLoading();
            this.removeViews();
            Adapt.course.set('_isReady', false);
            this.setContentObjectToVisited(Adapt.course);
            this.updateLocation('course');
            Adapt.once('menuView:ready', function() {
                // Allow navigation
                Adapt.router.set('_canNavigate', true, {pluginName: "adapt"});
            });
            Adapt.trigger('router:menu', Adapt.course);
        },

        handleId: function(id) {

            var currentModel = Adapt.findById(id);
            var type = '';
            
            if (!currentModel) {
                Adapt.router.set('_canNavigate', true, {pluginName: "adapt"});
                return;
            }

            type = currentModel.get('_type');

            switch (type) {
                case 'page':
                case 'menu':
                    if (currentModel.get('_isLocked') && Adapt.config.get('_forceRouteLocking')) {
                        console.log('Unable to navigate to locked id: ' + id);
                        Adapt.router.set('_canNavigate', true, {pluginName: "adapt"});
                        if (Adapt.location._previousId === undefined) {
                            return this.navigate("#/", {trigger:true, replace:true});
                        } else {
                            return Backbone.history.history.back();
                        }
                    } else {
                        this.showLoading();
                        this.removeViews();

                        this.setContentObjectToVisited(currentModel);

                        if (type == 'page') {
                            var location = 'page-' + id;
                            this.updateLocation(location, 'page', id);
                            Adapt.once('pageView:ready', function() {
                                // Allow navigation
                                Adapt.router.set('_canNavigate', true, {pluginName: "adapt"});
                            });
                            Adapt.trigger('router:page', currentModel);
                            this.$wrapper.append(new PageView({model: currentModel}).$el);
                        } else {
                            var location = 'menu-' + id;
                            this.updateLocation(location, 'menu', id);
                            Adapt.once('menuView:ready', function() {
                                // Allow navigation
                                Adapt.router.set('_canNavigate', true, {pluginName: "adapt"});
                            });
                            Adapt.trigger('router:menu', currentModel);
                        }
                    } 
                break;
                default:
                    //allow navigation
                    Adapt.router.set('_canNavigate', true, {pluginName: "adapt"});
                    Adapt.navigateToElement('.' + id, {replace: true});
            }
        },

        removeViews: function() {
            Adapt.trigger('remove');
        },

        showLoading: function() {
            $('.loading').show();
        },
        
        navigateToArguments: function(args) {
            args = [].slice.call(args, 0, args.length);
            if (args[args.length-1] === null) args.pop();
            switch (args.length) {
            case 0:
                this.navigate("#/", {trigger:false, replace:false});
                break;
            case 1:
                if (Adapt.findById(args[0])) {
                    this.navigate("#/id/"+args[0], {trigger:false, replace:false});
                } else {
                    this.navigate("#/"+args[0], {trigger:false, replace:false});
                }
                break;
            case 2:
                this.navigate("#/"+args[0]+"/"+args[1], {trigger:false, replace:false});
                break;
            case 3:
                this.navigate("#/"+args[0]+"/"+args[1]+"/"+args[2], {trigger:false, replace:false});
                break;
            }
            this.handleRoute.apply(this, args);
        },

        navigateToPreviousRoute: function(force) {
            // Sometimes a plugin might want to stop the default navigation
            // Check whether default navigation has changed
            if (Adapt.router.get('_canNavigate') || force) {
                if (!Adapt.location._currentId) {
                    return Backbone.history.history.back();
                }
                if (Adapt.location._previousContentType === "page" && Adapt.location._contentType === "menu") {
                    return this.navigateToParent();
                }
                if (Adapt.location._previousContentType === "page") {
                    return Backbone.history.history.back();
                }
                if (Adapt.location._currentLocation === 'course') {
                    return;
                }
                this.navigateToParent();
            }
        },
        
        navigateToHomeRoute: function(force) {
            if (Adapt.router.get('_canNavigate') || force ) {
                this.navigate('#/', {trigger: true});
            }
        },

        navigateToCurrentRoute: function(force) {
            
            if (Adapt.router.get('_canNavigate') || force) {
                if (!Adapt.location._currentId) {
                    return;
                }
                var currentId = Adapt.location._currentId;
                var route = (currentId === Adapt.course.get("_id")) ? "#/" : "#/id/" + currentId;
                this.navigate(route, { trigger: true, replace: true });
            }
        },

        navigateToParent: function(force) {
            if (Adapt.router.get('_canNavigate') || force) {
                var parentId = Adapt.contentObjects.findWhere({_id:Adapt.location._currentId}).get("_parentId");
                var route = (parentId === Adapt.course.get("_id")) ? "#/" : "#/id/" + parentId;
                this.navigate(route, { trigger: true });  
            }
        },

        setContentObjectToVisited: function(model) {
            model.set('_isVisited', true);
        },

        updateLocation: function(currentLocation, type, id) {
            // Handles updating the location
            Adapt.location._previousId = Adapt.location._currentId;
            Adapt.location._previousContentType = Adapt.location._contentType;

            if (currentLocation === 'course') {
                Adapt.location._currentId = Adapt.course.get('_id');
                Adapt.location._contentType = 'menu';
                Adapt.location._lastVisitedMenu = currentLocation;
            } else if (!type) {
                Adapt.location._currentId = null;
                Adapt.location._contentType = null;

            } else if (arguments.length === 3) {
                Adapt.location._currentId = id;
                Adapt.location._contentType = type;
                if (type === 'menu') {
                    Adapt.location._lastVisitedType = 'menu';
                    Adapt.location._lastVisitedMenu = id;
                } else if (type === 'page') {
                    Adapt.location._lastVisitedType = 'page';
                    Adapt.location._lastVisitedPage = id;
                }
            }

            Adapt.location._currentLocation = currentLocation;

            var classes = (Adapt.location._currentId) ? 'location-'
                    + Adapt.location._contentType
                    + ' location-id-'
                    + Adapt.location._currentId :
                    'location-' + Adapt.location._currentLocation;
            this.$wrapper
                .removeClass()
                .addClass(classes)
                .attr('data-location', Adapt.location._currentLocation);

            this.setDocumentTitle();

            // Trigger event when location changes
            Adapt.trigger('router:location', Adapt.location);
        },

        setDocumentTitle: function() {
            if (!Adapt.location._currentId) return;

            var currentModel = Adapt.findById(Adapt.location._currentId);

            var pageTitle = "";
            if (currentModel && currentModel.get("_type") !== "course") {
                var currentTitle = currentModel.get("title");
                if (currentTitle) pageTitle = " | " + currentTitle;
            }

            var courseTitle = Adapt.course.get("title");
            var documentTitle = $("<div>" + courseTitle + pageTitle + "</div>").text();

            Adapt.once("pageView:ready menuView:ready", function() {
                document.title = documentTitle;
            });

        }


    });

    return new Router({model: new Backbone.Model()});

});

define('core/js/models/adaptModel',['require','backbone','coreJS/adapt'],function (require) {

    var Backbone = require('backbone');
    var Adapt = require('coreJS/adapt');

    var AdaptModel = Backbone.Model.extend({

        defaults: {
            _canShowFeedback: true,
            _classes: "",
            _canReset: false,
            _isComplete: false,
            _isInteractionComplete: false,
            _requireCompletionOf: -1,
            _isEnabled: true,
            _isResetOnRevisit: false,
            _isAvailable: true,
            _isOptional: false,
            _isReady: false,
            _isVisible: true,
            _isLocked: false
        },

        initialize: function () {
            // Wait until data is loaded before setting up model
            this.listenToOnce(Adapt, 'app:dataLoaded', this.setupModel);

        },

        setupModel: function() {
            if (this.get('_type') === 'page') {
                this._children = 'articles';
            }
            if (this._siblings === 'contentObjects' && this.get('_parentId') !== Adapt.course.get('_id')) {
                this._parent = 'contentObjects';
            }
            if (this._children) {
                //if parent is optional, apply to children
                if (this.get('_isOptional')) this.setOptional(true);

                this.setupChildListeners();
            }

            this.init();
            
            _.defer(_.bind(function() {
                if (this._children) {
                    this.checkCompletionStatus();
                    
                    this.checkInteractionCompletionStatus();
                    
                    this.checkLocking();
                }
            }, this));
        },

        setupChildListeners: function() {

            if (!this.getChildren()) return;

            this.listenTo(Adapt[this._children], {
                "change:_isReady": this.checkReadyStatus,
                "change:_isComplete": this.onIsComplete,
                "change:_isInteractionComplete": this.checkInteractionCompletionStatus
            });

        },

        init: function() {},

        reset: function(type, force) {
            if (!this.get("_canReset") && !force) return;

            type = type || true;

            switch (type) {
            case "hard": case true:
                this.set({
                    _isEnabled: true,
                    _isComplete: false,
                    _isInteractionComplete: false,
                });
                break;
            case "soft":
                this.set({
                    _isEnabled: true,
                    _isInteractionComplete: false
                });
                break;
            }
        },

        checkReadyStatus: function () {
            // Filter children based upon whether they are available
            var availableChildren = new Backbone.Collection(this.getChildren().where({_isAvailable: true}));
            // Check if any return _isReady:false
            // If not - set this model to _isReady: true
            if (availableChildren.findWhere({_isReady: false})) return;
            this.set({_isReady: true});
        },

        setCompletionStatus: function() {
            if (this.get('_isVisible')) {
                this.set('_isComplete', true);
                this.set('_isInteractionComplete', true);
            }
        },

        checkCompletionStatus: function () {
            //defer to allow other change:_isComplete handlers to fire before cascasing to parent
            Adapt.checkingCompletion();
            _.defer(_.bind(function() {

                // Filter children based upon whether they are available
                var availableChildren = new Backbone.Collection(this.getChildren().where({_isAvailable: true}));
                
                var isComplete = false;
                
                //number of mandatory children that must be complete or -1 for all
                var requireCompletionOf = this.get("_requireCompletionOf");
                
                if (requireCompletionOf === -1) {
                    // Check if any return _isComplete:false
                    // If not - set this model to _isComplete: true
                    isComplete = (availableChildren.findWhere({_isComplete: false, _isOptional: false}) === undefined);
                } else {
                    isComplete = (availableChildren.where({_isComplete: true, _isOptional: false}).length >= requireCompletionOf );
                }
    
                this.set({_isComplete: isComplete});
                
                Adapt.checkedCompletion();
            }, this));
        },

        checkInteractionCompletionStatus: function () {
            //defer to allow other change:_isInteractionComplete handlers to fire before cascasing to parent
            Adapt.checkingCompletion();
            _.defer(_.bind(function() {
                // Filter children based upon whether they are available
                var availableChildren = new Backbone.Collection(this.getChildren().where({_isAvailable: true}));
                
                var isInteractionComplete = false;
                
                //number of mandatory children that must be complete or -1 for all
                var requireCompletionOf = this.get("_requireCompletionOf")
                
                if (requireCompletionOf === -1) {
                    // Check if any return _isInteractionComplete:false
                    // If not - set this model to _isInteractionComplete: true
                    isInteractionComplete = (availableChildren.findWhere({_isInteractionComplete: false, _isOptional: false}) === undefined);
                } else {
                    isInteractionComplete = (availableChildren.where({_isInteractionComplete: true, _isOptional: false}).length >= requireCompletionOf);
                }
    
                this.set({_isInteractionComplete:isInteractionComplete});
                Adapt.checkedCompletion();

            }, this));
        },

        findAncestor: function (ancestors) {

            var parent = this.getParent();

            if (this._parent === ancestors) {
                return parent;
            }

            var returnedAncestor = parent.getParent();

            if (parent._parent !== ancestors) {
                returnedAncestor = returnedAncestor.getParent();
            }

            // Returns a single model
            return returnedAncestor;

        },

        findDescendants: function (descendants) {

            // first check if descendant is child and return child
            if (this._children === descendants) {
                return this.getChildren();
            }

            var allDescendants = [];
            var flattenedDescendants;
            var children = this.getChildren();
            var returnedDescedants;

            function searchChildren(children) {
                var models = children.models;
                for (var i = 0, len = models.length; i < len; i++) {
                    var model = models[i];
                    var childrensModels = model.getChildren().models;
                    allDescendants.push(childrensModels);
                    flattenedDescendants = _.flatten(allDescendants);
                }

                returnedDescedants = new Backbone.Collection(flattenedDescendants);

                if (children.models.length === 0 || children.models[0]._children === descendants) {
                    return;
                } else {
                    allDescendants = [];
                    searchChildren(returnedDescedants);
                }
            }

            searchChildren(children);

            // returns a collection of children
            return returnedDescedants;
        },

        getChildren: function () {
            if (this.get("_children")) return this.get("_children");

            var childrenCollection;

            if (!this._children) {
                childrenCollection = new Backbone.Collection();
            } else {
                var children = Adapt[this._children].where({_parentId: this.get("_id")});
                childrenCollection = new Backbone.Collection(children);
            }

            if (this.get('_type') == 'block' && childrenCollection.length == 2
                && childrenCollection.models[0].get('_layout') !== 'left' && this.get('_sortComponents') !== false) {
                // Components may have a 'left' or 'right' _layout,
                // so ensure they appear in the correct order
                // Re-order component models to correct it
                childrenCollection.comparator = '_layout';
                childrenCollection.sort();
            }

            this.set("_children", childrenCollection);

            // returns a collection of children
            return childrenCollection;
        },

        getParent: function () {
            if (this.get("_parent")) return this.get("_parent");
            if (this._parent === "course") {
                return Adapt.course;
            }
            var parent = Adapt.findById(this.get("_parentId"));
            this.set("_parent", parent);

            // returns a parent model
            return parent;
        },

        getParents: function(shouldIncludeChild) {
            var parents = [];
            var context = this;
            
            if (shouldIncludeChild) parents.push(context);
            
            while (context.has("_parentId")) {
                context = context.getParent();
                parents.push(context);
            }
            
            return parents.length ? new Backbone.Collection(parents) : null;
        },

        getSiblings: function (passSiblingsAndIncludeSelf) {
            var siblings;
            if (!passSiblingsAndIncludeSelf) {
                // returns a collection of siblings excluding self
                if (this._hasSiblingsAndSelf === false) {
                    return this.get("_siblings");
                }
                siblings = _.reject(Adapt[this._siblings].where({
                    _parentId: this.get("_parentId")
                }), _.bind(function (model) {
                    return model.get('_id') == this.get('_id');
                }, this));

                this._hasSiblingsAndSelf = false;

            } else {
                // returns a collection of siblings including self
                if (this._hasSiblingsAndSelf) {
                    return this.get("_siblings");
                }

                siblings = Adapt[this._siblings].where({
                    _parentId: this.get("_parentId")
                });
                this._hasSiblingsAndSelf = true;
            }

            var siblingsCollection = new Backbone.Collection(siblings);
            this.set("_siblings", siblingsCollection);
            return siblingsCollection;
        },

        setOnChildren: function (key, value, options) {

            var args = arguments;

            this.set.apply(this, args);

            if (!this._children) return;

            var children = this.getChildren();
            var models = children.models;
            for (var i = 0, len = models.length; i < len; i++) {
                var child = models[i];
                child.setOnChildren.apply(child, args);
            }

        },

        setOptional: function(value) {
            this.set({_isOptional: value});
        },

        checkLocking: function() {
            var lockType = this.get("_lockType");

            if (!lockType) return;

            switch (lockType) {
                case "sequential":
                    this.setSequentialLocking();
                    break;
                case "unlockFirst":
                    this.setUnlockFirstLocking();
                    break;
                case "lockLast":
                    this.setLockLastLocking();
                    break;
                case "custom":
                    this.setCustomLocking();
                    break;
                default:
                    console.warn("AdaptModel.checkLocking: unknown _lockType \"" +
                        lockType + "\" found on " + this.get("_id"));
            }
        },

        setSequentialLocking: function() {
            var children = this.getChildren().models;

            for (var i = 1, j = children.length; i < j; i++) {
                children[i].set("_isLocked", !children[i - 1].get("_isComplete"));
            }
        },

        setUnlockFirstLocking: function() {
            var children = this.getChildren().models;
            var isFirstChildComplete = children[0].get("_isComplete");

            for (var i = 1, j = children.length; i < j; i++) {
                children[i].set("_isLocked", !isFirstChildComplete);
            }
        },

        setLockLastLocking: function() {
            var children = this.getChildren().models;
            var lastIndex = children.length - 1;

            for (var i = lastIndex - 1; i >= 0; i--) {
                if (!children[i].get("_isComplete")) {
                    return children[lastIndex].set("_isLocked", true);
                }
            }

            children[lastIndex].set("_isLocked", false);
        },

        setCustomLocking: function() {
            var children = this.getChildren().models;

            for (var i = 0, j = children.length; i < j; i++) {
                var child = children[i];

                child.set("_isLocked", this.shouldLock(child));
            }
        },

        shouldLock: function(child) {
            var lockedBy = child.get("_lockedBy");

            if (!lockedBy) return false;

            for (var i = lockedBy.length - 1; i >= 0; i--) {
                var id = lockedBy[i];

                try {
                    if (!Adapt.findById(id).get("_isComplete")) return true;
                }
                catch (e) {
                    console.warn("AdaptModel.shouldLock: unknown _lockedBy ID \"" + id +
                        "\" found on " + child.get("_id"));
                }
            }

            return false;
        },
        
        onIsComplete: function() {
            this.checkCompletionStatus();
            
            this.checkLocking();
        }

    });

    return AdaptModel;

});
define('core/js/models/articleModel',['require','coreModels/adaptModel','coreJS/adapt'],function(require) {

	var AdaptModel = require('coreModels/adaptModel');
	var Adapt = require('coreJS/adapt');

    var ArticleModel = AdaptModel.extend({
        _parent:'contentObjects',
    	_siblings:'articles',
        _children: 'blocks'
    });

    return ArticleModel;

});

define('core/js/models/blockModel',['require','coreModels/adaptModel'],function(require) {

	var AdaptModel = require('coreModels/adaptModel');

    var BlockModel = AdaptModel.extend({
        _parent:'articles',
    	_siblings:'blocks',
        _children: 'components',
        
        defaults: function() {
            return _.extend({
                _sortComponents: true
            }, AdaptModel.prototype.defaults);
        }
    });

    return BlockModel;

});

define('core/js/models/componentModel',[
    'coreJS/adapt',
    'coreModels/adaptModel'
], function(Adapt, AdaptModel) {

    var ComponentModel = AdaptModel.extend({
        _parent:'blocks',
    	_siblings:'components'
    });

    return ComponentModel;

});

define('core/js/models/configModel',['require','backbone','coreJS/adapt'],function(require) {

    var Backbone = require('backbone');
    var Adapt = require('coreJS/adapt');

    var ConfigModel = Backbone.Model.extend({

        defaults: {
            screenSize : {
                small: 520,
                medium: 760,
                large: 1024
            },
            _forceRouteLocking: false,
            _canLoadData: true,
            _disableAnimation: false
        },

        initialize: function(attrs, options) {
            this.url = options.url;
            // Fetch data & if successful trigger event to enable plugins to stop course files loading
            // Then check if course files can load
            // 'configModel:loadCourseData' event starts the core content collections and models being fetched
            this.fetch({
                success: _.bind(function() {
                    Adapt.trigger('configModel:dataLoaded');
                    if (this.get('_canLoadData')) {
                        Adapt.trigger('configModel:loadCourseData');
                    }
                    if(this.get('_defaultDirection')=='rtl'){//We're going to use rtl style
                    	$('html').addClass('dir-rtl');
                    }
                    // check if animations should be disabled
                    var disableAnimationArray = this.get('_disableAnimationFor');
                    if (disableAnimationArray && disableAnimationArray.length > 0) {
                        for (var i=0; i < disableAnimationArray.length; i++) {
                            if ($("html").is(disableAnimationArray[i])) {
                                this.set('_disableAnimation', true);
                                console.log('Animation disabled.');
                            }
                        }
                    }
                }, this),
                error: function() {
                    console.log('Unable to load course/config.json');
                }
            });
        },

        loadData: function() {

        }

    });

   return ConfigModel;

});

define('core/js/models/contentObjectModel',['require','coreModels/adaptModel','coreJS/adapt'],function(require) {

    var AdaptModel = require('coreModels/adaptModel');
    var Adapt = require('coreJS/adapt');

    var ContentObjectModel = AdaptModel.extend({
    	_parent:'course',
    	_siblings:'contentObjects',
        _children: 'contentObjects'
    });

    return ContentObjectModel;
});

define('core/js/models/courseModel',['require','coreModels/adaptModel','coreJS/adapt'],function(require) {

    var AdaptModel = require('coreModels/adaptModel');
    var Adapt = require('coreJS/adapt');

    var CourseModel = AdaptModel.extend({

        initialize: function(attrs, options) {
            AdaptModel.prototype.initialize.apply(this, arguments);
            Adapt.trigger('courseModel:dataLoading');

            this.url = options.url;

            this.on('sync', this.loadedData, this);
            if (this.url) {
                this.fetch({
                    error: _.bind(function(model, xhr, options) {
                        console.error("ERROR: unable to load file " + this.url);
                    }, this)
                });
            }
        },

        loadedData: function() {
            Adapt.trigger('courseModel:dataLoaded');
        },

        _children: "contentObjects"

    });

    return CourseModel;

});

define('core/js/models/questionModel',[
    'coreJS/adapt',
    'coreModels/componentModel'
], function(Adapt, ComponentModel) {

    var QuestionModel = ComponentModel.extend({

        //////
        // Setup question types
        ////

        // Used to set model defaults
        defaults: function() {
            // Extend from the ComponentModel defaults
            return _.extend({
                '_isQuestionType': true,
                '_shouldDisplayAttempts': false,
                '_canShowModelAnswer': true,
                '_canShowFeedback': true,
                '_canShowMarking': true,
                '_questionWeight': Adapt.config.get("_questionWeight"),
            }, ComponentModel.prototype.defaults);
        },

        init: function() {
            this.setupDefaultSettings();
            this.listenToOnce(Adapt, "adapt:initialize", this.onAdaptInitialize);
        },

        // Calls default methods to setup on questions
        setupDefaultSettings: function() {
            // Not sure this is needed anymore, keeping to maintain API
            this.setupWeightSettings();
            this.setupButtonSettings();
        },

        // Used to setup either global or local button text
        setupButtonSettings: function() {
            var globalButtons = Adapt.course.get("_buttons");

            // Checks if local _buttons exists and if not use global
            if (!this.has("_buttons")) {
                this.set("_buttons", globalButtons);
            } else {
                // check all the components buttons
                // if they are empty use the global default
                var componentButtons = this.get("_buttons");

                if (typeof componentButtons.submit == 'undefined') {
                    for (var key in componentButtons) {
                        if (typeof componentButtons[key] == 'object') {
                          // ARIA labels
                          if (!componentButtons[key].buttonText && globalButtons[key].buttonText) {
                            componentButtons[key].buttonText = globalButtons[key].buttonText;
                          }

                          if (!componentButtons[key].ariaLabel && globalButtons[key].ariaLabel) {
                            componentButtons[key].ariaLabel = globalButtons[key].ariaLabel;
                          }
                        }

                        if (!componentButtons[key] && globalButtons[key]) {
                            componentButtons[key] = globalButtons[key];
                        }
                    }
                } else {
                    // Backwards compatibility with v1.x
                    var buttons = [];

                    for (var key in componentButtons) {
                        var index = '_' + key;

                        if (!componentButtons[key]) {
                            buttons[index] = globalButtons[index];
                        } else {
                            buttons[index] = {
                                buttonText: componentButtons[key],
                                ariaLabel: componentButtons[key]
                            };
                        }
                    }

                    // HACK - Append other missing values
                    buttons['_showFeedback'] = {
                        buttonText: 'Show feedback',
                        ariaLabel: 'Show feedback'
                    };

                    this.set('_buttons', buttons);
                }
            }
        },

        // Used to setup either global or local question weight/score
        setupWeightSettings: function() {
            // Not needed as handled by model defaults, keeping to maintain API
        },

        //////
        // Selection restoration process
        ////


        // Used to add post-load changes to the model
        onAdaptInitialize: function() {
            this.restoreUserAnswers();
        },

        // Used to restore the user answers 
        restoreUserAnswers: function() {},

        
        //////
        // Submit process
        ////

        // Use to check if the user is allowed to submit the question
        // Maybe the user has to select an item?
        canSubmit: function() {},

        // Used to update the amount of attempts the user has left
        updateAttempts: function() {
            if (!this.get('_attemptsLeft')) {
                this.set("_attemptsLeft", this.get('_attempts'));
            }
            this.set("_attemptsLeft", this.get('_attemptsLeft') - 1);
        },

        // Used to set _isEnabled and _isSubmitted on the model
        setQuestionAsSubmitted: function() {
            this.set({
                _isEnabled: false,
                _isSubmitted: true
            });
        },

        // This is important for returning or showing the users answer
        // This should preserve the state of the users answers
        storeUserAnswer: function() {},

        // Sets _isCorrect:true/false based upon isCorrect method below
        markQuestion: function() {

            if (this.isCorrect()) {
                this.set('_isCorrect', true);
            } else {
                this.set('_isCorrect', false);
            }

        },

         // Should return a boolean based upon whether to question is correct or not
        isCorrect: function() {},

        // Used to set the score based upon the _questionWeight
        setScore: function() {},

        // Checks if the question should be set to complete
        // Calls setCompletionStatus and adds complete classes
        checkQuestionCompletion: function() {

            var isComplete = (this.get('_isCorrect') || this.get('_attemptsLeft') === 0);

            if (isComplete) {
                this.setCompletionStatus();
            }

            return isComplete;

        },

        // Updates buttons based upon question state by setting
        // _buttonState on the model which buttonsView listens to
        updateButtons: function() {

            var isInteractionComplete = this.get('_isInteractionComplete');
            var isCorrect = this.get('_isCorrect');
            var isEnabled = this.get('_isEnabled');
            var buttonState = this.get('_buttonState');
            var canShowModelAnswer = this.get('_canShowModelAnswer');

            if (isInteractionComplete) {

                if (isCorrect || !canShowModelAnswer) {
                    // Use correct instead of complete to signify button state
                    this.set('_buttonState', 'correct');

                } else {

                    switch (buttonState) {
                      case "submit":
                      case "hideCorrectAnswer":
                          this.set('_buttonState', 'showCorrectAnswer');
                          break;
                      default:
                          this.set('_buttonState', 'hideCorrectAnswer');
                    }

                }

            } else {

                if (isEnabled) {
                    this.set('_buttonState', 'submit');
                } else {
                    this.set('_buttonState', 'reset');
                }
            }

        },

        // Used to setup the correct, incorrect and partly correct feedback
        setupFeedback: function() {

            if (this.get('_isCorrect')) {
                this.setupCorrectFeedback();
            } else if (this.isPartlyCorrect()) {
                this.setupPartlyCorrectFeedback();
            } else {
                this.setupIncorrectFeedback();
            }

        },

        // Used by the question to determine if the question is incorrect or partly correct
        // Should return a boolean
        isPartlyCorrect: function() {},

        setupCorrectFeedback: function() {

            this.set({
                feedbackTitle: this.get('title'),
                feedbackMessage: this.get("_feedback") ? this.get("_feedback").correct : ""
            });

        },

        setupPartlyCorrectFeedback: function() {

            if (this.get("_feedback") && this.get('_feedback')._partlyCorrect) {
                if (this.get('_attemptsLeft') === 0 || !this.get('_feedback')._partlyCorrect.notFinal) {
                    if (this.get('_feedback')._partlyCorrect.final) {
                        this.set({
                            feedbackTitle: this.get('title'),
                            feedbackMessage: this.get("_feedback") ? this.get('_feedback')._partlyCorrect.final : ""
                        });
                    } else {
                        this.setupIncorrectFeedback();
                    }
                } else {
                    this.set({
                        feedbackTitle: this.get('title'),
                        feedbackMessage: this.get("_feedback") ? this.get('_feedback')._partlyCorrect.notFinal : ""
                    });
                }
            } else {
                this.setupIncorrectFeedback();
            }

        },

        setupIncorrectFeedback: function() {

            if (this.get('_attemptsLeft') === 0 || this.get('_feedback') && !this.get('_feedback')._incorrect.notFinal) {
                this.set({
                    feedbackTitle: this.get('title'),
                    feedbackMessage: this.get("_feedback") ? this.get('_feedback')._incorrect.final : ""
                });
            } else {
                this.set({
                    feedbackTitle: this.get('title'),
                    feedbackMessage: this.get("_feedback") ? this.get('_feedback')._incorrect.notFinal : ""
                });
            }

        },

        // Reset the model to let the user have another go (not the same as attempts)
        reset: function(type, force) {
            if (!this.get("_canReset") && !force) return;

            type = type || true; //hard reset by default, can be "soft", "hard"/true

            ComponentModel.prototype.reset.call(this, type, force);

            var attempts = this.get('_attempts');
            this.set({
                _attemptsLeft: attempts,
                _isCorrect: undefined,
                _isSubmitted: false,
                _buttonState: 'submit'
            });
        },

        // Reset question for subsequent attempts
        setQuestionAsReset: function() {
            this.set({
                _isEnabled: true,
                _isSubmitted: false
            });
        },

        // Used by the question view to reset the stored user answer
        resetUserAnswer: function() {}


    });

    return QuestionModel;

});

define('core/js/views/buttonsView',['coreJS/adapt'],function() {

    var Adapt = require('coreJS/adapt');

    var ButtonsView = Backbone.View.extend({

        initialize: function() {
            this.listenTo(Adapt, 'remove', this.remove);
            this.listenTo(this.model, 'change:_buttonState', this.onButtonStateChanged);
            this.listenTo(this.model, 'change:feedbackMessage', this.onFeedbackMessageChanged);
            this.listenTo(this.model, 'change:_attemptsLeft', this.onAttemptsChanged);
            this.render();
        },

        events: {
            'click .buttons-action': 'onActionClicked',
            'click .buttons-feedback': 'onFeedbackClicked'
        },

        render: function() {
            var data = this.model.toJSON();
            var template = Handlebars.templates['buttons'];
            _.defer(_.bind(function() {
                this.postRender();
                Adapt.trigger('buttonsView:postRender', this);
            }, this));
            this.$el.html(template(data));
        },

        postRender: function() {
            this.updateAttemptsCount();
            this.checkResetSubmittedState();
            this.checkFeedbackState();
            this.onButtonStateChanged(null, this.model.get('_buttonState'));
            this.onFeedbackMessageChanged(null, this.model.get('feedbackMessage'));
        },

        checkResetSubmittedState: function() {
            var isSubmitted = this.model.get('_isSubmitted');

            if (!isSubmitted) {

                var $icon = this.$('.buttons-marking-icon');
                $icon.removeClass('icon-cross');
                $icon.removeClass('icon-tick');
                $icon.addClass('display-none');
                this.$el.removeClass("submitted");
                this.model.set('feedbackMessage', undefined);
                this.$('.buttons-feedback').a11y_cntrl_enabled(false);

            } else {

                this.$el.addClass("submitted");

            }
        },

        onActionClicked: function() {
            var buttonState = this.model.get('_buttonState');
            this.trigger('buttons:' + buttonState);
            this.checkResetSubmittedState();
        },

        onFeedbackClicked: function() {
            this.trigger('buttons:showFeedback');
        },

        onFeedbackMessageChanged: function(model, changedAttribute) {
            if (changedAttribute && this.model.get('_canShowFeedback')) {
				//enable feedback button
                this.$('.buttons-feedback').a11y_cntrl_enabled(true);
            } else {
				//disable feedback button
                this.$('.buttons-feedback').a11y_cntrl_enabled(false)
            }
        },

        onButtonStateChanged: function(model, changedAttribute) {
			//use correct instead of complete to signify button state
            if (changedAttribute === 'correct') {
				//disable submit button on correct (i.e. no model answer)
                this.$('.buttons-action').a11y_cntrl_enabled(false);

                if (!this.model.get("_canShowFeedback")) {
                    if (!this.$el.is(".no-state")) {
                        //if no feedback, complete correct and has state, force focus to component state
                        _.defer(_.bind(function() {
                            $("." + this.model.get("_id") + " .accessibility-state [tabindex]").focusNoScroll();
                        }, this));
                    }
                }

            } else {
                // Backwords compatibility with v1.x
                var ariaLabel = this.model.get('_buttons')["_" + changedAttribute].ariaLabel;
                var buttonText = this.model.get('_buttons')["_" + changedAttribute].buttonText;

                switch (changedAttribute) {
                    case "showCorrectAnswer": case "hideCorrectAnswer":
    				    //make model answer button inaccessible but enabled for visual users
    				    //	due to inability to represent selected incorrect/correct answers to a screen reader, may need revisiting
                        this.$('.buttons-action').a11y_cntrl(false).html(buttonText).attr('aria-label', ariaLabel);
                        break;
                    default:
    				    //enabled button, make accessible and update aria labels and text.
                        this.$('.buttons-action').a11y_cntrl_enabled(true).html(buttonText).attr('aria-label', ariaLabel);
                }
            }

            this.updateAttemptsCount();
        },

        checkFeedbackState: function(){
            if (!this.model.get('_canShowFeedback')) {
                // If feedback should be hidden, the 'Submit' button should stretch
                // to fill the space and the 'Feedback' button should be hidden.
                // (These classes must be implemented in the theme.)
                this.$('.buttons-action').addClass('buttons-action-fullwidth');
                this.$('.buttons-feedback').addClass('no-feedback');
            }
        },

        updateAttemptsCount: function(model, changedAttribute) {
            var isInteractionComplete = this.model.get('_isInteractionComplete');
            var attemptsLeft = (this.model.get('_attemptsLeft')) ? this.model.get('_attemptsLeft') : this.model.get('_attempts')
            var isCorrect = this.model.get('_isCorrect');
            var shouldDisplayAttempts = this.model.get('_shouldDisplayAttempts');
            var attemptsString;

            this.checkResetSubmittedState();

            if (!isInteractionComplete && attemptsLeft != 0) {
                attemptsString = attemptsLeft + " ";
                if (attemptsLeft > 1) {
                    attemptsString += this.model.get('_buttons').remainingAttemptsText;
                } else if (attemptsLeft === 1){
                    attemptsString += this.model.get('_buttons').remainingAttemptText;
                }

            } else {
                this.$('.buttons-display-inner').addClass('visibility-hidden');
                this.showMarking();
            }

            if (shouldDisplayAttempts) {
                this.$('.buttons-display-inner').html(attemptsString);
            }

        },

        showMarking: function() {
            if (!this.model.get('_canShowMarking')) return;

            this.$('.buttons-marking-icon')
                .removeClass('display-none')
                .addClass(this.model.get('_isCorrect') ? 'icon-tick' : 'icon-cross');
        }

    });

    return ButtonsView;

});

define('core/js/views/componentView',['require','coreJS/adapt','coreViews/adaptView'],function(require) {

    var Adapt = require("coreJS/adapt");
    var AdaptView = require('coreViews/adaptView');

    var ComponentView = AdaptView.extend({

        className: function() {
            return "component "
            + this.model.get('_component')
            + "-component " + this.model.get('_id')
            + " " + this.model.get('_classes')
            + " " + this.setVisibility()
            + " component-" + this.model.get('_layout')
            + " nth-child-" + this.model.get("_nthChild");
        },

        initialize: function(){
			//standard initialization + renderState function
            AdaptView.prototype.initialize.apply(this, arguments);
            this.renderState();
        },

        renderState: function() {
            if (!Handlebars.partials['state']) return;

			// do not perform if component has .not-accessible class
            if (this.$el.is(".not-accessible")) return;
			// do not perform if component has .no-state class
            if (this.$el.is(".no-state")) return;

			//remove pre-exisiting states
            var $previousState = this.$(".accessibility-state").remove();

            //render and append state partial
            var $rendered = $(Handlebars.partials['state']( this.model.toJSON() ));

            //restore previous tab index if not on
            var previousTabIndex = $previousState.find(".aria-label").attr("tabindex");
            if (previousTabIndex == "-1") {
                $rendered.find(".aria-label").attr("tabindex", previousTabIndex);
            }

            this.$el.append( $rendered );

            this.listenToOnce(this.model, 'change:_isComplete', this.renderState);
        },

        postRender: function() {}

    }, {
        type:'component'
    });

    return ComponentView;

});

define('core/js/views/menuView',['require','coreViews/adaptView','coreJS/adapt'],function(require) {

    var AdaptView = require('coreViews/adaptView');
    var Adapt = require('coreJS/adapt');

    var MenuView = AdaptView.extend({

    	className: function() {
            var visible = "visibility-hidden";
            if (this.model.get('_isVisible')) {
                visible = "";
            }
    		return 'menu '
            + 'menu-'
            + this.model.get('_id')
            + " " + this.model.get('_classes')
            + " " + this.setVisibility();
    	},

        preRender: function() {
            this.disableAnimation = Adapt.config.has('_disableAnimation') ? Adapt.config.get('_disableAnimation') : false;
            this.$el.css('opacity', 0);
            this.listenTo(this.model, 'change:_isReady', this.isReady);
        },

        postRender: function() {
        },

        isReady: function() {
            if (this.model.get('_isReady')) {
                _.defer(_.bind(function() {
                    $('.loading').hide();
                    $(window).scrollTop(0);
                    Adapt.trigger('menuView:ready', this);
                    var styleOptions = { opacity: 1 };
                    if (this.disableAnimation) {
                        this.$el.css(styleOptions);
                    } else {
                        this.$el.velocity(styleOptions, 'fast');
                    }
                    $(window).scroll();
                }, this));
            }
        }

    }, {
        type:'menu'
    });

    return MenuView;

});

define('core/js/views/navigationView',['require','backbone','handlebars','coreJS/adapt'],function(require) {

    var Backbone = require('backbone');
    var Handlebars = require('handlebars');
    var Adapt = require('coreJS/adapt');

    var NavigationView = Backbone.View.extend({

        className: "navigation",

        initialize: function() {
            this.listenToOnce(Adapt, 'courseModel:dataLoading', this.remove);
            this.listenTo(Adapt, 'router:menu router:page', this.hideNavigationButton);
            this.template = "navigation";
            this.preRender();
        },

        events: {
            'click [data-event]':'triggerEvent'
        },

        preRender: function() {
            Adapt.trigger('navigationView:preRender', this);
            this.render();
        },

        render: function() {
            var template = Handlebars.templates[this.template]
            this.$el.html(template({_globals: Adapt.course.get("_globals")})).appendTo('#wrapper');
            _.defer(_.bind(function() {
                Adapt.trigger('navigationView:postRender', this);
            }, this));
            return this;
        },

        triggerEvent: function(event) {
            event.preventDefault();
            var currentEvent = $(event.currentTarget).attr('data-event');
            Adapt.trigger('navigation:' + currentEvent);
        },

        hideNavigationButton: function(model) {
            if (model.get('_type') === "course") {
                $('.navigation-back-button').addClass('display-none');
            } else {
                this.showNavigationButton();
            }
        },

        showNavigationButton: function() {
            $('.navigation-back-button').removeClass('display-none');
        }

    });

    return NavigationView;

});

define('core/js/views/questionView',[
    'coreJS/adapt',
    'coreViews/componentView',
    'coreViews/buttonsView',
    'coreModels/questionModel'
], function(Adapt, ComponentView, ButtonsView, QuestionModel) {

    var useQuestionModelOnly = false;

    var QuestionView = ComponentView.extend({

        className: function() {
            return "component "
            + "question-component "
            + this.model.get('_component')
            + "-component " + this.model.get('_id')
            + " " + this.model.get('_classes')
            + " " + this.setVisibility()
            + " component-" + this.model.get('_layout')
            + " nth-child-" + this.model.get("_nthChild");
        },

        //////
        // Setup question types
        ////

        preRender: function() {
            // Setup listener for _isEnabled
            this.listenTo(this.model, 'change:_isEnabled', this.onEnabledChanged);
            // Checks to see if the question should be reset on revisit
            this.checkIfResetOnRevisit();
            // This method helps setup default settings on the model
            this._runModelCompatibleFunction("setupDefaultSettings");
            // Blank method for setting up questions before rendering
            this.setupQuestion();

        },

        // Used in the question view to disabled the question when _isEnabled has been set to false
        onEnabledChanged: function(model, changedAttribute) {

            // If isEnabled == false add disabled class
            // else remove disabled class
            if (!changedAttribute) {
                this.$('.component-widget').addClass('disabled');
                this.disableQuestion();
            } else {
                this.$('.component-widget').removeClass('disabled');
                this.enableQuestion();
            }

        },

        // Used by the question to disable the question during submit and complete stages
        disableQuestion: function() {},

        // Used by the question to enable the question during interactions
        enableQuestion: function() {},

        // Used to check if the question should reset on revisit
        checkIfResetOnRevisit: function() {

            var isResetOnRevisit = this.model.get('_isResetOnRevisit');

            // If reset is enabled set defaults
            // Call blank method for question to handle
            if (isResetOnRevisit) {

                this.model.reset(isResetOnRevisit, true);

                 // Defer is added to allow the component to render
                _.defer(_.bind(function() {
                   this.resetQuestionOnRevisit(isResetOnRevisit);
                }, this));

            } else {

                // If complete - display users answer
                // or reset the question if not complete
                var isInteractionComplete = this.model.get('_isInteractionComplete');

                if (isInteractionComplete) {
                    this.model.set('_buttonState', 'hideCorrectAnswer');
                    // Defer is added to allow the component to render
                    _.defer(_.bind(function() {
                        this.onHideCorrectAnswerClicked();
                    }, this));

                } else {
                    this.model.set('_buttonState', 'submit');
                    // Defer is added to allow the component to render
                    _.defer(_.bind(function() {
                        this.onResetClicked();
                    }, this));
                }

            }

        },

        // Used by the question to reset the question when revisiting the component
        resetQuestionOnRevisit: function(type) {},

        // Left blank for question setup - should be used instead of preRender
        setupQuestion: function() {},

        // Calls default methods to setup after the question is rendered
        postRender: function() {
            this.addButtonsView();
            this.onQuestionRendered();
        },

        // Used to setup buttonsView and sets up the internal events for the question
        addButtonsView: function() {
            this.buttonsView = new ButtonsView({model: this.model, el: this.$('.buttons')});
            this.listenTo(this.buttonsView, 'buttons:submit', this.onSubmitClicked);
            this.listenTo(this.buttonsView, 'buttons:reset', this.onResetClicked);
            this.listenTo(this.buttonsView, 'buttons:showCorrectAnswer', this.onShowCorrectAnswerClicked);
            this.listenTo(this.buttonsView, 'buttons:hideCorrectAnswer', this.onHideCorrectAnswerClicked);
            this.listenTo(this.buttonsView, 'buttons:showFeedback', this.showFeedback);
        },

        // Blank method used just like postRender is for presentational components
        onQuestionRendered: function() {},

        //////
        // Submit process
        ////

        // Triggered when the submit button is clicked
        onSubmitClicked: function() {
            // canSubmit is setup in questions and should return a boolean
            // If the question stops the user form submitting - show instruction error
            // and give a blank method, onCannotSubmit to the question
            var canSubmit = this._runModelCompatibleFunction("canSubmit");

            if(!canSubmit) {
                this.showInstructionError();
                this.onCannotSubmit();
                return;
            }

            // Used to update the amount of attempts the question has
            this._runModelCompatibleFunction("updateAttempts");

            // Used to set attributes on the model after being submitted
            // Also adds a class of submitted
            this._runModelCompatibleFunction("setQuestionAsSubmitted");

            // Used to remove instruction error that is set when
            // the user has interacted in the wrong way
            this.removeInstructionError();

            // Used to store the users answer for later
            // This is a blank method given to the question
            this._runModelCompatibleFunction("storeUserAnswer");

            // Used to set question as correct:true/false
            // Calls isCorrect which is blank for the question
            // to fill out and return a boolean
            this._runModelCompatibleFunction("markQuestion", "isCorrect");

            // Used by the question to set the score on the model
            this._runModelCompatibleFunction("setScore");

            // Used by the question to display markings on the component
            this.showMarking();

            // Used to check if the question is complete
            // Triggers setCompletionStatus and adds class to widget
            this._runModelCompatibleFunction("checkQuestionCompletion");

            this.recordInteraction();

            // Used to setup the feedback by checking against
            // question isCorrect or isPartlyCorrect
            this._runModelCompatibleFunction("setupFeedback");

            // Used to update buttonsView based upon question state
            // Update buttons happens before showFeedback to preserve tabindexes and after setupFeedback to allow buttons to use feedback attribute
            this._runModelCompatibleFunction("updateButtons");

            // Used to trigger an event so plugins can display feedback
            this.showFeedback();
            
            this.onSubmitted();
        },

        // Adds a validation error class when the canSubmit returns false
        showInstructionError: function() {
            this.$(".component-instruction-inner").addClass("validation-error");
            this.$el.a11y_focus();
        },

        // Blank method for question to fill out when the question cannot be submitted
        onCannotSubmit: function() {},

        // Blank method for question to fill out when the question was successfully submitted
        onSubmitted: function() {},

        // Used to set _isEnabled and _isSubmitted on the model
        // Also adds a 'submitted' class to the widget
        setQuestionAsSubmitted: function() {
            this.model.setQuestionAsSubmitted();
            this.$(".component-widget").addClass("submitted");
        },

        // Removes validation error class when the user canSubmit
        removeInstructionError: function() {
            this.$(".component-instruction-inner").removeClass("validation-error");
        },

        // This is important and should give the user feedback on how they answered the question
        // Normally done through ticks and crosses by adding classes
        showMarking: function() {},

        // Checks if the question should be set to complete
        // Calls setCompletionStatus and adds complete classes
        checkQuestionCompletion: function() {

            var isComplete = this.model.checkQuestionCompletion();

            if (isComplete) {
                this.$('.component-widget').addClass('complete show-user-answer');
            }

        },

        recordInteraction:function() {
            if (this.model.get('_recordInteraction') === true || !this.model.has('_recordInteraction')) {
                Adapt.trigger('questionView:recordInteraction', this);
            }
        },

        // Used to show feedback based upon whether _canShowFeedback is true
        showFeedback: function() {

            if (this.model.get('_canShowFeedback')) {
                Adapt.trigger('questionView:showFeedback', this);
            } else {
                Adapt.trigger('questionView:disabledFeedback', this);
            }

        },

        onResetClicked: function() {
            this.setQuestionAsReset();
            
            this._runModelCompatibleFunction("updateButtons");

            this._runModelCompatibleFunction("resetUserAnswer");

            this.resetQuestion();
            if (this.model.get("_isReady")) {
                //if the model is already rendered, focus on the first tabbable element
                //onResetClicked is called as part of the checkIfResetOnRevisit function and as a button click
                _.defer(_.bind(function(){
                    this.$el.a11y_focus();
                }, this));
            }
        },

        setQuestionAsReset: function() {
            this.model.setQuestionAsReset();
            this.$(".component-widget").removeClass("submitted");
            
            // Attempt to get the current page location
            var currentModel = Adapt.findById(Adapt.location._currentId);
            if (currentModel && currentModel.get("_isReady")) {
                //if the page is ready, focus on the first tabbable item
                //otherwise will try to set focus as page loads and components are rendered
                this.$el.a11y_focus();
            }
        },

        // Used by the question view to reset the look and feel of the component.
        // This could also include resetting item data
        // This is triggered when the reset button is clicked so it shouldn't
        // be a full reset
        resetQuestion: function() {},

        onShowCorrectAnswerClicked: function() {
            this.setQuestionAsShowCorrect();

            this._runModelCompatibleFunction("updateButtons");

            this.showCorrectAnswer();
        },

        setQuestionAsShowCorrect: function() {
            this.$(".component-widget")
                .addClass("submitted show-correct-answer")
                .removeClass("show-user-answer");
        },

        // Used by the question to display the correct answer to the user
        showCorrectAnswer: function() {},

        onHideCorrectAnswerClicked: function() {
            this.setQuestionAsHideCorrect();

            this._runModelCompatibleFunction("updateButtons");

            this.hideCorrectAnswer();
        },


        setQuestionAsHideCorrect: function() {
            this.$(".component-widget")
                .addClass("submitted show-user-answer")
                .removeClass("show-correct-answer");
        },

        // Used by the question to display the users answer and
        // hide the correct answer
        // Should use the values stored in storeUserAnswer
        hideCorrectAnswer: function() {},

        // Time elapsed between the time the interaction was made available to the learner for response and the time of the first response
        getLatency:function() {
            return null;
        },

        // a string detailing how the user answered the question
        getResponse:function() {},

        // a string describing the type of interaction: "choice" and "matching" supported (see scorm wrapper)
        getResponseType:function() {},

        // This function is overridden if useQuestionModeOnly: false. see below.
        _runModelCompatibleFunction: function(name, lookForViewOnlyFunction) {
            return this.model[name](); //questionModel Only
        }

    }, {
        _isQuestionType: true
    });


    //allows us to turn on and off the questionView style and use the separated questionModel+questionView style only
    if (useQuestionModelOnly) return QuestionView;

    /*BACKWARDS COMPATIBILITY SECTION
    * This section below is only for compatibility between the separated questionView+questionModel and the old questionView
    * Remove this section in when all components use questionModel and there is no need to have model behaviour in the questionView
    */

    var viewOnlyCompatibleQuestionView = {

        /* All of these functions have been moved to the questionModel.js file. 
         * On the rare occasion that they have not been overridden by the component and 
                that they call the view only questionView version, 
                these functions are included as redirects to the new Question Model.
                It is very unlikely that these are needed but they are included to ensure compatibility.
         * If you need to override these in your component you should now make and register a component model.
         * Please remove them from your question component's view.
        */

            // Calls default methods to setup on questions
            setupDefaultSettings: function() {
                return this.model.setupDefaultSettings();
            },

            // Used to setup either global or local button text
            setupButtonSettings: function() {
                return this.model.setupButtonSettings();
            },

            // Used to setup either global or local question weight/score
            setupWeightSettings: function() {
                return this.model.setupWeightSettings();
            },

            // Use to check if the user is allowed to submit the question
            // Maybe the user has to select an item?
            canSubmit: function() {
                return this.model.canSubmit();
            },

            // Used to update the amount of attempts the user has left
            updateAttempts: function() {
                return this.model.updateAttempts();
            },

            // This is important for returning or showing the users answer
            // This should preserve the state of the users answers
            storeUserAnswer: function() {
                return this.model.storeUserAnswer();
            },

            // Used by the question view to reset the stored user answer
            resetUserAnswer: function() {
                return this.model.resetUserAnswer();
            },

            // Sets _isCorrect:true/false based upon isCorrect method below
            markQuestion: function() {

                if (this._isInViewOnlyCompatibleMode("isCorrect")) {

                    if (this.isCorrect()) {
                        this.model.set('_isCorrect', true);
                    } else {
                        this.model.set('_isCorrect', false);
                    }

                } else {
                    return this.model.markQuestion();
                }
            },

            // Should return a boolean based upon whether to question is correct or not
            isCorrect: function() {
                return this.model.isCorrect();
            },

            // Used to set the score based upon the _questionWeight
            setScore: function() {
                return this.model.setScore();
            },

            // Updates buttons based upon question state by setting
            // _buttonState on the model which buttonsView listens to
            updateButtons: function() {
                return this.model.updateButtons();
            },

            // Used to setup the correct, incorrect and partly correct feedback
            setupFeedback: function() {

                if (this._isInViewOnlyCompatibleMode("isPartlyCorrect")) {

                    // Use view based feedback where necessary
                    if (this.model.get('_isCorrect')) {
                        this._runModelCompatibleFunction("setupCorrectFeedback");
                    } else if (this.isPartlyCorrect()) {
                        this._runModelCompatibleFunction("setupPartlyCorrectFeedback");
                    } else {
                        this._runModelCompatibleFunction("setupIncorrectFeedback");
                    }

                } else {
                    // Use model based feedback
                    this.model.setupFeedback();
                }

            },

            // Used by the question to determine if the question is incorrect or partly correct
            // Should return a boolean
            isPartlyCorrect: function() {
                return this.model.isPartlyCorrect();
            },

            setupCorrectFeedback: function() {
                return this.model.setupCorrectFeedback();
            },

            setupPartlyCorrectFeedback: function() {
                return this.model.setupPartlyCorrectFeedback();
            },

            setupIncorrectFeedback: function() {
                return this.model.setupIncorrectFeedback();
            },


        //Helper functions for compatibility layer
        _runModelCompatibleFunction: function(name, lookForViewOnlyFunction) {
            if (this._isInViewOnlyCompatibleMode(name, lookForViewOnlyFunction)) {
                return this[name](); //questionView
            } else {
                return this.model[name](); //questionModel
            }
        },

        _isInViewOnlyCompatibleMode: function(name, lookForViewOnlyFunction) {
            //return false uses the model function questionModel
            //return true uses the view only function questionView

            var checkForFunction = (lookForViewOnlyFunction || name);

            //if the function does NOT exist on the view at all, use the model only
            if (!this.constructor.prototype[checkForFunction]) return false; //questionModel

            //if the function DOES exist on the view and MATCHES the compatibility function above, use the model only
            if (this.constructor.prototype[checkForFunction] === viewOnlyCompatibleQuestionView[checkForFunction])  {
                switch (checkForFunction) {
                case "setupFeedback":
                case "markQuestion": 
                    return true; //questionView   
                }
                return false; //questionModel
            }

            //if the function DOES exist on the view and does NOT match the compatibility function above, use the view function
            return true; //questionView
        }

    };
    
    //return question view class extended with the compatibility layer
    return QuestionView.extend(viewOnlyCompatibleQuestionView, {
        _isQuestionType: true
    });

    /*END OF BACKWARDS COMPATIBILITY SECTION*/

});

require([
    'core/js/adapt',
    'core/js/adaptCollection',
    'core/js/startController',
    'core/js/models/articleModel',
    'core/js/models/blockModel',
    'core/js/models/configModel',
    'core/js/models/contentObjectModel',
    'core/js/models/componentModel',
    'core/js/models/courseModel',
    'core/js/models/questionModel',
    'core/js/views/navigationView',
    'core/js/accessibility',
    'core/js/offlineStorage',
    'core/js/device',
    'core/js/drawer',
    'core/js/notify',
    'core/js/popupManager',
    'core/js/router',
    'core/js/models/lockingModel',
    'plugins'
], function (Adapt, AdaptCollection, StartController, ArticleModel, BlockModel, ConfigModel, ContentObjectModel, ComponentModel, CourseModel, QuestionModel, NavigationView) {

    // Append loading template and show
    window.Handlebars = _.extend(require("handlebars"), window.Handlebars);

    var template = Handlebars.templates['loading'];
    $('#wrapper').append(template());
    
    Adapt.config = new ConfigModel(null, {url: "course/config.json", reset:true});
    Adapt.config.on({
        'change:_activeLanguage': onLanguageChange,
        'change:_defaultDirection': onDirectionChange
    });

    // This function is called anytime a course object is loaded
    // Once all course files are loaded trigger events and call Adapt.initialize
    Adapt.checkDataIsLoaded = function(isLanguageChange) {
        var language = Adapt.config.get('_activeLanguage');

        if (Adapt.contentObjects.models.length > 0
            && Adapt.articles.models.length > 0
            && Adapt.blocks.models.length > 0
            && Adapt.components.models.length > 0
            && Adapt.course.get('_id')) {

            mapAdaptIdsToObjects();

            if (isLanguageChange) {
                Adapt.trigger('app:languageChanged', language);

                _.defer(function() {
                    var startController = new StartController();
                    var hash = '#/';

                    if (startController.isEnabled()) {
                        hash = startController.getStartHash(true);
                    }
                    
                    Backbone.history.navigate(hash, { trigger: true, replace: true });
                });
            }

            if (typeof Adapt.course.get('_buttons').submit !== 'undefined') {
                // Backwards compatibility with v1.x
                var oldButtons = Adapt.course.get('_buttons');
                var buttons = [];

                for (var key in oldButtons) {
                    buttons['_' + key] = {
                        buttonText: oldButtons[key],
                        ariaLabel: oldButtons[key]
                    };
                }

                // HACK - Append other missing values
                buttons['_showFeedback'] = {
                    buttonText: 'Show feedback',
                    ariaLabel: 'Show feedback'
                };

                // Replace the existing property
                Adapt.course.set('_buttons', buttons);
            }
            
            try {
                Adapt.trigger('app:dataLoaded');// Triggered to setup model connections in AdaptModel.js
            } catch(e) {
                outputError(e);
            }
            
            Adapt.setupMapping();
            
            try {
                Adapt.trigger('app:dataReady');
            } catch(e) {
                outputError(e);
            }

            Adapt.navigation = new NavigationView();// This should be triggered after 'app:dataReady' as plugins might want to manipulate the navigation
            
            Adapt.initialize();
            
            Adapt.off('adaptCollection:dataLoaded courseModel:dataLoaded');
        }
    };
    
    function outputError(e) {
        //Allow plugin loading errors to output without stopping Adapt from loading
        console.error(e);
    }

    function mapAdaptIdsToObjects () {
        Adapt.contentObjects._byAdaptID = Adapt.contentObjects.groupBy("_id");
        Adapt.articles._byAdaptID = Adapt.articles.groupBy("_id");
        Adapt.blocks._byAdaptID = Adapt.blocks.groupBy("_id");
        Adapt.components._byAdaptID = Adapt.components.groupBy("_id");
    }

    // This function is called when the config model triggers 'configModel:loadCourseData'
    // Once the config model is loaded get the course files
    // This enables plugins to tap in before the course files are loaded & also to change the default language
    Adapt.loadCourseData = function(isLanguageChange) {
        Adapt.on('adaptCollection:dataLoaded courseModel:dataLoaded', function() {
            Adapt.checkDataIsLoaded(isLanguageChange);
        });

        // All code that needs to run before adapt starts should go here
        var language = Adapt.config.get('_activeLanguage');

        var courseFolder = "course/" + language +"/";

        $('html').attr("lang", language);

        Adapt.course = new CourseModel(null, {url:courseFolder + "course.json", reset:true});

        Adapt.contentObjects = new AdaptCollection(null, {
            model: ContentObjectModel,
            url: courseFolder +"contentObjects.json"
        });

        Adapt.articles = new AdaptCollection(null, {
            model: ArticleModel,
            url: courseFolder + "articles.json"
        });

        Adapt.blocks = new AdaptCollection(null, {
            model: BlockModel,
            url: courseFolder + "blocks.json"
        });

        Adapt.components = new AdaptCollection(null, {
            model: function(json) {

                //use view+model object
                var ViewModelObject = Adapt.componentStore[json._component];

                if(!ViewModelObject) {
                    throw new Error(json._component + ' component not found. Is it installed and included?');
                }

                //if model defined for component use component model
                if (ViewModelObject.model) {
                    return new ViewModelObject.model(json);
                }

                var View = ViewModelObject.view || ViewModelObject;
                //if question type use question model
                if (View._isQuestionType) {
                    return new QuestionModel(json);
                }

                //otherwise use component model
                return new ComponentModel(json);
            },
            url: courseFolder + "components.json"
        });
    };

    function onLanguageChange(model, language) {
        Adapt.offlineStorage.set('lang', language);
        Adapt.loadCourseData(true);
    }

    function onDirectionChange(model, direction) {
        if (direction === 'rtl') {
            $('html').removeClass('dir-ltr').addClass('dir-rtl');
        } else {
            $('html').removeClass('dir-rtl').addClass('dir-ltr');
        }
    }

    /**
    * Before we actually go to load the course data, we first need to check to see if a language has been set
    * If it has we can go ahead and start loading; if it hasn't, apply the defaultLanguage from config.json
    */
    function onLoadCourseData() {
        if (Adapt.config.get('_activeLanguage')) {
            Adapt.loadCourseData();
        } else {
            Adapt.config.set('_activeLanguage', Adapt.config.get('_defaultLanguage'));
        }
    }

    // Events that are triggered by the main Adapt content collections and models
    Adapt.once('configModel:loadCourseData', onLoadCourseData);

});

define("core/js/app", ["core/js/accessibility","core/js/adapt","core/js/adaptCollection","core/js/device","core/js/drawer","core/js/helpers","core/js/notify","core/js/offlineStorage","core/js/popupManager","core/js/router","core/js/startController","core/js/models/adaptModel","core/js/models/articleModel","core/js/models/blockModel","core/js/models/componentModel","core/js/models/configModel","core/js/models/contentObjectModel","core/js/models/courseModel","core/js/models/lockingModel","core/js/models/notifyModel","core/js/models/questionModel","core/js/models/routerModel","core/js/views/accessibilityView","core/js/views/adaptView","core/js/views/articleView","core/js/views/blockView","core/js/views/buttonsView","core/js/views/componentView","core/js/views/drawerView","core/js/views/menuView","core/js/views/navigationView","core/js/views/notifyPushView","core/js/views/notifyView","core/js/views/pageView","core/js/views/questionView"], function(){});


//# sourceMappingURL=core.js.map