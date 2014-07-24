
(function AttachInvigorate (root, factory) {

	// Setup Invigorate appropriately for the environment.

	// Start with AMD.
	if (typeof define === 'function' && define.amd) {
		define(['threadit'], factory);
	}
	// Next for Node.js or CommonJS.
	else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('threadit'));
	}
	// finally, as a browser global.
	else {
		root.Invigorate = factory(root.Threadit);
	}

})(this, function InvigorateFactory(Threadit) {

	// Invigorate Constructor.
  // -----------------------
	Invigorate = function Invigorate (config) {

    // cache a reference to the current scope.
    var self = this;

    // Apply all configuration parameters to this object.
    for (var param in config) {
      this[param] = config[param];
    }

    // Ensure default configurations are provided where necessary.
    if (!this.numberOfFrames) this.numberOfFrames = 100;
    if (this.autoUpdateCurrentFrame === undefined) this.autoUpdateCurrentFrame = true;
    if (this.autoUpdateSetpieces === undefined) this.autoUpdateSetpieces = true;

    // Initialize the currentFrame value.
    this.currentFrame = 0;

    // Calculate the frame values.
    this.reinvigorate();

    // Attach scroll listeners if a 'theater' element was provided.
    if (this.theater && this.autoUpdateCurrentFrame) {
      // debounce the scroll event using the rAF api.
      var debouncing = false;
      this.theater.addEventListener('scroll', function ScrollDebouncer() {
        if (!debouncing) {
          debouncing = true;
          window.requestAnimationFrame(function ProcessScroll() {
            self.updateCurrentFrame.bind(self)();
            if (self.autoUpdateSetpieces)
              self.stylizeElements.bind(self)();
            debouncing = false;
          });
        }
      });
    }

    // return the newly created Invigorate object.
    return this;
  };


  // Prototype-Level Functions.
  // ---------------------------------------------------------------------------

  // Function to pre-render & cache styles for each frame.
  Invigorate.prototype.reinvigorate = function reinvigorate () {
  	var self = this,
		    workers = [];

    // Generate Frames on each set-piece.
    for (var i=0, l=self.setPieces.length; i<l; i++) {
      workers[i] = new Promise(function (resolve, reject) {

        // Calculate all frame values (fill in between keyframes).
        Threadit(CreateFrames, {
          numberOfFrames: self.numberOfFrames,
          keyframes: self.setPieces[i].keyframes,
          setPieceIdx: i
        })

        // Turn frame values into css styles.
        .then(function (framesObj) {
          return Threadit(RawFramesToHtmlStyles, {
            frames: framesObj.frames,
            setPieceIdx: framesObj.setPieceIdx
          });
        })

        // Attach the css-style frames to the setpieces.
        .then(function (framesObj) {
          // set the DOM scope frames using the values calculated via Threadit.
          self.setPieces[framesObj.setPieceIdx].frames = framesObj.frames;

          // this function is finished, so resolve the promise.
          resolve(framesObj.frames);
        });

      });
    }

    // Resolve this promise when all of the frames have been created.
    this.promise = Promise.all(workers).then(function () {
      // set the initial styles.
      self.stylizeElements();
      // return the setPieces as the promise handler parameter.
    	return self.setPieces;
    });

    return this;
  };

  // Method to calculate the current frame based on scroll position.
  Invigorate.prototype.updateCurrentFrame = function updateCurrentFrame() {

    //TODO: Debounce this using rAF.

    // Calculate and attach the 'currentFrame' variable.
    this.currentFrame =
      Math.floor(
        ( //percentage scrolled
          this.theater.scrollLeft /
          ( // maximum scroll value.
            this.theater.scrollWidth - this.theater.clientWidth
          )
        )
        *
        this.numberOfFrames
      );

    // Dispatch an event.
    this.theater.dispatchEvent(new CustomEvent('frameChanged', {
      'currentFrame': this.currentFrame
    }));

    // Alert developers of the frame via the console.
    this.log('current frame: ' + this.currentFrame);
  };

  // Method to style any elements associated with a set-piece.
  Invigorate.prototype.stylizeElements = function stylizeElements() {
    for (var setPiece, i=0,l=this.setPieces.length; i<l; i++) {
      setPiece = this.setPieces[i];
      if (setPiece.element) {
        for (var style in setPiece.frames[this.currentFrame]) {
          setPiece.element.style[style] = setPiece.frames[this.currentFrame][style];
        }
      }
    }
  };

  // Method to log info only if in dev-mode.
  Invigorate.prototype.log = function (message) {
    if (this.devMode)
      console.log('InvigorateJS - ' + message);
  };


  // Private Functions (will be worker-itized via Threadit.js).
  // ---------------------------------------------------------------------------
  function CreateFrames (options) {

    // reference the keyframes, create frames, and find animated properties.
    var keyframes = options.keyframes,
        frames = [],
        properties = GetProperties(options.keyframes)

    // create an base array of frames.
    for (var i=0,l=options.numberOfFrames+1; i<l; i++)
      frames[i] = {};

    // calculate and populate each frame.
    for (var frame, i=0, l=frames.length; i<l; i++) {
      frame = frames[i];

      // attach properties on this keyframe.
      for (var property, pi=0, pl=properties.length; pi<pl; pi++) {
        property = properties[pi];

        // TODO: Handle keyframe values set as strings with 'px' or '%'.

        // if property is set on this keyframe...
        if (keyframes[i] && typeof keyframes[i][property.name] !== 'undefined') {

          // set the property to the defined value.
          frame[property.name] = keyframes[i][property.name];

          // transition the frames since the last change.
          if (i !== 0) {
            TransitionFrames(
              frames.slice(property.lastKeyframeIdx, i+1),
              property.name
            );
          }

          // replace the 'lastKeyframeIdx' tracker.
          property.lastKeyframeIdx = i;
        }
        // ...otherwise carry-over the value from the last frame.
        else {
          frame[property.name] = frames[i-1][property.name];
        }
      }
    }

    return {
      frames: frames,
      setPieceIdx: options.setPieceIdx
    };

    // Private Function Definitions.
    // -----------------------------

    // Gets a list of all properties that are animated on this set piece.
    function GetProperties (keyframes) {
      var properties = [];

      // create an array of property names.
      for (var keyframe in keyframes) {
        keyframe = keyframes[keyframe];
        for (var property in keyframe) {
          if (properties.indexOf(property) === -1)
            properties[properties.length] = property;
        }
      }

      // transform property strings into property objects.
      for (var i=0,l=properties.length; i<l; i++) {
        properties[i] = { name: properties[i] }
      }

      return properties;
    }

    // Gets the incrementer value for smoothing between keyframe values.
    function TransitionFrames (framesToTransition, propertyName, transitionType) {

      // determine start and end values.
      var endValue = framesToTransition[framesToTransition.length-1][propertyName],
          startValue = framesToTransition[0][propertyName];

      // don't bother looping if the values don't need transitioning.
      if (endValue === startValue) return framesToTransition;

      // linear transition (default).
      if (!transitionType || transitionType === 'linear') {
        var increment = ((endValue - startValue) / framesToTransition.length);

        for (var i=1,l=framesToTransition.length-1; i<l; i++) {
          framesToTransition[i][propertyName] += (increment * i);
        }
      }

      return framesToTransition;
    }
  }

  function RawFramesToHtmlStyles (options) {

    for (var frame, i=0, l=options.frames.length; i<l; i++) {
      frame = options.frames[i];

      for (var style in frame)
        frame[style] = GetCSSFriendlyValue(style, frame[style]);
    }

    // PRIVATE FUNCTION(S).
    // --------------------
    function GetCSSFriendlyValue (property, value) {

      switch (property) {
        case 'height':
        case 'width':
          value = Math.floor(value) + 'px';
          break;
        default:
          break;
      }

      return value;
    }

  	return options;
  }

  return Invigorate;
});















// This space is intentionally left blank.









