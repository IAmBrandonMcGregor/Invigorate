
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

    // setup the theater.
    this.theater = config.theater;

    // setup the setpieces placeholder.
    this.setPieces = config.setPieces;

    this.numberOfFrames = (config.numberOfFrames || 100);

    this.reinvigorate();

    return this;
  };

  // Prototype-Level Functions.
  // --------------------------
  Invigorate.prototype.reinvigorate = function reinvigorate () {
  	var self = this,
		    workers = [];

    for (var i=0, l=this.setPieces.length; i<l; i++) {

  		workers[i] = Threadit(CreateFrames, {
        numberOfFrames: this.numberOfFrames,
        keyframes: this.setPieces[i].keyframes
  		});

      workers[i].then(function (frames) {
      	self.setPieces[i].frames = frames;
      });
    }

    this.promise = Promise.all(workers).then(function () {
    	return self;
    });

    return this;
  };

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

    return frames;

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
  	var frames = options.frames;
  	console.log('RawFramesToHtmlStyles');
  	return frames;
  }

  return Invigorate;
});
