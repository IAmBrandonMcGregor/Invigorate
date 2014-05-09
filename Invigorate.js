
(function AttachInvigorate (root, factory) {

	// Setup Invigorate appropriately for the environment.

	// Start with AMD.
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'threadit'], function (exports, threadit) {
			root.Invigorate = factory(root, exports, threadit);
		});
	}
	// Next for Node.js or CommonJS.
	else if (typeof exports !== 'undefined') {
		factory(root, exports, require('threadit'));
	}
	// finally, as a browser global.
	else {
		root.Invigorate = factory(root, {}, Threadit);
	}

})(this, function InvigorateFactory(root, Invigorate, Threadit) {

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

    // Calculate the frame values.
    this.reinvigorate();

    // Attach scroll listeners if a 'theater' element was provided.
    if (this.theater)
      this.theater.addEventListener('scroll', this.scrollHandler);

    return this;
  };

  // Prototype-Level Functions.
  // --------------------------
  Invigorate.prototype.reinvigorate = function reinvigorate () {
  	var self = this,
		    workers = [];

    (function GenerateFrames () {
      for (var i=0, l=self.setPieces.length; i<l; i++) {
        workers[i] = new Promise(function (resolve, reject) {

          // Calculate all frame values (fill in between keyframes).
          Threadit(CreateFrames, {
            numberOfFrames: self.numberOfFrames,
            keyframes: self.setPieces[i].keyframes,
            setPieceIdx: i
          })

          // // Turn frame values into css styles.
          // .then(function (framesObj) {

          //   // Calculate CSS styles if an element is provided for the set-piece...
          //   // ...in this case, we assume animating will be handled by Invigorate.
          //   if (self.setPieces[framesObj.setPieceIdx].element) {
          //     return Threadit(RawFramesToHtmlStyles, {
          //       frames: framesObj.frames,
          //       setPieceIdx: framesObj.setPieceIdx
          //     });
          //   }
          //   else
          //     return framesObj;
          // })

          // Attach the css-style frames to the setpieces.
          .then(function (framesObj) {
            self.setPieces[framesObj.setPieceIdx].frames = framesObj.frames;
            resolve(framesObj.frames);
          });

        });
      }
    })();

    (function CacheScrollInfo () {
      if (self.theater)
        self.theater.maxScroll =
          self.theater.scrollWidth - self.theater.clientWidth;
    })();

    // Resolve this promise when all of the frames have been created.
    this.promise = Promise.all(workers).then(function () {
    	return self.setPieces;
    });

    return this;
  };
  Invigorate.prototype.scrollHandler = function scrollHandler(event) {

    //TODO: Debounce this using rAF.

    //TODO: Calculate and attach the 'currentFrame' variable.

    console.log(event);
    event.preventDefault();
    return false;
  }

  // Private Functions.
  // ------------------
  function CreateFrames (options) {

    // reference the keyframes
    var keyframes = options.keyframes;

    // create an base array of frames.
    var frames = [];
    for (var i=0,l=options.numberOfFrames+1; i<l; i++)
      frames[i] = {};

    // Get an array of properties that will be modified.
    var properties = GetProperties(options.keyframes);

    // calculate and populate each frame.
    var frame, property;
    for (var i=0, l=frames.length; i<l; i++) {
      frame = frames[i];

      // attach properties on this keyframe.
      for (var pi=0, pl=properties.length; pi<pl; pi++) {
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

    // setup some recycled variables.
    var frame, propertyValue, style;

    // loop through all the frames.
    for (var i=0, l=options.frames.length; i<l; i++) {
      frame = options.frames[i];

      // reset the style string before we populate it.
      style = '';

      // loop through all the properties in this frame.
      for (var property in frame) {

        // convert the properties to be CSS formats.
        frame[property] = GetCSSFriendlyProperty(property, frame[property]);

        // append this property to the style attribute of this frame.
        style += (property + ': ' + frame[property] + '; ');
      }

      // attach the style string to the frame.
      frame.style = style.slice(0,-1);
    }

    // PRIVATE FUNCTION(S).
    // --------------------
    function GetCSSFriendlyProperty (property, value) {

      switch (property) {
        case 'height':
        case 'width':
          value = value + 'px';
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









